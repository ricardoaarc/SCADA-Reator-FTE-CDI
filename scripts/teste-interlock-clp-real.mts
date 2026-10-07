// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-interlock-clp-real.mts   (usa modbus-serial como CLP falso)
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const express=(await import('express')).default;
const ModbusRTU=(await import('modbus-serial')).default;
const net=await import('node:net');
const { lerConfigPlc, criarRotasPlc, ModbusGateway } = await import('../server/plcGateway.ts');
const { plcService } = await import('../src/services/PlcService.ts');
const { dbInstance } = await import('../src/services/database.ts');
const { FteCdiControllerV2, IndustrialRelayDriver } = await import('../src/services/fte_cdi_controller_v2.ts');
const { RelayDriverHibrido, FontePressaoPlc } = await import('../src/services/plcSafetyAdapters.ts');
const { authService } = await import('../src/services/AuthService.ts');
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const alarmes=()=>dbInstance.alarmesList.map((a:any)=>a.mensagem);
const tem=(re:RegExp,desde=0)=>alarmes().slice(0,alarmes().length-desde).some(m=>re.test(m));
const origErr=console.error, origWarn=console.warn, origLog=console.log, origInfo=console.info;
console.error=()=>{};console.warn=()=>{};console.info=()=>{};
const livre=()=>new Promise<number>(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=(s.address() as any).port;s.close(()=>res(p));});});

// ---- CLP falso ----
const holding:number[]=Array(20).fill(0); holding[0]=185;
const coils:Record<number,boolean>={0:true,1:true,2:false,3:false};
let escritas=0;
const vetor={ getHoldingRegister:(a:number)=>holding[a]??0, getMultipleHoldingRegisters:(a:number,l:number)=>holding.slice(a,a+l), getCoil:(a:number)=>!!coils[a], setCoil:(a:number,v:boolean)=>{coils[a]=v;escritas++}, setRegister:(a:number,v:number)=>{holding[a]=v} };
const portaPlc=await livre(); let plc:any=null;
const ligarPlc=()=>new Promise<void>(res=>{ plc=new ModbusRTU.ServerTCP(vetor,{host:'127.0.0.1',port:portaPlc,debug:false,unitID:1}); plc.on('initialized',()=>res()); });
const desligarPlc=()=>new Promise<void>(res=>{ plc.socks?.forEach((_:any,s:any)=>s.destroy()); plc.close(()=>res()); });
await ligarPlc();
const base={PLC_GATEWAY_ENABLED:'true',PLC_HOST:'127.0.0.1',PLC_PORT:String(portaPlc),PLC_UNIT_ID:'1',PLC_TIMEOUT_MS:'400',PLC_GATEWAY_TOKEN:'segredo'};
const subir=(env:any)=>new Promise<{url:string,close:()=>Promise<void>}>(res=>{
  const cfg=lerConfigPlc(env); const gw=new ModbusGateway(cfg); const app=express(); app.use('/api/plc',criarRotasPlc(cfg,gw));
  const srv=app.listen(0,'127.0.0.1',()=>res({url:`http://127.0.0.1:${(srv.address() as any).port}`,close:()=>new Promise<void>(r=>{gw.fechar();srv.close(()=>r())})}));
});
let GW=await subir({...base,PLC_GATEWAY_ALLOW_WRITE:'true'});
plcService.parar(); plcService.definirTimeoutMs(1500); plcService.definirUrlGateway(GW.url); plcService.definirTokenGateway('segredo');
(FteCdiControllerV2 as any).REENVIO_CORTE_MS=100;
const novo=()=>new FteCdiControllerV2(new RelayDriverHibrido(new IndustrialRelayDriver()),new FontePressaoPlc());
const supervisor:any={id:1,nome:'Sup',matricula:'SUP-202',nivel_acesso:'SUPERVISOR'};
const scan=async(c:any,ms=350)=>{ c.executarCicloScanCLP(); await sleep(ms); };
const ativas=(c:any)=>c.celulas.filter((x:any)=>x.ativa);
const travadas=(c:any)=>ativas(c).filter((x:any)=>x.interlockDisparado).length;
const reset=async()=>{ coils[0]=true; coils[1]=true; coils[2]=false; coils[3]=false; holding[0]=185; plcService.definirParametrosLeituraPressao({idadeMaxMs:10_000,gracaMs:10_000}); await plcService.verificarConexao(); };

