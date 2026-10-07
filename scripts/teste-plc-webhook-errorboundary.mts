// @ts-nocheck
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; }
};

const R = '../src/services/';
const { plcService } = await import(R + 'PlcService.ts');
const { PlcTransportError } = await import(R + 'plcTransport.ts');
const { dbInstance } = await import(R + 'database.ts');
const { authService } = await import(R + 'AuthService.ts');
const { NotificationService } = await import(R + 'NotificationService.ts');

let ok = 0, bad = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? 'PASS ' : 'FAIL ') + n);
  if (c) ok++; else bad++;
};

const alarmes = () => dbInstance.alarmesList.map((a: any) => a.mensagem).join('\n');
const cfg = () => plcService.getConfig();

plcService.parar();
plcService.definirTimeoutMs(600);

const origErr = console.error, origWarn = console.warn;
console.error = () => {};
console.warn = () => {};

// ===== A2 =====
let r: any = await plcService.testarPingConexao();
t('simulador: ping ok e mensagem honesta (não diz "socket TCP")', r.sucesso && /Simulador/.test(r.mensagem) && !/Socket TCP/.test(r.mensagem));

const errosAntes = cfg().errosComunicacao;
plcService.transporteSimulado.falhaInjetada = 'TIMEOUT';
r = await plcService.testarPingConexao();
t('timeout -> SCD-PLC-001, status ERRO_TIMEOUT', !r.sucesso && r.codigo === 'SCD-PLC-001' && cfg().status === 'ERRO_TIMEOUT');
t('errosComunicacao agora é contado (antes: nunca)', cfg().errosComunicacao === errosAntes + 1);

plcService.transporteSimulado.falhaInjetada = 'RECUSADA';
r = await plcService.testarPingConexao();
t('recusada -> SCD-PLC-002, status DESCONECTADO', r.codigo === 'SCD-PLC-002' && cfg().status === 'DESCONECTADO');

plcService.transporteSimulado.falhaInjetada = null;
r = await plcService.testarPingConexao();
t('recupera -> CONECTADO', r.sucesso && cfg().status === 'CONECTADO');

// escrita: motivos distintos
let w = await plcService.escreverRegistrador(99999, true);
t('registrador inexistente -> SCD-PLC-003', !w.ok && w.codigo === 'SCD-PLC-003');

w = await plcService.escreverRegistrador(40001, 5);
t('somente leitura -> SCD-PLC-004', !w.ok && w.codigo === 'SCD-PLC-004');

w = await plcService.escreverRegistrador(4, 123 as any);
t('coil com número -> SCD-PLC-006', !w.ok && w.codigo === 'SCD-PLC-006');

w = await plcService.escreverRegistrador(4, true);
t('escrita válida no simulador -> ok e valor muda', w.ok && cfg().mapaRegistradores[4].valor === true);
await plcService.escreverRegistrador(4, false);

// modo CLP real
plcService.definirTimeoutMs(60);
authService.trocarOperador('op-2');
let podeComutar = true;
try {
  plcService.setModoFonteDados('CLP_REAL');
} catch (e: any) {
  podeComutar = false;
}

