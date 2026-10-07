// @ts-nocheck
// Processo filho: pré-carrega o localStorage (SEED), importa UM serviço e imprime o estado resultante.
const seed:Record<string,string>=JSON.parse(process.env.SEED||'{}');
const mem:Record<string,string>={...seed};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{ if(process.env.QUOTA==='1') throw new Error('QuotaExceededError'); mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const S='../src/services/';
console.warn=()=>{}; console.error=()=>{};
const modo=process.env.MODO!;
const { integridadeDados } = await import(S+'storageSeguro.ts');
let r:any={};
if(modo==='formulas'){ const { formulaServiceInstance } = await import(S+'formulaService.ts'); r.itens=formulaServiceInstance.getFormulas().map((f:any)=>({id:f.id,expr:f.expressao,v:f.valorCalculado})); }
if(modo==='usuarios'){ const { authService } = await import(S+'AuthService.ts'); r.itens=authService.getOperadoresDisponiveis().map((u:any)=>({m:u.matricula,role:u.role})); }
if(modo==='estacoes'){ const { multiStationService } = await import(S+'multiStationService.ts'); r.itens=multiStationService.getEstacoes().map((e:any)=>e.id); }
if(modo==='notif'){ const { notificationService } = await import(S+'NotificationService.ts'); r.config=notificationService.getConfig(); r.hist=notificationService.getHistoricoAlertas().map((a:any)=>a.id); }
if(modo==='purify'){ const { purifyWaveService } = await import(S+'purifywaveIntegrationService.ts'); const st=purifyWaveService.state; r.topo=st.topologiaAtiva; r.fte=st.posicaoFteCdi; r.modo=st.modoVisualizacao; }
if(modo==='cad'){ const { dbInstance } = await import(S+'database.ts'); r.layout=dbInstance.obterCadLayout('EST-X'); }
r.problemas=integridadeDados.listar().map((p:any)=>({c:p.codigo,k:p.chave,m:p.motivo}));
r.backups=Object.keys(mem).filter(k=>k.startsWith('scada_backup_corrompido:'));
r.chaves=Object.keys(mem).filter(k=>!k.startsWith('scada_backup'));
process.stdout.write('@@'+JSON.stringify(r)+'\n'); process.exit(0);