// ===== A. simulador: comportamento antigo preservado =====
let c=novo();
c.celulas[0].pressaoBar=2.9; const escA=escritas; await scan(c);
t('SIMULADOR: fonte "SIMULADA" e sobrepressão simulada intertrava como antes', c.celulas[0].fontePressao==='SIMULADA' && c.celulas[0].interlockDisparado && tem(/SCD-SAF-001/));
t('SIMULADOR: o CLP não é tocado (nenhuma escrita)', escritas===escA);

// ===== B. CLP_REAL: graça, depois pressão real =====
plcService.definirParametrosLeituraPressao({idadeMaxMs:1500,gracaMs:400});
c=novo(); await authService.autenticarOperador('ENG-882','8820'); plcService.setModoFonteDados('CLP_REAL'); c.executarCicloScanCLP(); await sleep(30);
t('CLP_REAL: durante a graça (sem leitura ainda) nada intertrava', travadas(c)===0 && c.celulas[0].fontePressao==='CLP_REAL');
await sleep(150); await plcService.verificarConexao(); await scan(c,100);
t('CLP_REAL: pressão das células passa a ser a do CLP (1.85 bar), não a simulada', ativas(c).every((x:any)=>x.pressaoBar===1.85) && travadas(c)===0);

// ===== C. valor simulado é ignorado =====
c.celulas[0].pressaoBar=3.5; c.celulas[1].pressaoBar=0.1; await scan(c,100);
t('CLP_REAL: pressão "simulada" (3.5 e 0.1) é sobrescrita pela real e não dispara nada', c.celulas[0].pressaoBar===1.85 && c.celulas[1].pressaoBar===1.85 && travadas(c)===0);

// ===== D. sobrepressão REAL corta o CLP =====
await reset(); c=novo(); plcService.definirParametrosLeituraPressao({idadeMaxMs:10_000,gracaMs:10_000});
holding[0]=290; await plcService.verificarConexao(); const escD=escritas; await scan(c,500);
t('SOBREPRESSÃO REAL (2.90 bar no CLP): TODAS as células intertravam em software', travadas(c)===ativas(c).length && ativas(c).every((x:any)=>/SOBREPRESSÃO/.test(x.motivoInterlock||'')));
t('o corte foi ESCRITO no CLP: coil 1 (bomba) e coil 2 (fonte DC) = false', coils[0]===false && coils[1]===false);
t('16 células compartilharam as escritas (poucas escritas, não 32)', escritas-escD<=6);
t('estado do relé confirmado ABERTO e sem alarme de corte não confirmado', (await c.relayDriver.obterEstadoRele(1,'FONTE_DC'))==='ABERTO' && !tem(/SCD-SAF-002\] FALHA/));

// ===== E/F/G. rearme =====
let r=await c.rearmarCelulaManualmente(c.celulas[0].id,supervisor,'despressurizado e inspecionado');
t('rearme recusado com a pressão REAL alta (2.90)', !r.sucesso && /BLOQUEIO FÍSICO/.test(r.mensagem) && c.celulas[0].interlockDisparado);
holding[0]=190; coils[2]=true; await plcService.verificarConexao();
r=await c.rearmarCelulaManualmente(c.celulas[0].id,supervisor,'despressurizado e inspecionado');
t('rearme recusado com E-STOP ativo no CLP: célula continua intertravada e CLP desenergizado', !r.sucesso && /FALHA NO REARME FÍSICO/.test(r.mensagem) && c.celulas[0].interlockDisparado && coils[0]===false && coils[1]===false);
coils[2]=false; await plcService.verificarConexao();
r=await c.rearmarCelulaManualmente(c.celulas[0].id,supervisor,'despressurizado e inspecionado');
t('rearme com pressão normal e E-STOP liberado: liga fonte e bomba NO CLP', r.sucesso && !c.celulas[0].interlockDisparado && coils[0]===true && coils[1]===true);
t('só a célula rearmada fica livre (rack tem 1 fonte): demais continuam intertravadas', travadas(c)===ativas(c).length-1);
holding[0]=295; await plcService.verificarConexao(); await scan(c,500);
t('nova sobrepressão: a célula rearmada intertrava e o CLP é cortado de novo', c.celulas[0].interlockDisparado && coils[0]===false && coils[1]===false);