if (!podeComutar) {
  console.log('SKIP (usuário sem permissão para comutar)');
} else {
  t('CLP_REAL nunca herda CONECTADO do simulador', cfg().status !== 'CONECTADO');
  await new Promise(res => setTimeout(res, 120));
  t('CLP_REAL sem driver -> DESCONECTADO + qualidade RUIM', cfg().status === 'DESCONECTADO' && plcService.getQualidadeDados() === 'RUIM');
  t('alarme crítico SCD-PLC-005 gerado', /\[SCD-PLC-005\]/.test(alarmes()));

  const n1 = dbInstance.alarmesList.filter((a: any) => a.mensagem.includes('SCD-PLC-005')).length;
  await plcService.verificarConexao();
  await plcService.verificarConexao();
  const n2 = dbInstance.alarmesList.filter((a: any) => a.mensagem.includes('SCD-PLC-005')).length;
  t('sem spam: mesma falha não gera novo alarme', n1 === n2);

  const valorAntes = cfg().mapaRegistradores[1].valor;
  w = await plcService.escreverRegistrador(1, !valorAntes);
  t('escrita em CLP real sem driver falha (antes: fingia sucesso)', !w.ok && w.codigo === 'SCD-PLC-005');
  t('valor local NÃO muda sem confirmação do CLP', cfg().mapaRegistradores[1].valor === valorAntes);

  // driver real plugado
  let chamadas = 0;
  plcService.definirTransporteReal({
    testarConexao: async () => ({ latenciaMs: 7 }),
    escrever: async () => { chamadas++; }
  });
  r = await plcService.verificarConexao();
  t('driver real ok -> CONECTADO, qualidade BOA', r.sucesso && cfg().status === 'CONECTADO' && plcService.getQualidadeDados() === 'BOA');
  t('alarme de recuperação emitido', /restabelecida/.test(alarmes()));

  w = await plcService.escreverRegistrador(1, !valorAntes);
  t('escrita confirmada muda o valor', w.ok && chamadas === 1 && cfg().mapaRegistradores[1].valor === !valorAntes);

  plcService.definirTransporteReal({
    testarConexao: async () => { throw new PlcTransportError('SCD-PLC-001', 'x'); },
    escrever: async (_e: any, _r: any, _v: any, sig: AbortSignal) =>
      new Promise((_, rej) => sig.addEventListener('abort', () => rej(new Error('abortado'))))
  });
  w = await plcService.escreverRegistrador(1, valorAntes);
  t('escrita com CLP mudo -> timeout SCD-PLC-001, valor inalterado', !w.ok && w.codigo === 'SCD-PLC-001' && cfg().mapaRegistradores[1].valor === !valorAntes);

  plcService.setModoFonteDados('SIMULADOR');
  t('volta ao simulador -> CONECTADO', cfg().status === 'CONECTADO');
}

// listener com defeito não derruba os outros
let recebeu = 0;
const u1 = plcService.subscribe(() => {
  if (recebeu >= 1) throw new Error('listener ruim');
  recebeu++;
});
let ok2 = 0;
const u2 = plcService.subscribe(() => { ok2++; });
await plcService.verificarConexao();
t('listener com defeito não impede os demais', ok2 >= 2);
u1();
u2();

// ===== M1 webhook =====
const ns: any = new NotificationService();
ns.atualizarConfig({
  webhookHabilitado: true,
  webhookUrl: 'https://exemplo.test/hook',
  pushHabilitado: false,
  somSireneHabilitado: false,
  emailHabilitado: false
});
ns.configurarEntregaWebhook({ tentativas: 3, backoffBaseMs: 1, timeoutMs: 50 });

const disparar = (m: string) => ns.dispararAlertaInterlock({
  motivo: m,
  pressaoBar: 2.9,
  vazaoLh: 0,
  tensaoV: 0,
  correnteA: 0,
  isTeste: true
});
const aguardar = async (f: () => boolean, ms = 800) => {
  const t0 = Date.now();
  while (!f() && Date.now() - t0 < ms) await new Promise(res => setTimeout(res, 5));
};
const realFetch = globalThis.fetch;

// a) 500 sempre
let n = 0;
(globalThis as any).fetch = async (u: any, o: any) => {
  if (String(u).includes('exemplo.test')) {
    n++;
    return { ok: false, status: 500 } as any;
  }
  return realFetch ? realFetch(u, o) : { ok: true, status: 200 } as any;
};
let a = disparar('teste-500');
await aguardar(() => a.statusEnvio === 'FALHA');
t('HTTP 500 x3 -> 3 tentativas', n === 3);
t('alerta marcado FALHA com SCD-NOT-001', a.statusEnvio === 'FALHA' && /SCD-NOT-001/.test(a.falhaEntrega || ''));
t('alarme crítico SCD-NOT-001 registrado', /\[SCD-NOT-001\]/.test(alarmes()));

// b) falha 2x, sucesso na 3a
n = 0;
(globalThis as any).fetch = async (u: any, o: any) => {
  if (String(u).includes('exemplo.test')) {
    n++;
    if (n < 3) throw new Error('ECONNRESET');
    return { ok: true, status: 200 } as any;
  }
  return realFetch ? realFetch(u, o) : { ok: true, status: 200 } as any;
};
a = disparar('teste-retry');
await aguardar(() => n >= 3);
await new Promise(res => setTimeout(res, 20));
t('retry recupera na 3ª tentativa sem marcar falha', n === 3 && a.statusEnvio !== 'FALHA');

