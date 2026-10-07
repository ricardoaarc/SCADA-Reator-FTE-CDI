// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-m4-b2.mts
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const R='../src/services/';
const { razaoSegura, eficienciaSegura, FLUORETO_MIN_PARA_RAZAO_PPM } = await import(R+'calculosSeguros.ts');
const { FteCdiControllerV2 } = await import(R+'fte_cdi_controller_v2.ts');
const { dbInstance } = await import(R+'database.ts');
const { plcService } = await import(R+'PlcService.ts');
const { NotificationService } = await import(R+'NotificationService.ts');
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const origWarn=console.warn,origErr=console.error; console.warn=()=>{};console.error=()=>{};
const alarmes=()=>dbInstance.alarmesList.map((a:any)=>a.mensagem);
const conta=(re:RegExp)=>alarmes().filter(m=>re.test(m)).length;
plcService.parar();

// ===== M4: helpers =====
t('razaoSegura: caso normal', Math.abs(razaoSegura(1.1,8.5)!-0.12941)<1e-4);
t('razaoSegura: entrada 0 / abaixo do mínimo / NaN / negativa / texto -> null', [razaoSegura(1,0),razaoSegura(1,0.05),razaoSegura(1,NaN),razaoSegura(1,-3),razaoSegura('1',2),razaoSegura(NaN,5),razaoSegura(-1,5),razaoSegura(1,Infinity),razaoSegura(undefined,5),razaoSegura(0,0)].every(v=>v===null));
t('razaoSegura: no limite mínimo (0.1 ppm) calcula', razaoSegura(0.05,FLUORETO_MIN_PARA_RAZAO_PPM)===0.5);
t('razaoSegura: saída 0 com entrada válida é 0 (eficiência 100%)', razaoSegura(0,8.5)===0 && eficienciaSegura(8.5,0)===100);
t('eficienciaSegura: normal e inválida', Math.abs(eficienciaSegura(8.5,1.1)!-87.0588)<1e-3 && eficienciaSegura(0,1)===null && eficienciaSegura(NaN,1)===null);

// ===== M4: controlador =====
const cel=(c:any,i=0)=>c.celulas[i];
let c=new FteCdiControllerV2(); let x=cel(c); x.status='ADSORCAO'; x.interlockDisparado=false; x.tempoFaseAtualSegundos=0;
x.fluoretoInPPM=0; x.fluoretoOutPPM=1.2; x.leiturasConsecutivasBreakthrough=1; const razaoAntes=x.razaoBreakthrough;
const n0=conta(/SCD-SEN-003/);
for(let i=0;i<5;i++) c.verificarMaquinaEstadosBreakthrough(x);
t('entrada 0: NÃO conta breakthrough (antes: Infinity >= 0.9 disparava a regeneração)', x.status==='ADSORCAO' && x.leiturasConsecutivasBreakthrough===1);
t('entrada 0: razão fica finita e inalterada (nunca Infinity/NaN)', Number.isFinite(x.razaoBreakthrough) && x.razaoBreakthrough===razaoAntes);
t('entrada 0: alarme SCD-SEN-003 gerado UMA vez (limite de 1/min)', conta(/SCD-SEN-003/)-n0===1);
x.fluoretoInPPM=NaN; c.verificarMaquinaEstadosBreakthrough(x);
t('entrada NaN: não zera o debounce (antes: NaN >= 0.9 era falso e zerava)', x.leiturasConsecutivasBreakthrough===1 && x.status==='ADSORCAO');
x.tempoFaseAtualSegundos=c.parametros.timeoutAdsorcaoMinutos*60; c.verificarMaquinaEstadosBreakthrough(x);
t('com medição inválida o TIMEOUT de adsorção continua protegendo a célula', x.status==='REGENERACAO');
// regressão: breakthrough real
c=new FteCdiControllerV2(); x=cel(c,1); x.status='ADSORCAO'; x.interlockDisparado=false; x.tempoFaseAtualSegundos=0; x.fluoretoInPPM=8.5; x.fluoretoOutPPM=8.0; x.leiturasConsecutivasBreakthrough=0;
for(let i=0;i<c.parametros.debounceLeiturasConsecutivas;i++) c.verificarMaquinaEstadosBreakthrough(x);
t('REGRESSÃO: breakthrough real (8.0/8.5) ainda regenera após o debounce', x.status==='REGENERACAO' && x.razaoBreakthrough>=c.parametros.razaoBreakthroughLimite);
{ const c2=new FteCdiControllerV2(); c2.parametros.razaoBreakthroughLimite=0.8; c2.parametros.debounceLeiturasConsecutivas=2;
  const y=cel(c2,2); y.status='ADSORCAO'; y.interlockDisparado=false; y.tempoFaseAtualSegundos=0; y.fluoretoInPPM=8.5; y.fluoretoOutPPM=7.5; y.leiturasConsecutivasBreakthrough=0;
  c2.verificarMaquinaEstadosBreakthrough(y); c2.verificarMaquinaEstadosBreakthrough(y);
  const textos=JSON.stringify([dbInstance.alarmesList, (dbInstance as any).getEventosCiclo?.() ?? []]);
  t('mensagem de breakthrough usa os parâmetros reais (>= 0.80 em 2 scans), não 0.90/3 fixos', y.status==='REGENERACAO' && /Razão 0\.88 >= 0\.80 em 2 scans/.test(textos)); }
