// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-dados-salvos.mts   (precisa de teste-dados-salvos-filho.mts ao lado)
import { execFileSync } from 'node:child_process';
const ROOT='../';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const filho=(modo:string,seed:Record<string,string>={},extra:Record<string,string>={}):any=>{
  const scriptFilho = new URL('./teste-dados-salvos-filho.mts', import.meta.url).pathname;
  const out=execFileSync('npx',['tsx',scriptFilho],{env:{...process.env,MODO:modo,SEED:JSON.stringify(seed),...extra},encoding:'utf8',cwd:process.cwd()});
  return JSON.parse(out.split('\n').find(l=>l.startsWith('@@'))!.slice(2));
};

// ================= unitários do módulo =================
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{ if((globalThis as any).__quota) throw new Error('QuotaExceededError'); mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const origWarn=console.warn; console.warn=()=>{};
const { esq, lerJson, lerLista, lerCampos, gravarJson, integridadeDados } = await import(ROOT+'src/services/storageSeguro.ts');
const E=await import(ROOT+'src/services/esquemasDados.ts');

t('numero rejeita NaN/Infinity/texto', esq.numero()(NaN,'x') && esq.numero()(Infinity,'x') && esq.numero()('1','x') && esq.numero()(1,'x')===null);
t('numero respeita min/max/inteiro', esq.numero({min:0})(-1,'x') && esq.numero({max:5})(6,'x') && esq.numero({inteiro:true})(1.5,'x'));
t('texto respeita tamanho e padrão', esq.texto({max:3})('abcd','x') && esq.texto({padrao:/^a/})('b','x') && esq.texto()('ok','x')===null);
t('enum, opcional, ouNulo', esq.enum(['A','B'])('C','x') && esq.opcional(esq.numero())(undefined,'x')===null && esq.opcional(esq.numero())('a','x') && esq.ouNulo(esq.numero())(null,'x')===null);
t('objeto exige campos e rejeita não-objeto/array/null', esq.objeto({a:esq.numero()})({},'x') && esq.objeto({})(null,'x') && esq.objeto({})([],'x') && esq.objeto({a:esq.numero()})({a:1,extra:true},'x')===null);

integridadeDados.dispensar();
mem['k1']='{json quebrado';
let v=lerJson('k1',esq.objeto({}),()=>({padrao:true}),'Teste 1');
t('JSON inválido -> padrão + problema SCD-DAT-001', (v as any).padrao===true && integridadeDados.listar().some((p:any)=>p.chave==='k1'&&p.codigo==='SCD-DAT-001'));
t('cópia do valor ruim guardada em scada_backup_corrompido:k1', JSON.parse(mem['scada_backup_corrompido:k1']).bruto==='{json quebrado');
v=lerJson('inexistente',esq.objeto({}),()=>'padrao','Teste 2'); const n0=integridadeDados.listar().length;
t('chave ausente -> padrão SEM alarme (primeira execução)', v==='padrao' && !integridadeDados.listar().some((p:any)=>p.chave==='inexistente'));
mem['k3']=JSON.stringify([{a:1},{a:'x'},{a:3},null]);
let l=lerLista('k3',esq.objeto({a:esq.numero()}),()=>[{a:-1}],'Teste 3');
t('lista parcial: mantém válidos, descarta inválidos', JSON.stringify(l)==='[{"a":1},{"a":3}]');
t('lista parcial gera problema com contagem', integridadeDados.listar().some((p:any)=>p.chave==='k3'&&/2 de 4/.test(p.motivo)));
mem['k4']=JSON.stringify([{a:'x'}]); l=lerLista('k4',esq.objeto({a:esq.numero()}),()=>[{a:-1}],'Teste 4');
t('lista sem nenhum válido -> padrão', JSON.stringify(l)==='[{"a":-1}]');
mem['k5']='{"nao":"lista"}'; l=lerLista('k5',esq.objeto({}),()=>[{a:9}],'Teste 5'); t('lista que não é array -> padrão', l[0].a===9);
mem['k6']='[]'; const antes=integridadeDados.listar().length; l=lerLista('k6',esq.objeto({}),()=>[{a:7}],'Teste 6'); t('lista vazia -> padrão sem alarme', l[0].a===7 && integridadeDados.listar().length===antes);
mem['k7']=JSON.stringify({a:true,b:'x',c:10,extra:1});
const c7=lerCampos('k7',{a:esq.booleano(),b:esq.numero(),c:esq.numero(),d:esq.booleano()},{a:false,b:5,c:1,d:true},'Teste 7');
t('campos: válido mantido, inválido volta ao padrão, ausente = padrão', c7.a===true && c7.b===5 && c7.c===10 && c7.d===true);
t('campos: problema cita o campo inválido', integridadeDados.listar().some((p:any)=>p.chave==='k7'&&/b: esperado número/.test(p.motivo)));
// dedupe
const ant=integridadeDados.listar().length; mem['k1']='{json quebrado'; lerJson('k1',esq.objeto({}),()=>0,'Teste 1'); t('mesmo problema não duplica na lista', integridadeDados.listar().length===ant);
// gravação
(globalThis as any).__quota=true;
const g=gravarJson('kq',{a:1},'Teste Q');
t('gravação sem cota -> false + SCD-DAT-002 (sem lançar exceção)', g===false && integridadeDados.listar().some((p:any)=>p.chave==='kq'&&p.codigo==='SCD-DAT-002'));
(globalThis as any).__quota=false;
t('gravação normal retorna true', gravarJson('kok',{a:1})===true && mem['kok']==='{"a":1}');
// ganchos, assinatura, dispensar
let visto:string[]=[]; const off=integridadeDados.aoRegistrar((p:any)=>visto.push(p.chave));
t('aoRegistrar reenvia problemas anteriores', visto.includes('k1')&&visto.includes('kq'));
mem['k8']='x{'; lerJson('k8',esq.objeto({}),()=>0,'Teste 8'); t('aoRegistrar recebe problema novo', visto.includes('k8')); off();
let ultimo:any[]=[]; const un=integridadeDados.assinar((l:any)=>{ultimo=l}); integridadeDados.dispensar(); t('dispensar limpa e notifica', ultimo.length===0); un();
mem['kf']='1'; const orig=(globalThis as any).localStorage.getItem; (globalThis as any).localStorage.getItem=()=>{throw new Error('SecurityError')};
v=lerJson('kf',esq.objeto({}),()=>'padrao','Teste F'); (globalThis as any).localStorage.getItem=orig;
t('armazenamento inacessível (modo privado) -> padrão + SCD-DAT-002', v==='padrao' && integridadeDados.listar().some((p:any)=>p.codigo==='SCD-DAT-002'&&p.chave==='kf'));

// esquemas de domínio
const formulaOk={id:'f1',nome:'Delta P',tagPath:'Calculadas.DeltaP',expressao:'(PT_101 - PT_102) * 10.197',unidade:'mca',descricao:'x',valorCalculado:1,statusCalculo:'OK',criadoEm:'a',atualizadoEm:'b',autor:'c'};
t('fórmula válida passa', E.esquemaFormula(formulaOk,'f')===null);
t('fórmula com valorCalculado null (NaN salvo) passa e normaliza para 0', E.esquemaFormula({...formulaOk,valorCalculado:null},'f')===null && E.normalizarFormula({...formulaOk,valorCalculado:null}).valorCalculado===0);
for(const mal of ["alert('x')","a;b","`x`","a{b}","process.exit(1)\\u0000","x[0]","$a","'a'"]) {
  if(!E.esquemaFormula({...formulaOk,expressao:mal},'f')) { t('fórmula perigosa REJEITADA: '+mal, false); }
}
t('fórmulas com aspas, crase, ponto e vírgula, chaves, colchetes e $ são rejeitadas', ["alert('x')","a;b","`x`","a{b}","x[0]","$a"].every(m=>E.esquemaFormula({...formulaOk,expressao:m},'f')!==null));
t('fórmula com expressão enorme rejeitada', E.esquemaFormula({...formulaOk,expressao:'1+'.repeat(400)},'f')!==null);
const opOk={id:'u1',nome:'A',matricula:'M1',role:'ADMIN',cargo:'c',email:'e',ultimoAcesso:'x'};
t('operador válido passa', E.esquemaOperador(opOk,'o')===null);
t('operador com role inventado ("ROOT") é rejeitado', E.esquemaOperador({...opOk,role:'ROOT'},'o')!==null);
t('operador com permissões incompletas é rejeitado', E.esquemaOperador({...opOk,permissoes:{canViewSynoptic:true}},'o')!==null);
t('config: webhookUrl javascript: rejeitada, https ok, vazia ok', E.camposNotificacao.webhookUrl('javascript:alert(1)','u')!==null && E.camposNotificacao.webhookUrl('https://a.com/x','u')===null && E.camposNotificacao.webhookUrl('','u')===null);
t('config: e-mail inválido e cooldown negativo rejeitados', E.camposNotificacao.destinatariosEmail(['semarroba'],'e')!==null && E.camposNotificacao.cooldownSegundos(-5,'c')!==null);
console.warn=origWarn;

// ================= integração: cada serviço em processo próprio =================
let r=filho('formulas',{purifywave_scada_formula_tags_v2:'{{lixo'});
t('fórmulas corrompidas -> carrega padrão, não quebra', r.itens.length>0 && r.problemas.some((p:any)=>p.k==='purifywave_scada_formula_tags_v2'&&p.c==='SCD-DAT-001') && r.backups.includes('scada_backup_corrompido:purifywave_scada_formula_tags_v2'));
const padrao=filho('formulas'); const idPadrao=padrao.itens[0].id;
t('sem dados salvos -> padrão sem nenhum problema', padrao.problemas.length===0);
r=filho('formulas',{purifywave_scada_formula_tags_v2:JSON.stringify([{...formulaOk,id:'minha',expressao:'PT_101 * 2'},{...formulaOk,id:'maliciosa',expressao:"fetch('//x')"},{id:'incompleta'}])});
t('fórmulas: válida mantida, maliciosa e incompleta descartadas', r.itens.length===1 && r.itens[0].id==='minha' && r.problemas.length===1 && /2 de 3/.test(r.problemas[0].m));
r=filho('usuarios',{scada_registered_users:JSON.stringify([{...opOk,matricula:'ADM-001'},{...opOk,matricula:'EVIL',role:'ROOT'}])});
t('usuários: role inventado descartado, válido mantido', r.itens.length===1 && r.itens[0].m==='ADM-001' && r.itens[0].role==='ADMIN');
r=filho('usuarios',{scada_registered_users:JSON.stringify([{foo:1}])});
t('usuários: nenhum válido -> predefinidos (nunca lista vazia)', r.itens.length>0 && r.problemas.length===1);
r=filho('estacoes',{purifywave_scada_stations_v2:'[{"id":"x"}]'});
t('estações incompletas descartadas, padrão assumido', r.itens.length>0 && !r.itens.includes('x') && r.problemas.some((p:any)=>p.k==='purifywave_scada_stations_v2'));
r=filho('notif',{scada_notification_config:JSON.stringify({emailHabilitado:true,webhookUrl:'javascript:alert(1)',cooldownSegundos:-1,webhookHabilitado:true,destinatariosEmail:['a@b.com']}),
  scada_notification_history:JSON.stringify([{id:'quebrado'},'lixo'])});
t('notificações: campos bons mantidos (e-mail, destinatário, webhook ligado)', r.config.emailHabilitado===true && r.config.webhookHabilitado===true && r.config.destinatariosEmail[0]==='a@b.com');
t('notificações: webhookUrl perigosa e cooldown negativo voltam ao padrão', !/^javascript:/.test(r.config.webhookUrl) && r.config.cooldownSegundos>=0);
t('notificações: histórico inválido descartado (painel não quebra)', r.hist.length===0 && r.problemas.some((p:any)=>p.k==='scada_notification_history'));
r=filho('purify',{purifywave_layout_config_v2:JSON.stringify({topologiaAtiva:'TOPOLOGIA_INVENTADA',posicaoFteCdi:'POS_3_FINAL',modoVisualizacao:42})});
t('layout PurifyWave: valor válido aplicado, inválidos ignorados', r.fte==='POS_3_FINAL' && r.topo!=='TOPOLOGIA_INVENTADA' && r.modo!==42 && r.problemas.length===1);
r=filho('cad',{scada_cad_layout_EST_X:'x'});
r=filho('cad',{'scada_cad_layout_EST-X':JSON.stringify({estacaoId:'EST-X',posicoes:{a:{x:'1',y:2}}})});
t('layout CAD inválido -> null e aviso (editor recomeça do padrão)', r.layout===null && r.problemas.some((p:any)=>/Layout CAD/.test(p.k)||/cad_layout/.test(p.k)));
r=filho('cad',{'scada_cad_layout_EST-X':JSON.stringify({id:'l',estacaoId:'EST-X',nomeLayout:'N',operador:'o',posicoes:{a:{x:1,y:2}},criadoEm:'a',atualizadoEm:'b'})});
t('layout CAD válido é carregado', r.layout?.nomeLayout==='N' && r.problemas.length===0);
r=filho('formulas',{},{QUOTA:'1'});
t('cota cheia na inicialização -> SCD-DAT-002 e o sistema sobe com padrão', r.itens.length>0 && r.problemas.some((p:any)=>p.c==='SCD-DAT-002'));

console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