// c) timeout (fetch pendurado)
n = 0;
(globalThis as any).fetch = (u: any, o: any) => {
  if (String(u).includes('exemplo.test')) {
    n++;
    return new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))));
  }
  return realFetch ? realFetch(u, o) : Promise.resolve({ ok: true, status: 200 } as any);
};
a = disparar('teste-timeout');
await aguardar(() => a.statusEnvio === 'FALHA', 1500);
t('fetch pendurado -> timeout por tentativa e FALHA', a.statusEnvio === 'FALHA' && /tempo esgotado/.test(a.falhaEntrega || ''));

// d) sucesso de primeira
n = 0;
(globalThis as any).fetch = async (u: any, o: any) => {
  if (String(u).includes('exemplo.test')) {
    n++;
    return { ok: true, status: 200 } as any;
  }
  return realFetch ? realFetch(u, o) : { ok: true, status: 200 } as any;
};
a = disparar('teste-ok');
await new Promise(res => setTimeout(res, 30));
t('sucesso de primeira: 1 chamada, sem falha', n === 1 && a.statusEnvio !== 'FALHA' && !a.falhaEntrega);
globalThis.fetch = realFetch;

// ===== M2 ErrorBoundary + handlers =====
const { JSDOM } = await import('jsdom');
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  Event: dom.window.Event
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import('react')).default;
const { act } = React as any;
const { createRoot } = await import('react-dom/client');
const { ErrorBoundary } = await import('../src/components/ErrorBoundary.tsx');
const h = React.createElement;

let explodir = true;
const Quebra = () => {
  if (explodir) throw new Error('painel quebrou');
  return h('p', { id: 'ok' }, 'painel ok');
};

const root = createRoot(document.getElementById('root')!);
await act(async () => {
  root.render(h('div', null, h('nav', { id: 'nav' }, 'menu'), h(ErrorBoundary, { nome: 'Teste' }, h(Quebra))));
});

t('painel quebrado mostra aviso SCD-UI-001 (não tela em branco)', /SCD-UI-001/.test(document.body.textContent || '') && /painel quebrou/.test(document.body.textContent || ''));
t('resto da tela (menu) continua montado', !!document.getElementById('nav'));
await new Promise(res => setTimeout(res, 20));
t('alarme SCD-UI-001 registrado', /\[SCD-UI-001\]/.test(alarmes()));

explodir = false;
await act(async () => {
  (document.querySelector('button') as HTMLButtonElement).click();
});
t('"Tentar novamente" recupera o painel', !!document.getElementById('ok'));
await act(async () => { root.unmount(); });

const { instalarHandlersGlobais } = await import(R + 'globalErrorHandlers.ts');
const off = instalarHandlersGlobais(dom.window as any);
const antes = dbInstance.alarmesList.filter((x: any) => x.mensagem.includes('SCD-UI-002')).length;

dom.window.dispatchEvent(Object.assign(new dom.window.Event('unhandledrejection'), { reason: new Error('promessa perdida') }));
dom.window.dispatchEvent(Object.assign(new dom.window.Event('unhandledrejection'), { reason: new Error('promessa perdida') }));
dom.window.dispatchEvent(Object.assign(new dom.window.Event('error'), { message: 'ResizeObserver loop completed with undelivered notifications.', error: undefined }));
dom.window.dispatchEvent(Object.assign(new dom.window.Event('error'), { message: 'boom global', error: new Error('boom global') }));

const depois = dbInstance.alarmesList.filter((x: any) => x.mensagem.includes('SCD-UI-002'));
t('unhandledrejection gera 1 alarme SCD-UI-002 (repetição limitada)', depois.filter((x: any) => x.mensagem.includes('promessa perdida')).length === 1);
t('erro global gera alarme; ResizeObserver é ignorado', depois.some((x: any) => x.mensagem.includes('boom global')) && !depois.some((x: any) => /ResizeObserver/.test(x.mensagem)) && depois.length - antes === 2);
off();

console.error = origErr;
console.warn = origWarn;

console.log(`\n${ok} passaram, ${bad} falharam`);
process.exit(bad > 0 ? 1 : 0);
