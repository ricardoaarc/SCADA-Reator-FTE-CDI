// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-pin-hash.mts   (precisa de teste-pin-hash-filho.mts ao lado)
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT='../';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const filho=(modo:string,seed:any={},extra:any={}):any=>{
  const scriptFilho = fileURLToPath(new URL('./teste-pin-hash-filho.mts', import.meta.url));
  const out=execFileSync('npx',['tsx',scriptFilho],{env:{...process.env,MODO:modo,SEED:JSON.stringify(seed),...extra},encoding:'utf8',cwd:process.cwd(),shell:true});
  return JSON.parse(out.split('\n').find((l:string)=>l.startsWith('@@'))!.slice(2));
};
const { hashPin, verificarPin, ehHashPin, precisaRehash, validarPoliticaPin, ITERACOES_PADRAO } = await import(ROOT+'src/services/pinHash.ts');

// ===== módulo pinHash =====
const h1=await hashPin('segredo99'), h2=await hashPin('segredo99');
t('formato pbkdf2-sha256$600000$sal$hash', ehHashPin(h1) && h1.startsWith('pbkdf2-sha256$600000$') && ITERACOES_PADRAO===600000);
t('sal aleatório: mesmo PIN gera hashes diferentes', h1!==h2);
t('hash não contém o PIN', !h1.includes('segredo99'));
t('PIN correto confere (ambos os hashes)', await verificarPin('segredo99',h1) && await verificarPin('segredo99',h2));
t('PIN errado, vazio e quase igual não conferem', !(await verificarPin('segredo98',h1)) && !(await verificarPin('',h1)) && !(await verificarPin('Segredo99',h1)));
t('Unicode normalizado (NFKC) confere', await verificarPin('ｓｅｇｒｅｄｏ99',h1));
for(const lixo of ['', 'abc', 'pbkdf2-sha256$600000$x$y', 'pbkdf2-sha256$abc$AAAA$AAAA', null, undefined, 123, '1234']) {
  if(await verificarPin('1234',lixo as any)) t('formato inválido deve falhar: '+String(lixo), false);
}
t('formatos inválidos/adulterados nunca conferem (nem lançam)', true);
const t0=Date.now();
t('iterações absurdas (adulteradas) são recusadas sem travar', !(await verificarPin('x','pbkdf2-sha256$99999999$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=')) && Date.now()-t0<500);
const antigo=await hashPin('pin-velho-7',10000);
t('hash com menos iterações ainda confere e pede rehash', await verificarPin('pin-velho-7',antigo) && precisaRehash(antigo) && !precisaRehash(h1));
t('política: aceita PIN razoável', validarPoliticaPin('s3gr3d0!')===null && validarPoliticaPin('7391')===null);
t('política: recusa curto, fraco, repetido, vazio, não-texto', ['abc','1234','0000','admin','1111','aaaaaa','',undefined,12345].every(p=>validarPoliticaPin(p as any)!==null));
t('política: recusa PIN gigante', validarPoliticaPin('x'.repeat(65))!==null);

