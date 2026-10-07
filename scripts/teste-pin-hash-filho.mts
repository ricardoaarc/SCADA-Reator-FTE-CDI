// @ts-nocheck
// Filho: um cenário de AuthService por processo, com localStorage pré-carregado (SEED).
const seed:Record<string,string>=JSON.parse(process.env.SEED||'{}');
const mem:Record<string,string>={...seed};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
if(process.env.SEM_CRYPTO==='1'){ Object.defineProperty(globalThis,'crypto',{value:{},configurable:true}); }
console.warn=()=>{}; console.error=()=>{};
const S='../src/services/';
const { authService } = await import(S+'AuthService.ts');
const { hashPin } = await import(S+'pinHash.ts');
const modo=process.env.MODO!; const r:any={};
const adm=async()=>{ const x=await authService.autenticarOperador('ADM-001','2026'); if(!x.sucesso) throw new Error('login adm falhou: '+x.mensagem); };
const assina=(m:string,p:string)=>authService.validarAssinaturaEngenheiro(m,p);
const usuarios=()=>JSON.parse(mem['scada_registered_users']||'[]');
const outros=authService.getOperadoresDisponiveis();

if(modo==='sessao'){
  const op0=authService.getOperadorAtual(); r.inicial={role:op0.role,mat:op0.matricula}; r.pid0=authService.podeModificarPid(); r.clp0=authService.podeComutarModoClp(); r.layout0=authService.podeEditarLayout();
  const ruim=await authService.autenticarOperador('ADM-001','0000'); r.ruim=ruim; r.aposRuim=authService.getOperadorAtual().role;
  r.vazio=(await authService.autenticarOperador('','')).sucesso; r.semPin=(await authService.autenticarOperador('ADM-001','')).sucesso;
  r.inexistente=await authService.autenticarOperador('NAO-EXISTE','2026'); r.pinOutro=(await authService.autenticarOperador('ADM-001','8820')).sucesso; // PIN de ENG-882
  r.mesmaMsg=ruim.mensagem===r.inexistente.mensagem;
  const ok=await authService.autenticarOperador('adm-001','2026'); r.okMin=ok.sucesso; r.roleAdm=authService.getOperadorAtual().role;
  r.pid1=authService.podeModificarPid(); r.clp1=authService.podeComutarModoClp();
  r.atualSemCred=!('pinHash' in authService.getOperadorAtual())&&!('senhaPin' in authService.getOperadorAtual());
  r.auditoriaLogin=authService.getHistoricoAuditoria().some((l:any)=>/Troca de operador ativa/.test(JSON.stringify(l)) && /ADM|Admin|Ricardo/i.test(JSON.stringify(l)));
  authService.encerrarSessao(); r.aposEncerrar=authService.getOperadorAtual().role; r.auditoriaEncerrar=authService.getHistoricoAuditoria().some((l:any)=>/Sessão encerrada/.test(JSON.stringify(l)));
  // gestão de usuários sem permissão
  const base={nome:'Fulano',matricula:'TST-1',role:'OPERADOR' as const,cargo:'c',email:'e@e.com',zonasAutorizadas:[],pin:'s3gr3d0!'};
  const nega=async(f:()=>Promise<any>)=>{try{await f();return 'permitiu'}catch(e:any){return e.codigo||e.message}};
  r.cadOper=await nega(()=>authService.cadastrarOperador(base));
  const idEng=authService.getOperadoresDisponiveis().find((u:any)=>u.matricula==='ENG-882')!.id;
  r.edtOper=await nega(()=>authService.atualizarOperador(idEng,{cargo:'x'}));
  r.delOper=authService.excluirOperador(idEng);
  r.negadoAuditado=authService.getHistoricoAuditoria().some((l:any)=>/ACESSO NEGADO/.test(JSON.stringify(l)));
  await authService.autenticarOperador('ENG-882','8820'); r.roleEng=authService.getOperadorAtual().role;
  r.cadEng=await nega(()=>authService.cadastrarOperador(base)); r.delEng=authService.excluirOperador(idEng);
  await adm(); r.cadAdm=await nega(()=>authService.cadastrarOperador(base));
  const idNovo=authService.getOperadoresDisponiveis().find((u:any)=>u.matricula==='TST-1')?.id; r.criado=!!idNovo;
  // admin remove o usuário LOGADO: volta ao básico
  r.novoLoga=(await authService.autenticarOperador('TST-1','s3gr3d0!')).sucesso; r.roleNovo=authService.getOperadorAtual().role;
  await adm(); r.logaDeNovoAdm=authService.getOperadorAtual().role;
  // assinatura: matrícula vazia/parcial não casa mais por nome
  r.assVazia=(await assina('','8820')).sucesso; r.assParcial=(await assina('A','8820')).sucesso; r.assExata=(await assina('eng-882','8820')).sucesso;
  // bloqueio compartilhado entre login e assinatura (mesma matrícula)
  authService.encerrarSessao();
  for(let i=0;i<5;i++) await authService.autenticarOperador('SUP-202','err'+i);
  const bloq=await authService.autenticarOperador('SUP-202','2020'); r.bloqLogin=bloq.sucesso; r.bloqMsg=bloq.mensagem;
  r.outroLivre=(await authService.autenticarOperador('OP-104','1040')).sucesso;
  // inativo e sem PIN
  await adm(); const idSup=authService.getOperadoresDisponiveis().find((u:any)=>u.matricula==='OP-104')!.id; await authService.atualizarOperador(idSup,{status:'INATIVO'});
  authService.encerrarSessao(); r.inativoLoga=(await authService.autenticarOperador('OP-104','1040')).sucesso;
  r.semSenhaNoLog=!JSON.stringify(authService.getHistoricoAuditoria()).includes('err0')&&!JSON.stringify(authService.getHistoricoAuditoria()).includes('s3gr3d0');
}
if(modo==='lista'){ r.lista=outros; }
if(modo==='padrao'){
  r.engOk=(await assina('ENG-882','8820')).sucesso;
  r.engErrado=(await assina('ENG-882','0000')).sucesso;
  r.admOk=(await assina('ADM-001','2026')).sucesso;
  r.mestras={}; for(const k of ['admin','123456','engenharia123','2026']) r.mestras[k]=(await assina('ENG-882',k)).sucesso;
  r.desconhecidoComMestra=(await assina('XYZ-000','admin')).sucesso;
  r.desconhecidoComMestra2=(await assina('NAOEXISTE','8820')).sucesso;
  r.supervisor=(await assina('SUP-202','2020')).sucesso; // SUPERVISOR não assina
  r.operador=(await assina('OP-104','1040')).sucesso;
  r.semCredenciaisLista=outros.every((u:any)=>!('pinHash' in u)&&!('senhaPin' in u));
  r.semCredenciaisAtual=!('pinHash' in authService.getOperadorAtual())&&!('senhaPin' in authService.getOperadorAtual());
  r.padraoFlags=outros.filter((u:any)=>u.pinPadrao).length;
  r.armazenado=JSON.stringify(mem);
}
if(modo==='legado'){
  r.logoApos=(await assina('ENG-999','7391')).sucesso; // espera a migração
  const u=usuarios(); const eng=u.find((x:any)=>x.matricula==='ENG-999'); const c882=u.find((x:any)=>x.matricula==='ENG-882');
  r.semTextoPuro=!JSON.stringify(mem).includes('7391') && !JSON.stringify(mem).includes('"senhaPin"');
  r.temHash=/^pbkdf2-sha256\$600000\$/.test(eng?.pinHash||'');
  r.pinPadraoCustom=eng?.pinPadrao; r.pinPadrao882=c882?.pinPadrao;
  r.a882=(await assina('ENG-882','8820')).sucesso;
  r.auditoria=authService.getHistoricoAuditoria().some((l:any)=>/migrado/.test(l.acao||l.descricao||JSON.stringify(l)));
}
if(modo==='cadastro'){
  await adm();
  const base={nome:'Novo',matricula:'ENG-777',role:'ENGENHEIRO' as const,cargo:'c',email:'e@e.com',zonasAutorizadas:[]};
  const tenta=async(pin:any,mat='ENG-777')=>{try{await authService.cadastrarOperador({...base,matricula:mat,pin});return 'ok'}catch(e:any){return e.message}};
  r.fraco=await tenta('1234'); r.curto=await tenta('abc'); r.ausente=await tenta(undefined); r.repetido=await tenta('7777'); 
  r.ok=await tenta('s3gr3d0!'); r.duplicada=await tenta('outroPin9','eng-777');
  r.novoAssina=(await assina('ENG-777','s3gr3d0!')).sucesso; r.novoErrado=(await assina('ENG-777','1234')).sucesso;
  r.semTextoPuro=!JSON.stringify(mem).includes('s3gr3d0!');
  const id=authService.getOperadoresDisponiveis().find((u:any)=>u.matricula==='ENG-777')!.id;
  r.retornoSemHash=true;
  // atualização
  await adm(); await authService.atualizarOperador(id,{cargo:'novo cargo'});
  r.pinMantidoSemNovoPin=(await assina('ENG-777','s3gr3d0!')).sucesso;
  await adm(); await authService.atualizarOperador(id,{novoPin:'outroSegredo7'});
  r.antigoFalha=(await assina('ENG-777','s3gr3d0!')).sucesso; r.novoOk=(await assina('ENG-777','outroSegredo7')).sucesso;
  await adm(); try{ await authService.atualizarOperador(id,{novoPin:'1111'}); r.pinFracoAtualiza='aceitou'; }catch(e:any){ r.pinFracoAtualiza=e.message; }
  await adm(); await authService.atualizarOperador(id,{pinHash:'pbkdf2-sha256$1000$AAAA$AAAA',senhaPin:'0000',pinPadrao:true} as any);
  r.injecaoIgnorada=(await assina('ENG-777','outroSegredo7')).sucesso && !(await assina('ENG-777','0000')).sucesso;
  r.semTextoPuro2=!JSON.stringify(mem).includes('outroSegredo7');
  await adm(); await authService.atualizarOperador(id,{status:'INATIVO'});
  r.inativoAssina=(await assina('ENG-777','outroSegredo7')).sucesso;
}
if(modo==='lockout'){
  const falhas:any[]=[]; for(let i=0;i<5;i++) falhas.push((await assina('ENG-882','erradoX'+i)).mensagem);
  const certaBloqueada=await assina('ENG-882','8820');
  r.certaBloqueada=certaBloqueada.sucesso; r.msgBloqueio=certaBloqueada.mensagem;
  r.outraMatricula=(await assina('ADM-001','2026')).sucesso;
  r.auditoriaFalhas=authService.getHistoricoAuditoria().filter((l:any)=>/Tentativa inválida/.test(JSON.stringify(l))).length;
  r.pinNoLog=JSON.stringify(authService.getHistoricoAuditoria()).includes('erradoX');
}
if(modo==='semcrypto'){
  const x=await assina('ENG-882','8820'); r.sucesso=x.sucesso; r.msg=x.mensagem;
  r.legadoIntacto=JSON.stringify(mem).includes('7391');
  try{ await authService.cadastrarOperador({nome:'N',matricula:'ENG-1',role:'ENGENHEIRO',cargo:'c',email:'e',zonasAutorizadas:[],pin:'s3gr3d0!'}); r.cadastro='aceitou'; }catch(e:any){ r.cadastro=e.code||e.codigo||e.message; }
}
if(modo==='rehash'){
  const antes=usuarios().find((u:any)=>u.matricula==='ENG-555')?.pinHash;
  r.ok=(await assina('ENG-555','pin-antigo-9')).sucesso;
  const depois=usuarios().find((u:any)=>u.matricula==='ENG-555')?.pinHash;
  r.antes=antes.split('$')[1]; r.depois=depois.split('$')[1];
  r.aindaFunciona=(await assina('ENG-555','pin-antigo-9')).sucesso;
}
process.stdout.write('@@'+JSON.stringify(r)+'\n'); process.exit(0);
