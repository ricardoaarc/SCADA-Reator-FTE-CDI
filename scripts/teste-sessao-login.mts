// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-sessao-login.mts   (precisa de teste-pin-hash-filho.mts ao lado)
import { execFileSync } from 'node:child_process';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const scriptFilho = new URL('./teste-pin-hash-filho.mts', import.meta.url).pathname;
const out=execFileSync('npx',['tsx',scriptFilho],{env:{...process.env,MODO:'sessao',SEED:'{}'},encoding:'utf8',cwd:process.cwd()});
const r=JSON.parse(out.split('\n').find((l:string)=>l.startsWith('@@'))!.slice(2));
t('a sessão INICIA com o menor privilégio (OPERADOR), não mais como ADM-001', r.inicial.role==='OPERADOR' && r.inicial.mat!=='ADM-001');
t('sessão inicial não pode alterar PID, comutar CLP nem editar layout', !r.pid0 && !r.clp0 && !r.layout0);
t('PIN errado não troca a sessão', r.ruim.sucesso===false && r.aposRuim==='OPERADOR');
t('matrícula vazia, PIN vazio e PIN de OUTRO usuário falham', !r.vazio && !r.semPin && !r.pinOutro);
t('mensagem de erro genérica (igual para matrícula inexistente e PIN errado)', r.mesmaMsg===true && !r.ruim.mensagem.includes('ADM-001'));
t('PIN certo (matrícula em minúsculas) assume a sessão e libera as permissões', r.okMin && r.roleAdm==='ADMIN' && r.pid1 && r.clp1);
t('perfil da sessão não expõe credenciais', r.atualSemCred);
t('login registrado na auditoria', r.auditoriaLogin);
t('encerrarSessao volta ao perfil básico e é auditado', r.aposEncerrar==='OPERADOR' && r.auditoriaEncerrar);
t('OPERADOR não cadastra, edita nem remove usuários (SCD-AUT-001) e a tentativa é auditada', r.cadOper==='SCD-AUT-001' && r.edtOper==='SCD-AUT-001' && r.delOper===false && r.negadoAuditado);
t('ENGENHEIRO também não gerencia usuários', r.roleEng==='ENGENHEIRO' && r.cadEng==='SCD-AUT-001' && r.delEng===false);
t('ADMIN cadastra usuário', r.cadAdm==='permitiu' && r.criado);
t('usuário recém-cadastrado entra com o PIN dele (perfil OPERADOR)', r.novoLoga===true && r.roleNovo==='OPERADOR' && r.logaDeNovoAdm==='ADMIN');
t('assinatura: matrícula vazia ou parcial não casa mais por nome; exata funciona', !r.assVazia && !r.assParcial && r.assExata);
t('5 falhas bloqueiam a matrícula (SCD-AUT-003), mesmo com o PIN certo; outra matrícula segue livre', r.bloqLogin===false && /SCD-AUT-003/.test(r.bloqMsg) && r.outroLivre===true);
t('usuário INATIVO não consegue entrar', r.inativoLoga===false);
t('PINs digitados não aparecem na auditoria', r.semSenhaNoLog);
console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
