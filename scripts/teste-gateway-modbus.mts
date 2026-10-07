// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-gateway-modbus.mts   (usa modbus-serial como CLP falso)
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const express=(await import('express')).default;
const ModbusRTU=(await import('modbus-serial')).default;
const net=await import('node:net');
const { lerConfigPlc, criarRotasPlc, ModbusGateway, agruparLeituras, enderecoParaModbus, GatewayError } = await import('../server/plcGateway.ts');
const { plcService } = await import('../src/services/PlcService.ts');
const { dbInstance } = await import('../src/services/database.ts');
const { authService } = await import('../src/services/AuthService.ts');
authService.trocarOperador('op-2');
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const alarmes=()=>dbInstance.alarmesList.map((a:any)=>a.mensagem).join('\n');
const origErr=console.error, origWarn=console.warn, origLog=console.log;
const quiet=(on:boolean)=>{ if(on){console.error=()=>{};console.warn=()=>{};} else {console.error=origErr;console.warn=origWarn;} };
const livre=()=>new Promise<number>(res=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=(s.address() as any).port;s.close(()=>res(p));});});

// ---------- CLP falso (servidor Modbus TCP independente da nossa implementação) ----------
const holding:number[]=Array(20).fill(0); [185,980,140,120,720,1250,340,850,110,235].forEach((v,i)=>holding[i]=v);
const coils:Record<number,boolean>={0:true,1:true,2:false,3:false};
const vetor={
  getHoldingRegister:(a:number)=>holding[a]??0,
  getMultipleHoldingRegisters:(a:number,l:number)=>holding.slice(a,a+l),
  getCoil:(a:number)=>!!coils[a],
  setCoil:(a:number,v:boolean)=>{coils[a]=v},
  setRegister:(a:number,v:number)=>{holding[a]=v},
};
const portaPlc=await livre();
let plc:any=null;
const ligarPlc=()=>new Promise<void>(res=>{ plc=new ModbusRTU.ServerTCP(vetor,{host:'127.0.0.1',port:portaPlc,debug:false,unitID:1}); plc.on('initialized',()=>res()); });
const desligarPlc=()=>new Promise<void>(res=>{ plc.socks?.forEach((_:any,s:any)=>s.destroy()); plc.close(()=>res()); });
await ligarPlc();

// ---------- config ----------
const base={PLC_GATEWAY_ENABLED:'true',PLC_HOST:'127.0.0.1',PLC_PORT:String(portaPlc),PLC_UNIT_ID:'1',PLC_TIMEOUT_MS:'400'};
let c=lerConfigPlc({}); t('config padrão: tudo desligado', !c.habilitado && !c.permitirEscrita);
c=lerConfigPlc({PLC_GATEWAY_ENABLED:'true'}); t('habilitado sem PLC_HOST -> desligado com aviso', !c.habilitado && c.avisos.some((a:string)=>/PLC_HOST/.test(a)));
c=lerConfigPlc({...base,PLC_GATEWAY_ALLOW_WRITE:'true'}); t('escrita sem token -> desligada (falha fechada)', c.habilitado && !c.permitirEscrita);
c=lerConfigPlc({...base,PLC_GATEWAY_ALLOW_WRITE:'true',PLC_GATEWAY_TOKEN:'s3',PLC_WRITE_ALLOWLIST:'4, 2,x'}); t('escrita com token + allowlist parseada', c.permitirEscrita && c.listaEscrita.join()==='4,2');
// ---------- endereçamento ----------
t('mapeamento 40001->holding 0, 1->coil 0', JSON.stringify(enderecoParaModbus(40001))==='{"tipo":"HOLDING","offset":0}' && JSON.stringify(enderecoParaModbus(1))==='{"tipo":"COIL","offset":0}');
t('endereço inválido (0, 12345, 1.5, "a") rejeitado', [0,12345,1.5,'a'].every(e=>{try{enderecoParaModbus(e);return false}catch(x){return x instanceof GatewayError && x.codigo==='SCD-PLC-003'}}));
const g=agruparLeituras([40001,40002,40003,40010,1,2,3,4,40001]);
t('agrupa em leituras contíguas', g.length===3 && g.some((x:any)=>x.tipo==='HOLDING'&&x.inicio===40001&&x.fim===40003) && g.some((x:any)=>x.tipo==='COIL'&&x.inicio===1&&x.fim===4));
t('respeita máximo por leitura', agruparLeituras(Array.from({length:10},(_,i)=>40001+i),4).length===3);

