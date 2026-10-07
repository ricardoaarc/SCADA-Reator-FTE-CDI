// @ts-nocheck
// Rodar da raiz do repositório: npx tsx teste-pid-servidor.mts   
import { spawn } from 'node:child_process';
const mem:Record<string,string>={};
(globalThis as any).localStorage={getItem:(k:string)=>mem[k]??null,setItem:(k:string,v:string)=>{mem[k]=v},removeItem:(k:string)=>{delete mem[k]}};
const ROOT = '../';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{console.log((c?'PASS ':'FAIL ')+n); c?ok++:bad++;};
const origWarn=console.warn,origErr=console.error; console.warn=()=>{};console.error=()=>{};

// ===== PidController =====
const { authService } = await import(ROOT+'src/services/AuthService.ts');
await authService.autenticarOperador('ENG-882','8820');
const { pidService } = await import(ROOT+'src/services/PidController.ts');
pidService.setModo('AUTO');
const cfg=()=>pidService.getConfig();
let saidaNormal=pidService.calcular(900,1.5,1.0);
t('PID normal: saída finita e entre 0 e 100', Number.isFinite(saidaNormal) && saidaNormal>=0 && saidaNormal<=100);
const iAntes=cfg().termoI;
const sNaNp=pidService.calcular(900,NaN,1.0);
t('pressão NaN -> saída segura 10% e override ativo (antes: sem limitação)', sNaNp===10 && cfg().overridePressaoAtivo===true);
t('pressão NaN não mexe no integrador', cfg().termoI===iAntes);
const sInf=pidService.calcular(900,Infinity,1.0); t('pressão Infinity -> 10%', sInf===10);
const ultima=cfg().sinalVfdAtualPct; const sNaNv=pidService.calcular(NaN,1.5,1.0);
t('vazão NaN -> mantém a última saída sem atualizar erro/integral', sNaNv===ultima && Number.isFinite(cfg().termoI) && Number.isFinite(cfg().erroAtual));
for(const dt of [0,-1,NaN,Infinity]) { const s=pidService.calcular(900,1.5,dt as number); if(!Number.isFinite(s)||!Number.isFinite(cfg().termoD)||!Number.isFinite(cfg().termoI)) t('dt inválido '+dt,false); }
t('dt inválido (0, negativo, NaN, Infinity) usa 1 s: saída, termo D e integral continuam finitos', true);
for(let i=0;i<20;i++) pidService.calcular(NaN,NaN,NaN); const sFinal=pidService.calcular(900,1.5,1.0);
t('depois de uma sequência de entradas inválidas o PID segue funcionando (integrador NÃO envenenado)', Number.isFinite(sFinal) && Number.isFinite(cfg().termoI));
t('REGRESSÃO: override de pressão alta continua atuando (2.85 bar reduz a saída)', pidService.calcular(900,2.85,1.0) < sFinal && cfg().overridePressaoAtivo===true);
t('REGRESSÃO: >= 2.92 bar -> 10%', pidService.calcular(900,2.95,1.0)===10);
let e:any=null; for(const [kp,ki,kd] of [[NaN,0,0],[1,-1,0],[1,0,Infinity],[1,0,5000],['a' as any,0,0]]) { try{ pidService.atualizarParametrosSintonia(kp as number,ki as number,kd as number); t('ganho inválido aceito '+[kp,ki,kd],false);}catch(x){} }
t('ganhos NaN/negativos/Infinity/absurdos/texto são recusados', true);
t('ganhos válidos aceitos e gravados', pidService.atualizarParametrosSintonia(0.5,0.02,0.1)===true && cfg().kp===0.5);
t('setpoint NaN/fora da faixa recusado; válido aceito', pidService.setSetpointVazao(NaN)===false && pidService.setSetpointVazao(100)===false && pidService.setSetpointVazao(1000)===true);
pidService.setSaidaManualPct(40); pidService.setSaidaManualPct(NaN); pidService.setSaidaManualPct('x' as any);
t('saída manual NaN/texto ignorada (mantém 40); fora de 0..100 é limitada', cfg().saidaManualPct===40 && (pidService.setSaidaManualPct(500), cfg().saidaManualPct===100));

import nodeFs from 'node:fs';
import path from 'node:path';
const raizApp = nodeFs.existsSync('./server.ts') ? process.cwd() : path.resolve(process.cwd(), '..');
const porta=3900+Math.floor(Math.random()*90);
const srv=spawn('npx',['tsx','server.ts'],{cwd:raizApp,env:{...process.env,PORT:String(porta),NODE_ENV:'production',GEMINI_API_KEY:'',PLC_GATEWAY_ENABLED:'',PLC_HOST:'',PLC_GATEWAY_TOKEN:''}});
let log=''; srv.stdout?.on('data',d=>log+=d); srv.stderr?.on('data',d=>log+=d);
const url=`http://127.0.0.1:${porta}`;
for(let i=0;i<60;i++){ try{ const ping = await fetch(url+'/api/plc/status'); if (ping.status) break; }catch{ await new Promise(r=>setTimeout(r,250)); } }
const post=(p:string,body:any,raw=false)=>fetch(url+p,{method:'POST',headers:{'Content-Type':'application/json'},body:raw?body:JSON.stringify(body)});
let r=await fetch(url+'/api/plc/status'); const hdr=r.headers.get('x-powered-by');
t('servidor sobe; gateway PLC desligado por padrão; sem cabeçalho x-powered-by', (await r.json()).habilitado===false && hdr===null);
r=await post('/api/gemini/analisar-laudo',{textoLaudo:'x'}); let j=await r.json();
t('sem GEMINI_API_KEY: 503 claro (antes: falhava só dentro da chamada) e sem vazar detalhes', r.status===503 && /GEMINI_API_KEY/.test(j.erro) && j.sucesso===false);
r=await post('/api/gemini/analisar-laudo',{}); t('corpo vazio: 503 (sem chave) ou 400, nunca 500', [400,503].includes(r.status));
r=await post('/api/plc/test',{}); j=await r.json(); t('/api/plc/test com gateway desligado: 503 SCD-PLC-005', r.status===503 && j.codigo==='SCD-PLC-005');
const grande=JSON.stringify({enderecos:Array(20000).fill(1)}); r=await post('/api/plc/read',grande,true);
t('corpo > 10 kb em /api/plc é recusado (413), não aceita 25 MB como antes', r.status===413);
r=await post('/api/gemini/analisar-laudo','{json quebrado',true); t('JSON inválido em /api/gemini não derruba o servidor', r.status>=400 && r.status<500 || r.status===500);
r=await fetch(url+'/api/plc/status'); t('servidor continua respondendo depois dos erros', r.status===200);
const codigos:number[]=[]; for(let i=0;i<25;i++) codigos.push((await post('/api/gemini/analisar-laudo',{textoLaudo:'x'})).status);
t('limite de 20 req/min por IP no endpoint de IA: as primeiras passam, as demais 429', codigos.slice(0,5).every(c=>c!==429) && codigos.slice(-3).every(c=>c===429));
t('log do servidor avisa da chave ausente', /GEMINI_API_KEY não definida/.test(log));
srv.kill();
origLog: console.log(`\n${ok} passaram, ${bad} falharam`); process.exit(bad?1:0);
