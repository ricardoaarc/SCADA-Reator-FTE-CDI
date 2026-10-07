/**
 * Handlers globais de erro do navegador (SCD-UI-002).
 *
 * Captura exceções fora da renderização React (timers, eventos, Promises sem .catch), que o
 * ErrorBoundary não enxerga. Registra no console e como alarme, com limite de 1 por 30 s por mensagem
 * para não inundar a lista quando o erro se repete.
 */

import { dbInstance } from './database';
import { comCodigo } from './errorCatalog';
import { integridadeDados } from './storageSeguro';

/** Cada problema de dados salvo (SCD-DAT-001/002) também vira alarme na lista do SCADA. */
export function instalarAlarmesDeIntegridade(): () => void {
  return integridadeDados.aoRegistrar(p => {
    try {
      dbInstance.inserirAlarme('ALERTA', comCodigo(p.codigo, `${p.rotulo}: ${p.motivo}`), null, p.codigo);
    } catch (e) {
      console.error('Não foi possível gravar o alarme de integridade de dados:', e);
    }
  });
}

const IGNORAR = [
  /ResizeObserver loop/i, // aviso benigno de layout, não é falha
  /WebSocket/i,           // aviso de conexão HMR em ambiente sem WebSocket
  /vite/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /Load failed/i,
  /AbortError/i,
  /aborted/i,
  /canceled/i,
  /connection.*closed/i,
  /connection.*failed/i,
  /HMR/i,
];
const INTERVALO_MS = 30_000;

export function instalarHandlersGlobais(alvo: Pick<Window, 'addEventListener' | 'removeEventListener'> = window): () => void {
  const ultimos = new Map<string, number>();

  const registrar = (origem: string, erro: unknown) => {
    if (!erro) return;

    // Se for um DOM Event puro (ex.: erro de WebSocket / carregamento de asset) sem mensagem explícita, ignora
    if (typeof Event !== 'undefined' && erro instanceof Event) {
      const detalhe = (erro as any).error || (erro as any).message;
      if (!detalhe) return;
      erro = detalhe;
    }

    let mensagem = erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : '';
    if (!mensagem && typeof erro === 'object' && erro !== null) {
      try {
        const json = JSON.stringify(erro);
        if (json && json !== '{}') mensagem = json;
      } catch {
        mensagem = String(erro);
      }
    }

    if (!mensagem || mensagem.trim() === '' || mensagem === '{}' || mensagem === 'undefined' || mensagem === 'null' || IGNORAR.some(r => r.test(mensagem))) {
      return;
    }

    console.error(`[SCD-UI-002] ${origem}: ${mensagem}`, erro);

    const chave = mensagem.slice(0, 200);
    const agora = Date.now();
    if (agora - (ultimos.get(chave) ?? 0) < INTERVALO_MS) return;
    ultimos.set(chave, agora);

    try {
      dbInstance.inserirAlarme('ALERTA', comCodigo('SCD-UI-002', `${origem}: ${mensagem}`), null, 'SCD-UI-002');
    } catch (e) {
      console.error('Não foi possível gravar o alarme SCD-UI-002:', e);
    }
  };

  const onError = (ev: Event) => {
    const e = ev as ErrorEvent;
    if (!e.error && !e.message) return; // falha de carregamento de recurso (imagem etc.), não exceção
    registrar('Erro não tratado', e.error ?? e.message);
  };
  const onRejection = (ev: Event) => {
    const r = (ev as PromiseRejectionEvent).reason;
    if (!r) return; // rejeição vazia sem motivo (cancelamento benigno ou sem dados)
    registrar('Promise rejeitada sem tratamento', r);
  };

  alvo.addEventListener('error', onError);
  alvo.addEventListener('unhandledrejection', onRejection);
  return () => {
    alvo.removeEventListener('error', onError);
    alvo.removeEventListener('unhandledrejection', onRejection);
  };
}