// ===== AuthService (um processo por cenário) =====
let r=filho('padrao');
t('usuários padrão: PIN correto assina (ENG-882 e ADM-001)', r.engOk && r.admOk);
t('PIN errado não assina', !r.engErrado);
t('SENHAS MESTRAS REMOVIDAS: admin/123456/engenharia123 e PIN de outro usuário falham', Object.values(r.mestras).every((v:any)=>v===false));
t('matrícula inexistente + senha mestra NÃO vira ADMIN (antes virava)', r.desconhecidoComMestra===false && r.desconhecidoComMestra2===false);
t('SUPERVISOR e OPERADOR não assinam mesmo com o PIN certo', !r.supervisor && !r.operador);
t('listas e operador atual não expõem pinHash/senhaPin', r.semCredenciaisLista && r.semCredenciaisAtual);
t('4 usuários padrão marcados com pinPadrao', r.padraoFlags===4);
t('armazenamento sem PIN em texto puro (8820/2026/1040/2020)', !/"senhaPin"/.test(r.armazenado) && !/\b(8820|2026|1040|2020)\b/.test(r.armazenado.replace(/pbkdf2-sha256\$[^"]+/g,'')));

const PINS_PADRAO:any={'OP-104':'1040','ENG-882':'8820','ADM-001':'2026','SUP-202':'2020'};
const base=filho('lista').lista;
// Armazenamento no formato ANTIGO: PIN em texto puro e sem hash
const legado=(extra:any[])=>JSON.stringify([...base.map((u:any)=>({...u,pinPadrao:undefined,senhaPin:PINS_PADRAO[u.matricula]})),...extra]);
const eng999={id:'u999',nome:'Eng Custom',matricula:'ENG-999',role:'ENGENHEIRO',cargo:'c',email:'e',ultimoAcesso:'x',senhaPin:'7391',status:'ATIVO'};
r=filho('legado',{scada_registered_users:legado([eng999])});
t('legado: PIN em texto puro migrado e login funciona logo na 1ª tentativa (espera a migração)', r.logoApos===true);
t('legado: texto puro APAGADO do armazenamento e hash gravado', r.semTextoPuro && r.temHash);
t('legado: pinPadrao=true só para quem ainda usa o PIN de demonstração', r.pinPadrao882===true && r.pinPadraoCustom===false);
t('legado: usuário padrão continua entrando com o PIN dele', r.a882===true);
t('legado: migração registrada na auditoria', r.auditoria===true);

r=filho('cadastro');
t('cadastro recusa PIN fraco, curto, ausente e repetido (sem padrão "1234")', ['fraco','curto','ausente','repetido'].every(k=>r[k]!=='ok'));
t('cadastro com PIN válido funciona e o novo usuário assina', r.ok==='ok' && r.novoAssina===true && r.novoErrado===false);
t('cadastro recusa matrícula duplicada (case-insensitive)', /Já existe/.test(r.duplicada));
t('PIN novo nunca aparece em texto puro no armazenamento', r.semTextoPuro && r.semTextoPuro2);
t('editar sem novoPin mantém o PIN; com novoPin troca (antigo falha)', r.pinMantidoSemNovoPin && !r.antigoFalha && r.novoOk);
t('novoPin fraco é recusado na edição', r.pinFracoAtualiza!=='aceitou');
t('injetar pinHash/senhaPin/pinPadrao via atualizarOperador é ignorado', r.injecaoIgnorada===true);
t('usuário INATIVO não assina', r.inativoAssina===false);

r=filho('lockout');
t('após 5 falhas a matrícula é bloqueada, mesmo com o PIN certo (SCD-AUT-003)', r.certaBloqueada===false && /SCD-AUT-003/.test(r.msgBloqueio));
t('bloqueio é por matrícula (outra matrícula segue funcionando)', r.outraMatricula===true);
t('tentativas inválidas vão para a auditoria, sem registrar o PIN digitado', r.auditoriaFalhas>=5 && r.pinNoLog===false);

r=filho('semcrypto',{scada_registered_users:legado([eng999])},{SEM_CRYPTO:'1'});
t('sem Web Crypto: assinatura FALHA FECHADO (SCD-AUT-002)', r.sucesso===false && /SCD-AUT-002/.test(r.msg));
t('sem Web Crypto: PIN legado NÃO é apagado e cadastro é recusado', r.legadoIntacto===true && r.cadastro!=='aceitou');

const eng555={id:'u555',nome:'Eng Antigo',matricula:'ENG-555',role:'ENGENHEIRO',cargo:'c',email:'e',ultimoAcesso:'x',pinHash:await hashPin('pin-antigo-9',20000),status:'ATIVO'};
r=filho('rehash',{scada_registered_users:legado([eng555])});
t('hash com poucas iterações é reforçado após login correto', r.ok && r.antes==='20000' && r.depois==='600000' && r.aindaFunciona);
console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