// ===== H. valores de falha do transmissor =====
await reset(); c=novo(); holding[0]=65535; await plcService.verificarConexao(); await scan(c,400);
t('bruto 65535 (falha do transmissor) -> SCD-SEN-002 e todas intertravam, CLP cortado', travadas(c)===ativas(c).length && tem(/SCD-SEN-002/) && coils[0]===false);
await reset(); c=novo(); holding[0]=65526; await plcService.verificarConexao(); await scan(c,100);
t('bruto 65526 (= -0.10 bar, int16) é leitura válida: nenhum intertravamento', travadas(c)===0 && ativas(c)[0].pressaoBar===-0.1);
await reset(); c=novo(); holding[0]=1500; await plcService.verificarConexao(); await scan(c,400);
t('1500 (15 bar, fora da faixa do transmissor) -> SCD-SEN-001, estado seguro', travadas(c)===ativas(c).length && tem(/SCD-SEN-001/));

// ===== I. perda de comunicação =====
await reset(); c=novo(); plcService.definirParametrosLeituraPressao({idadeMaxMs:500,gracaMs:10_000});
await plcService.verificarConexao(); await scan(c,50);
await desligarPlc(); await plcService.verificarConexao(); await scan(c,50);
t('falha isolada de varredura é tolerada (dado ainda recente): sem intertravamento', travadas(c)===0);
await sleep(600); await plcService.verificarConexao(); const antesAl=alarmes().length; await scan(c,500);
t('dados com mais de 500 ms sem atualização -> SCD-SEN-002 e TODAS intertravam (estado seguro)', travadas(c)===ativas(c).length && tem(/SCD-SEN-002[^\n]*sem atualização/));
t('sem enlace o corte não é confirmado: alarme crítico SCD-SAF-002 e célula segue travada em software', tem(/SCD-SAF-002\] FALHA NO CORTE/) && coils[0]===true);
r=await c.rearmarCelulaManualmente(c.celulas[0].id,supervisor,'tentando rearmar sem comunicação');
t('rearme recusado sem leitura confiável da pressão do CLP', !r.sucesso && /sem leitura confiável/.test(r.mensagem));
await ligarPlc(); await plcService.verificarConexao(); await sleep(150); await scan(c,500);
t('CLP volta: reenvio automático do corte é confirmado (coils false) com alarme de confirmação', coils[0]===false && coils[1]===false && tem(/Corte físico confirmado/));

// ===== J. política SOMENTE_ALARME =====
await reset(); c=novo(); c.politicaSemPressaoReal='SOMENTE_ALARME'; plcService.definirParametrosLeituraPressao({idadeMaxMs:300,gracaMs:10_000});
await plcService.verificarConexao(); await desligarPlc(); await sleep(450); await plcService.verificarConexao(); await scan(c,100);
t('SOMENTE_ALARME: sem pressão do CLP só alarma, não intertrava', travadas(c)===0 && tem(/SOMENTE_ALARME/));
await ligarPlc();

// ===== K. gateway sem permissão de escrita =====
await GW.close(); GW=await subir({...base}); plcService.definirUrlGateway(GW.url);
await reset(); c=novo(); holding[0]=290; await plcService.verificarConexao(); const escK=escritas; await scan(c,400);
t('gateway SEM escrita: intertrava em software, alarme SCD-SAF-002 e o CLP não é alterado', travadas(c)===ativas(c).length && tem(/SCD-SAF-002\] FALHA NO CORTE/) && escritas===escK && coils[0]===true);
await GW.close(); GW=await subir({...base,PLC_GATEWAY_ALLOW_WRITE:'true'}); plcService.definirUrlGateway(GW.url);

// ===== L. parada de emergência =====
await reset(); c=novo(); await plcService.verificarConexao(); await scan(c,100);
await c.paradaEmergencia('Operador Teste'); await sleep(200);
t('PARADA DE EMERGÊNCIA em CLP real (pressão normal): intertrava todas e corta o CLP', travadas(c)===ativas(c).length && ativas(c)[0].motivoInterlock!.includes('PARADA DE EMERGÊNCIA') && coils[0]===false && coils[1]===false && tem(/SCD-SAF-003/));

// ===== M. volta ao simulador =====
plcService.setModoFonteDados('SIMULADOR'); await reset(); coils[0]=true; coils[1]=true;
const escM=escritas; c=novo(); c.celulas[2].pressaoBar=2.95; await scan(c,100);
t('de volta ao SIMULADOR: pressão simulada vale de novo, fonte SIMULADA, CLP intocado', c.celulas[2].interlockDisparado && c.celulas[2].fontePressao==='SIMULADA' && escritas===escM && coils[0]===true);

await GW.close(); await desligarPlc();
console.error=origErr; console.warn=origWarn; console.info=origInfo;
origLog(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