// scan completo com entrada inválida em todas as células: sem NaN/Infinity em lugar nenhum
c=new FteCdiControllerV2(); c.celulas.forEach((k:any)=>{k.status='ADSORCAO';k.fluoretoInPPM=0;});
c.executarCicloScanCLP(); await new Promise(r=>setTimeout(r,30));
const resumo=c.obterResumoGlobal();
t('scan + resumo com entrada 0 em todas as células: tudo finito', c.celulas.every((k:any)=>Number.isFinite(k.razaoBreakthrough)&&Number.isFinite(k.eficienciaPct)) && Number.isFinite(resumo.eficienciaMediaPct) && resumo.eficienciaMediaPct===0);
// scan normal continua calculando
c=new FteCdiControllerV2(); c.celulas.forEach((k:any)=>{k.status='ADSORCAO';k.interlockDisparado=false;}); c.executarCicloScanCLP(); await new Promise(r=>setTimeout(r,30));
t('REGRESSÃO: scan com dados válidos continua calculando eficiência (>50%)', c.celulas.every((k:any)=>k.eficienciaPct>50 && k.eficienciaPct<100));

// ===== B2: valores inventados =====
const antes=dbInstance.getHistoricoTelemetriaGeral(5).length;
c=new FteCdiControllerV2(); c.executarCicloScanCLP(); await new Promise(r=>setTimeout(r,30));
const linhas=dbInstance.getHistoricoTelemetriaGeral(50);
t('telemetria gravada SEM condutividade inventada (antes: 320 fixo)', linhas.length>0 && linhas.every((l:any)=>l.condutividade_us_cm===undefined));

// ===== A3 residual: PlcService não inventa padrão =====
plcService.atualizarRegistradoresComTelemetria({ph:7.55,fluoretoOutPPM:2.34,temperaturaC:31.2},{});
const regs=()=>plcService.getConfig().mapaRegistradores;
const v=[regs()[40005].valor,regs()[40009].valor,regs()[40010].valor];
plcService.atualizarRegistradoresComTelemetria({},{});
t('campos ausentes na telemetria: registradores mantêm o último valor (antes: 7.2, 1.1, 23.4 inventados)', regs()[40005].valor===v[0] && regs()[40009].valor===v[1] && regs()[40010].valor===v[2] && v[0]===755 && v[1]===234);

// ===== B2: e-mail =====
const ns:any=new NotificationService();
t('padrão sem variável de ambiente: lista de destinatários VAZIA (nenhum e-mail pessoal no código)', ns.getConfig().destinatariosEmail.length===0);
const nA=conta(/SCD-NOT-002/);
ns.atualizarConfig({emailHabilitado:true,pushHabilitado:false,somSireneHabilitado:false,webhookHabilitado:false});
const a1=ns.dispararAlertaInterlock({motivo:'teste sem destinatário',pressaoBar:2.9,vazaoLh:0,tensaoV:0,correnteA:0,isTeste:true});
t('e-mail ligado e sem destinatário: alarme crítico SCD-NOT-002 e canal EMAIL não usado', conta(/SCD-NOT-002/)-nA===1 && !(a1?.canaisDisparados||[]).includes('EMAIL'));
ns.adicionarDestinatario?.('ops@planta.com.br') ?? ns.atualizarConfig({destinatariosEmail:['ops@planta.com.br']});
const nB=conta(/SCD-NOT-002/);
const a2=ns.dispararAlertaInterlock({motivo:'teste com destinatário',pressaoBar:2.9,vazaoLh:0,tensaoV:0,correnteA:0,isTeste:true});
t('com destinatário: usa o canal EMAIL e não gera SCD-NOT-002', (a2?.canaisDisparados||[]).includes('EMAIL') && conta(/SCD-NOT-002/)===nB);
console.warn=origWarn; console.error=origErr;
console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
