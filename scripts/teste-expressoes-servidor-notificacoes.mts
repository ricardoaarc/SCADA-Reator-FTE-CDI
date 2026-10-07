import nodeFs from 'node:fs';
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const ROOT = '../';
const R = '../src/services/';
const express = (await import('express')).default;
const { avaliarExpressaoSegura, ErroExpressao } = await import(R+'expressaoSegura.ts');
const { formulaServiceInstance: fs } = await import(R+'formulaService.ts');
const { limitarTaxa, validarEntradaLaudo } = await import(ROOT+'server/protecao.ts');
const { montarLaudoDeOcr } = await import(R+'laudoOcr.ts');
const { externalNotificationServiceInstance: ext } = await import(R+'externalNotificationService.ts');
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const origWarn=console.warn,origErr=console.error; console.warn=()=>{};console.error=()=>{};
const V={PT_101:2.5,PT_102:1.8,F_IN:8.5,F_OUT:1.1,Z:0,'Calculadas.DeltaP':0.7};
const av=(e:string,v:any=V)=>avaliarExpressaoSegura(e,v);
const erro=(e:string,v:any=V)=>{try{av(e,v);return null}catch(x:any){return x instanceof ErroExpressao?x.tipo:'OUTRO:'+x.message}};

// ===== expressões: compatibilidade com as fórmulas padrão e comuns =====
t('fórmula padrão ΔP: (PT_101 - PT_102) * 10.197', Math.abs(av('(PT_101 - PT_102) * 10.197')-7.1379)<1e-3);
t('fórmula padrão eficiência: ((F_IN - F_OUT) / F_IN) * 100', Math.abs(av('((F_IN - F_OUT) / F_IN) * 100')-87.0588)<1e-3);
t('precedência e associatividade: 2+3*4=14, 2^3^2=512, -2^2=-4, 10-4-3=3, 2*3%4=2', av('2+3*4')===14 && av('2^3^2')===512 && av('-2^2')===-4 && av('10-4-3')===3 && av('2*3%4')===2);
t('** igual a ^; expoente negativo; unário duplo', av('2**3')===8 && av('2^-1')===0.5 && av('--3')===3 && av('+4')===4);
t('funções: abs sqrt min max round sin cos log, com e sem Math.', av('abs(-3)')===3 && av('sqrt(16)')===4 && av('min(3,1,2)')===1 && av('max(3,1,2)')===3 && av('round(2.6)')===3 && av('Math.sqrt(9)')===3 && Math.abs(av('log(E)')-1)<1e-12 && Math.abs(av('sin(PI/2)')-1)<1e-12 && Math.abs(av('cos(0)')-1)<1e-12);
t('comparações, lógica e condicional', av('PT_101 > 2.8 ? 1 : 0')===0 && av('PT_101 < 2.8 && F_OUT < 1.5')===1 && av('!(PT_101>1)')===0 && av('1==1')===1 && av('1!=1')===0 && av('2>=2')===1 && av('1<=0 || 3>2')===1);
t('tag com ponto no nome', av('Calculadas.DeltaP * 10')===7);
t('números: .5, 1e-3, 12.5', av('.5+1e-3')===0.501 && av('12.5')===12.5);
t('prefixo de tag não confunde nomes (PT_101 vs PT_1011)', av('PT_101',{PT_101:1,PT_1011:2})===1 && av('PT_1011',{PT_101:1,PT_1011:2})===2);