// ---------- servidor HTTP ----------
const subir=(env:any)=>new Promise<{url:string,close:()=>Promise<void>,gw:any}>(res=>{
  const cfg=lerConfigPlc(env); const gw=new ModbusGateway(cfg); const app=express(); app.use('/api/plc',criarRotasPlc(cfg,gw));
  const srv=app.listen(0,'127.0.0.1',()=>res({url:`http://127.0.0.1:${(srv.address() as any).port}`,gw,close:()=>new Promise<void>(r=>{gw.fechar();srv.close(()=>r())})}));
});
const post=async(url:string,path:string,body:any={},token?:string)=>{const r=await fetch(url+'/api/plc'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-gateway-token':token}:{})},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};

// desligado
let S=await subir({});
let r:any=await fetch(S.url+'/api/plc/status').then(x=>x.json());
t('/status responde mesmo desligado (habilitado=false)', r.habilitado===false && r.escritaHabilitada===false);
r=await post(S.url,'/test'); t('desligado -> 503 SCD-PLC-005', r.status===503 && r.body.codigo==='SCD-PLC-005');
await S.close();

// ligado, somente leitura
S=await subir(base);
r=await post(S.url,'/test'); t('/test ok com latência', r.status===200 && r.body.sucesso && typeof r.body.latenciaMs==='number');
r=await post(S.url,'/test',{host:'10.255.255.1',port:1}); t('host/porta no corpo são ignorados (anti-SSRF)', r.status===200);
r=await post(S.url,'/read',{enderecos:[40001,40002,40010,1,2,3,4]});
t('/read devolve valores reais do CLP', r.status===200 && r.body.valores['40001']===185 && r.body.valores['40010']===235 && r.body.valores['1']===true && r.body.valores['3']===false);
r=await post(S.url,'/read',{enderecos:[]}); t('/read lista vazia -> 400', r.status===400);
r=await post(S.url,'/read',{enderecos:[40001,99999]}); t('/read com endereço inválido -> 400 SCD-PLC-003', r.status===400 && r.body.codigo==='SCD-PLC-003');
r=await post(S.url,'/write',{endereco:4,valor:true}); t('escrita desabilitada -> 403 SCD-PLC-008', r.status===403 && r.body.codigo==='SCD-PLC-008' && coils[3]===false);
const par=await Promise.all(Array.from({length:12},()=>post(S.url,'/read',{enderecos:[40001,1]})));
t('12 leituras simultâneas serializadas, todas ok', par.every(x=>x.status===200 && x.body.valores['40001']===185));
await S.close();

// com token e escrita
S=await subir({...base,PLC_GATEWAY_TOKEN:'segredo',PLC_GATEWAY_ALLOW_WRITE:'true'});
r=await post(S.url,'/read',{enderecos:[1]}); t('sem token -> 401 SCD-AUT-001', r.status===401 && r.body.codigo==='SCD-AUT-001');
r=await post(S.url,'/read',{enderecos:[1]},'errado'); t('token errado -> 401', r.status===401);
r=await post(S.url,'/read',{enderecos:[1]},'segredo'); t('token certo -> 200', r.status===200);
r=await post(S.url,'/write',{endereco:4,valor:true},'segredo'); t('escrita permitida muda o CLP (coil 4)', r.status===200 && coils[3]===true);
r=await post(S.url,'/write',{endereco:3,valor:true},'segredo'); t('endereço fora da allowlist (E-STOP, coil 3) -> 403', r.status===403 && r.body.codigo==='SCD-PLC-008' && coils[2]===false);
r=await post(S.url,'/write',{endereco:40001,valor:1},'segredo'); t('holding fora da allowlist -> 403 e CLP intacto', r.status===403 && holding[0]===185);
r=await post(S.url,'/write',{endereco:4,valor:1},'segredo'); t('coil com número -> 400 SCD-PLC-006', r.status===400 && r.body.codigo==='SCD-PLC-006');
await S.close();
S=await subir({...base,PLC_GATEWAY_TOKEN:'segredo',PLC_GATEWAY_ALLOW_WRITE:'true',PLC_WRITE_ALLOWLIST:'40005'});
r=await post(S.url,'/write',{endereco:40005,valor:70000},'segredo'); t('holding fora de 0..65535 -> 400', r.status===400 && r.body.codigo==='SCD-PLC-006');
r=await post(S.url,'/write',{endereco:40005,valor:777},'segredo'); t('holding gravado e confirmado por releitura', r.status===200 && holding[4]===777);
holding[4]=720;
await S.close();

// ---------- falhas do CLP: recusa de conexão, CLP mudo, recuperação ----------
S=await subir(base);
await desligarPlc();
r=await post(S.url,'/test'); t('CLP fora do ar -> 502 SCD-PLC-002', r.status===502 && r.body.codigo==='SCD-PLC-002');
const mudo=net.createServer(()=>{/* aceita e nunca responde */}); const portaMudo=await livre(); await new Promise<void>(res=>mudo.listen(portaMudo,'127.0.0.1',()=>res()));
const Smudo=await subir({...base,PLC_PORT:String(portaMudo)});
const t0=Date.now(); r=await post(Smudo.url,'/test'); t('CLP mudo -> 504 SCD-PLC-001 dentro do timeout', r.status===504 && r.body.codigo==='SCD-PLC-001' && Date.now()-t0<2500);
await Smudo.close(); mudo.close();
await ligarPlc();
r=await post(S.url,'/test'); t('CLP volta -> gateway reconecta sozinho', r.status===200);
await S.close();

// ---------- ponta a ponta: PlcService (CLP_REAL) -> HTTP -> gateway -> CLP ----------
coils[0]=true; coils[1]=true; coils[2]=false; coils[3]=false; holding[0]=185;
S=await subir({...base,PLC_GATEWAY_TOKEN:'segredo',PLC_GATEWAY_ALLOW_WRITE:'true'});
plcService.parar(); plcService.definirTimeoutMs(1500); plcService.definirUrlGateway(S.url);
quiet(true);
plcService.definirTokenGateway('errado');
plcService.setModoFonteDados('CLP_REAL');
await sleep(150);
t('token errado -> DESCONECTADO (AUT-001), qualidade RUIM', plcService.getConfig().status==='DESCONECTADO' && plcService.getQualidadeDados()==='RUIM' && /SCD-AUT-001/.test(alarmes()));
plcService.definirTokenGateway('segredo');
let ping=await plcService.testarPingConexao();
quiet(false);
const cfg=()=>plcService.getConfig();
t('token certo -> ping ok, CONECTADO, qualidade BOA', ping.sucesso && cfg().status==='CONECTADO' && plcService.getQualidadeDados()==='BOA');
t('varredura trouxe valores do CLP (pressão 185, bomba true)', cfg().mapaRegistradores[40001].valor===185 && cfg().mapaRegistradores[1].valor===true && /registradores lidos/.test(ping.mensagem));
holding[0]=212; await plcService.verificarConexao();
t('mudança no CLP aparece na varredura seguinte (212)', cfg().mapaRegistradores[40001].valor===212);
plcService.atualizarRegistradoresComTelemetria({pressaoBar:9.99,ph:0},{bombaAlimentacaoAtiva:false});
t('telemetria simulada NÃO sobrescreve dados do CLP real', cfg().mapaRegistradores[40001].valor===212 && cfg().mapaRegistradores[1].valor===true);
let w:any=await plcService.escreverRegistrador(4,true);
t('escrita via gateway muda o CLP e o mapa local', w.ok && coils[3]===true && cfg().mapaRegistradores[4].valor===true);
const errosAntes=cfg().errosComunicacao;
quiet(true); w=await plcService.escreverRegistrador(1,false); quiet(false);
t('desenergizar (false) é permitido', w.ok && coils[0]===false);
coils[2]=true; await plcService.verificarConexao(); // E-STOP/interlock ativo no CLP
w=await plcService.escreverRegistrador(2,true);
t('energizar com E-STOP ativo -> SCD-PLC-007 e CLP intacto', !w.ok && w.codigo==='SCD-PLC-007' && coils[1]===true /*coil 2 já era true no CLP*/ );
w=await plcService.escreverRegistrador(1,true);
t('energizar bomba com E-STOP ativo bloqueado (CLP segue false)', !w.ok && w.codigo==='SCD-PLC-007' && coils[0]===false);
coils[2]=false; await plcService.verificarConexao();
w=await plcService.escreverRegistrador(1,true);
t('E-STOP liberado -> energizar permitido', w.ok && coils[0]===true);
// recusa de comando não é falha de enlace
await S.close(); 
const S2=await subir({...base,PLC_GATEWAY_TOKEN:'segredo'}); plcService.definirUrlGateway(S2.url); await plcService.verificarConexao();
w=await plcService.escreverRegistrador(4,false);
t('escrita recusada pelo gateway -> SCD-PLC-008', !w.ok && w.codigo==='SCD-PLC-008');
t('recusa NÃO altera status nem contadores de falha', cfg().status==='CONECTADO' && cfg().errosComunicacao===errosAntes);
// CLP cai
quiet(true);
await desligarPlc(); await plcService.verificarConexao();
t('CLP cai -> sem enlace (timeout ou conexão perdida), alarme SCD-PLC-001/002, qualidade RUIM', ['DESCONECTADO','ERRO_TIMEOUT'].includes(cfg().status) && /\[SCD-PLC-00[12]\][^\n]*gateway/.test(alarmes()) && plcService.getQualidadeDados()==='RUIM');
w=await plcService.escreverRegistrador(1,true);
t('sem enlace, energizar é bloqueado por segurança (SCD-PLC-007)', !w.ok && w.codigo==='SCD-PLC-007');
await ligarPlc(); ping=await plcService.verificarConexao();
quiet(false);
t('CLP volta -> CONECTADO e alarme de recuperação', ping.sucesso && cfg().status==='CONECTADO' && /restabelecida/.test(alarmes()));
plcService.setModoFonteDados('SIMULADOR');
await S2.close(); await desligarPlc();
origLog(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
