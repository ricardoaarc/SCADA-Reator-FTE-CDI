// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-correcoes.mts
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const R='../src/services/';
const { FteCdiControllerV2, IndustrialRelayDriver } = await import(R+'fte_cdi_controller_v2.ts');
const { dbInstance } = await import(R+'database.ts');
const { plcService } = await import(R+'PlcService.ts');
const tick=()=>new Promise(r=>setTimeout(r,20));
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const alarmes=()=>dbInstance.alarmesList.map((a:any)=>a.mensagem).join('\n');

// 1) sinal inválido
{ const c=new FteCdiControllerV2(); c.celulas[0].pressaoBar=NaN; c.executarCicloScanCLP(); await tick();
  t('C3 NaN -> interlock + SCD-SEN-001', c.celulas[0].interlockDisparado && alarmes().includes('SCD-SEN-001'));
  t('C3 relés abertos', (await c.relayDriver.obterEstadoRele(c.celulas[0].id,'FONTE_DC'))==='ABERTO'); }
// 2) sobrepressão normal continua funcionando
{ const c=new FteCdiControllerV2(); c.celulas[1].pressaoBar=2.85; c.executarCicloScanCLP(); await tick();
  t('sobrepressão 2.85 -> SCD-SAF-001', c.celulas[1].interlockDisparado && alarmes().includes('SCD-SAF-001'));
  t('célula saudável não disparou', !c.celulas[2].interlockDisparado); }
// 3) falha no 1º relé: 2º ainda é tentado, alarme SAF-002, retry recupera
{ let falhar=true; const tentados:string[]=[]; const base=new IndustrialRelayDriver();
  const drv:any={ cortarReleFisico:async(id:number,tipo:string,m:string)=>{ tentados.push(tipo); if(falhar&&tipo==='FONTE_DC') throw new Error('modbus timeout'); return base.cortarReleFisico(id,tipo as any,m);},
    rearmarReleFisico:base.rearmarReleFisico.bind(base), obterEstadoRele:base.obterEstadoRele.bind(base)};
  const c=new FteCdiControllerV2(drv); c.celulas[3].pressaoBar=2.9; c.executarCicloScanCLP(); await tick();
  t('C2 2º relé tentado apesar da falha no 1º', tentados.includes('VALVULA_ALIMENTACAO'));
  t('C2 alarme SCD-SAF-002', alarmes().includes('SCD-SAF-002') && alarmes().includes('NÃO CONFIRMADO'));
  const nAntes=tentados.length; c.executarCicloScanCLP(); await tick();
  t('C2 reenvio do corte é limitado (não repete a cada scan, só após o intervalo)', tentados.length===nAntes);
  (FteCdiControllerV2 as any).REENVIO_CORTE_MS=0; // intervalo de reenvio zerado só para o teste
  falhar=false; c.executarCicloScanCLP(); await tick();
  t('C2 retry confirma corte', (await drv.obterEstadoRele(c.celulas[3].id,'FONTE_DC'))==='ABERTO' && alarmes().includes('confirmado') ); }
// 4) exceção em uma célula não impede a segurança das outras
{ const c=new FteCdiControllerV2(); Object.defineProperty(c.celulas[0],'fluoretoOutPPM',{get(){return 1},set(){throw new Error('boom')}});
  c.celulas[5].pressaoBar=2.9; c.executarCicloScanCLP(); await tick();
  t('C1 célula 5 intertravou mesmo com célula 0 falhando', c.celulas[5].interlockDisparado);
  t('C1 alarme SCD-CTL-001', alarmes().includes('SCD-CTL-001')); }
// 5) PlcService || -> ??
{ const regs=()=>plcService.getConfig().mapaRegistradores; const est={};
  plcService.atualizarRegistradoresComTelemetria({ph:0,fluoretoOutPPM:0,pressaoBar:1.5},est);
  t('A3 ph=0 gravado como 0 (antes virava 7.20)', regs()[40005].valor===0);
  t('A3 fluoretoOut=0 gravado como 0', regs()[40009].valor===0);
  plcService.atualizarRegistradoresComTelemetria({ph:NaN,pressaoBar:1.5},est);
  t('A3 NaN não sobrescreve (mantém 0)', regs()[40005].valor===0);
  plcService.atualizarRegistradoresComTelemetria({pressaoBar:2.0},est);
  t('pressão 2.0 -> 200', regs()[40001].valor===200); }
console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