// ===== segurança: nada vira JavaScript =====
const ataques=["alert(1)","constructor.constructor('return 1')()","(1).constructor","this","globalThis","window.location","process.exit(1)","fetch('//x')","eval('1')","Function('return 1')()","__proto__","PT_101.__proto__","toString()","1;2","a=1","`x`","'a'","\"a\"","{}","[]","x[0]","$a","1,2","import('x')","require('fs')","PT_101 ? (1","(((((1)))))))","1 +","* 2","()","min()","Math.floor(1)","constructor","hasOwnProperty('x')"];
const aceitos=ataques.filter(a=>erro(a)===null);
t('34 payloads de injeção/sintaxe inválida: TODOS rejeitados (nenhum executa)', aceitos.length===0);
if(aceitos.length) origErr('ACEITOS:',aceitos);
t('nomes herdados de Object (constructor, __proto__, toString) NÃO resolvem como tag', erro('constructor')==='TAG' && erro('__proto__')==='TAG' && erro('toString')==='TAG');
(globalThis as any).__pwn=false; erro("(globalThis.__pwn=true)"); t('tentativa de escrever em globalThis não tem efeito', (globalThis as any).__pwn===false);
t('divisão por zero e módulo zero -> erro de valor', erro('1/0')==='VALOR' && erro('1/Z')==='VALOR' && erro('5%0')==='VALOR');
t('resultados não finitos -> erro (10^400, sqrt negativa, log(0))', erro('10^400')==='VALOR' && erro('sqrt(-1)')==='VALOR' && erro('log(0)')==='VALOR');
t('tag ausente/ NaN/ Infinity no contexto -> erro claro', erro('X_9')==='TAG' && erro('PT_101',{PT_101:NaN})==='VALOR' && erro('PT_101',{PT_101:Infinity})==='VALOR');
t('vazia, só espaços e gigante rejeitadas', erro('')==='SINTAXE' && erro('   ')==='SINTAXE' && erro('1+'.repeat(300)+'1')==='SINTAXE');
t('parênteses aninhados demais -> erro (sem estourar a pilha)', erro('('.repeat(200)+'1'+')'.repeat(200))==='SINTAXE' && erro('-'.repeat(300)+'1')==='SINTAXE');
const t0=Date.now(); erro('2^2^2^2^2^2^2'); erro('9^9^9'); t('potências enormes não travam (<200 ms)', Date.now()-t0<200);

// ===== formulaService usa o interpretador =====
let r=fs.avaliarExpressao('(PT_101 - PT_102) * 10.197',V); t('serviço: valor 7.1379 e status OK', r.status==='OK' && r.valor===7.1379);
r=fs.avaliarExpressao("alert('x')",V); t('serviço: injeção -> ERRO_SINTAXE ou TAG_INEXISTENTE, valor 0, sem executar', r.status!=='OK' && r.valor===0);
r=fs.avaliarExpressao('1/0',V); t('serviço: 1/0 -> ERRO_SINTAXE', r.status==='ERRO_SINTAXE' && /zero/i.test(r.erro||''));
r=fs.avaliarExpressao('NAO_EXISTE*2',V); t('serviço: tag inexistente -> TAG_INEXISTENTE', r.status==='TAG_INEXISTENTE' && /NAO_EXISTE/.test(r.erro||''));
// salvar com validação
const base={nome:'Teste',tagPath:'Calculadas.Teste',expressao:'PT_101*2',unidade:'bar',descricao:'d',autor:'a'};
let e1:any=null; try{ fs.salvarFormula({...base,expressao:"alert('x')"} as any);}catch(x:any){e1=x.message}
t('salvar fórmula com aspas é recusado com mensagem (antes: salvava e era descartada no reinício)', /Expressão/.test(e1||''));
e1=null; try{ fs.salvarFormula({...base,tagPath:'Calculadas.Pressão média'} as any);}catch(x:any){e1=x.message}
t('salvar tagPath com espaço/acento é recusado', /Caminho da tag/.test(e1||''));
const antes=fs.getFormulas().length;
const a=fs.salvarFormula({...base,nome:'A',tagPath:'Calculadas.A'} as any); const b=fs.salvarFormula({...base,nome:'B',tagPath:'Calculadas.B'} as any);
fs.excluirFormula(a.id); const c2=fs.salvarFormula({...base,nome:'C',tagPath:'Calculadas.C'} as any);
const ids=fs.getFormulas().map((f:any)=>f.id);
t('ids únicos mesmo após exclusões (antes: length+1 repetia id e sobrescrevia)', new Set(ids).size===ids.length && c2.id!==b.id);
const recarregado=JSON.parse(mem['purifywave_scada_formula_tags_v2']||'[]');
t('fórmula salva é recarregável pelo esquema (não some no reinício)', recarregado.some((f:any)=>f.id===c2.id));

// ===== proteção do servidor =====
const subir=(app:any)=>new Promise<{url:string,close:()=>Promise<void>}>(res=>{const s=app.listen(0,'127.0.0.1',()=>res({url:`http://127.0.0.1:${(s.address() as any).port}`,close:()=>new Promise<void>(r=>s.close(()=>r()))}))});
const app=express(); let chamadas=0; app.use('/ia',limitarTaxa({janelaMs:300,max:3}),(_q:any,s:any)=>{chamadas++;s.json({ok:true})});
const S=await subir(app);
const codigos:number[]=[]; for(let i=0;i<5;i++) codigos.push((await fetch(S.url+'/ia')).status);
t('limite de taxa: 3 passam, as demais 429 (e não chegam ao handler)', codigos.join()==='200,200,200,429,429' && chamadas===3);
const ra=(await fetch(S.url+'/ia')).headers.get('retry-after'); t('429 informa Retry-After', !!ra && Number(ra)>=1);
await new Promise(r=>setTimeout(r,350)); t('depois da janela volta a aceitar', (await fetch(S.url+'/ia')).status===200);
await S.close();
const v=(b:any)=>validarEntradaLaudo(b);
t('validação: corpo vazio/nulo/indefinido recusado', !v({}).ok && !v(null).ok && !v(undefined).ok);
t('validação: texto OK; texto não-string e texto gigante recusados', v({textoLaudo:'laudo'}).ok===true && !v({textoLaudo:123}).ok && !v({textoLaudo:'x'.repeat(200_001)}).ok);
t('validação: imagem OK com mime permitido (png/jpeg/webp/pdf)', ['image/png','image/jpeg','image/webp','application/pdf'].every(m=>v({imagemBase64:'AAAA',mimeType:m}).ok));
t('validação: mime perigoso/estranho recusado (html, svg, executável)', ['text/html','image/svg+xml','application/x-msdownload','x'].every(m=>!v({imagemBase64:'AAAA',mimeType:m}).ok));
t('validação: imagem não-string e acima de 20 MB recusadas', !v({imagemBase64:{a:1}}).ok && !v({imagemBase64:'A'.repeat(20*1024*1024+1)}).ok);
t('validação: mime ausente assume image/png', (v({imagemBase64:'AAAA'}) as any).entrada.mimeType==='image/png');

// ===== laudo: contradição de conformidade =====
const lp={numeroLaudo:'L1',dataColeta:'2026-03-10',conformidadePortaria888:true,parametros:[{nome:'Fluoreto',emConformidade:false},{nome:'pH',emConformidade:true}],parametrosChaveFteCdi:{fluoretoMgL:2.4,ph:7.2}};
const l1=montarLaudoDeOcr(lp,'a.png',0);
t('IA diz "conforme" mas há parâmetro NÃO conforme: conformidade vira null e laudo vai para revisão', l1.conformidadePortaria888===null && l1.statusSql==='PENDENTE_REVISAO' && (l1.camposAusentes||[]).some((c:string)=>/contradiz/.test(c)));
const l2=montarLaudoDeOcr({...lp,parametros:[{nome:'pH',emConformidade:true}]},'a.png',0);
t('REGRESSÃO: conforme e coerente continua SALVO', l2.conformidadePortaria888===true && l2.statusSql==='SALVO');
const l3=montarLaudoDeOcr({...lp,conformidadePortaria888:false},'a.png',0);
t('REGRESSÃO: "não conforme" com parâmetro não conforme é preservado (false)', l3.conformidadePortaria888===false && l3.statusSql==='SALVO');

// ===== notificações externas: honestas =====
const st=ext.getSettings();
t('padrões: tudo desabilitado e sem token/segredo/URL/destinatários de exemplo', !st.telegramHabilitado && !st.webhookHabilitado && !st.emailHabilitado && st.telegramBotToken==='' && st.webhookSecret==='' && st.webhookUrl==='' && st.destinatariosEmail.length===0);
t('sem histórico falso de envios nem contador inventado (14)', ext.getLogs().length===0 && st.totalNotificacoesEnviadas===0);
const logs=await ext.dispararNotificacaoManual('CRITICO','teste',['TELEGRAM','WEBHOOK','EMAIL']);
t('disparo é marcado SIMULADO e diz que nada foi enviado (antes: "HTTP 200 OK")', logs.length===3 && logs.every((l:any)=>l.status==='SIMULADO' && /Nada foi enviado/.test(l.detalhesResposta||'') && !/200 OK|SMTP 250/.test(l.detalhesResposta||'')));
t('contador de envios REAIS não aumenta com simulação', ext.getSettings().totalNotificacoesEnviadas===0);

console.warn=origWarn; console.error=origErr;
console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
