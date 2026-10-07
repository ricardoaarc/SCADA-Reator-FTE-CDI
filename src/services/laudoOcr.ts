/**
 * Leitura de laudos por OCR/IA: chamada ao servidor, validação e montagem do laudo.
 *
 * Regra de ouro: NUNCA inventar dado de laudo. Campo que a IA não extraiu fica null/"(não informado)"
 * e o laudo vai para revisão (statusSql = 'PENDENTE_REVISAO'), sem entrar na série temporal nem ser
 * aplicado ao reator.
 *
 * Códigos: SCD-OCR-001 (arquivo ilegível / erro de rede ou HTTP / timeout),
 *          SCD-OCR-002 (sem dados extraídos ou laudo incompleto),
 *          SCD-OCR-003 (resposta da IA não é JSON válido).
 */

import { LaudoLaboratorial, ParametrosChaveFteCdi } from '../types';
import type { CodigoErro } from './errorCatalog';

// Os códigos vêm do catálogo central (errorCatalog.ts); o compilador recusa códigos inexistentes.
export type CodigoOcr = Extract<CodigoErro, 'SCD-OCR-001' | 'SCD-OCR-002' | 'SCD-OCR-003'>;

export class OcrError extends Error {
  constructor(public codigo: CodigoOcr, message: string) {
    super(message);
    this.name = 'OcrError';
  }
}

export interface FalhaOcr {
  arquivo: string;
  codigo: CodigoOcr;
  motivo: string;
}

export const OCR_TIMEOUT_MS = 60_000;
export const NAO_INFORMADO = '(não informado)';

/** Lê o arquivo como data URL. Rejeita em erro/abort (antes, o lote travava para sempre). */
export function lerArquivoComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string' && reader.result.length > 0
        ? resolve(reader.result)
        : reject(new OcrError('SCD-OCR-001', 'Arquivo vazio ou ilegível.'));
    reader.onerror = () => reject(new OcrError('SCD-OCR-001', 'Não foi possível ler o arquivo.'));
    reader.onabort = () => reject(new OcrError('SCD-OCR-001', 'Leitura do arquivo cancelada.'));
    reader.readAsDataURL(file);
  });
}

/** Chama o endpoint de OCR com timeout e verificação de status HTTP. Retorna `dados` da resposta. */
export async function chamarOcr(
  imagemBase64: string,
  mimeType: string,
  opcoes: { timeoutMs?: number; fetchFn?: typeof fetch } = {}
): Promise<unknown> {
  const { timeoutMs = OCR_TIMEOUT_MS, fetchFn = fetch } = opcoes;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetchFn('/api/gemini/analisar-laudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64, mimeType }),
        signal: controller.signal,
      });
    } catch (err) {
      const abortou = controller.signal.aborted;
      throw new OcrError(
        'SCD-OCR-001',
        abortou ? `Tempo esgotado (${Math.round(timeoutMs / 1000)} s) aguardando o OCR.` : `Falha de rede: ${(err as Error)?.message ?? err}`
      );
    }

    let corpo: any = null;
    try {
      corpo = await res.json();
    } catch {
      /* corpo inválido tratado abaixo */
    }

    if (!res.ok || !corpo || corpo.sucesso !== true) {
      const codigo: CodigoOcr = corpo?.codigo === 'SCD-OCR-003' ? 'SCD-OCR-003' : 'SCD-OCR-001';
      throw new OcrError(codigo, corpo?.erro || `Servidor respondeu HTTP ${res.status}.`);
    }
    if (!corpo.dados || typeof corpo.dados !== 'object') {
      throw new OcrError('SCD-OCR-002', 'A resposta do OCR não trouxe dados.');
    }
    return corpo.dados;
  } finally {
    clearTimeout(timer);
  }
}

/** Converte número ou texto numérico ("1,40") em number; qualquer outra coisa vira null. */
function numeroOuNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && /^\s*-?\d+([.,]\d+)?\s*$/.test(v)) return Number(v.replace(',', '.'));
  return null;
}

function textoOuNaoInformado(v: unknown): string {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : NAO_INFORMADO;
}

const CHAVES: (keyof ParametrosChaveFteCdi)[] = [
  'fluoretoMgL', 'ph', 'condutividadeUsCm', 'stdMgL', 'cloretosMgL', 'sulfatosMgL',
  'nitratosMgL', 'ferroMgL', 'durezaMgL', 'coliformesUfc100ml', 'dboMgL',
];

/**
 * Monta o laudo a partir da resposta da IA sem preencher lacunas com valores inventados.
 * Lança OcrError SCD-OCR-002 se nada útil foi extraído.
 */
export function montarLaudoDeOcr(dadosBrutos: unknown, nomeArquivo: string, indice: number): LaudoLaboratorial {
  const d: any = dadosBrutos && typeof dadosBrutos === 'object' ? dadosBrutos : {};
  const brutoChave: any = d.parametrosChaveFteCdi && typeof d.parametrosChaveFteCdi === 'object' ? d.parametrosChaveFteCdi : {};

  const chave = {} as ParametrosChaveFteCdi;
  CHAVES.forEach(k => { chave[k] = numeroOuNull(brutoChave[k]); });

  const parametros = Array.isArray(d.parametros) ? d.parametros : [];
  const algumaChave = CHAVES.some(k => chave[k] !== null);

  if (parametros.length === 0 && !algumaChave) {
    throw new OcrError('SCD-OCR-002', 'Nenhum parâmetro foi extraído do laudo.');
  }

  const dataColetaValida = typeof d.dataColeta === 'string' && !isNaN(new Date(d.dataColeta).getTime());
  const numeroOk = typeof d.numeroLaudo === 'string' && d.numeroLaudo.trim() !== '';
  let conformidade = typeof d.conformidadePortaria888 === 'boolean' ? d.conformidadePortaria888 : null;

  const camposAusentes: string[] = [];
  // A conclusão de conformidade vem da IA. "Conforme" com algum parâmetro marcado não conforme é contradição
  // (erro de leitura ou texto malicioso no laudo): nunca aceitar como conforme, mandar para revisão.
  if (conformidade === true && parametros.some((p: any) => p && p.emConformidade === false)) {
    conformidade = null;
    camposAusentes.push('conformidadePortaria888 (contradiz parâmetros não conformes)');
  }
  if (!numeroOk) camposAusentes.push('numeroLaudo');
  if (!dataColetaValida) camposAusentes.push('dataColeta');
  if (chave.fluoretoMgL === null) camposAusentes.push('fluoretoMgL');
  if (chave.ph === null) camposAusentes.push('ph');
  if (conformidade === null && !camposAusentes.some(c => c.startsWith('conformidadePortaria888'))) camposAusentes.push('conformidadePortaria888');
  if (parametros.length === 0) camposAusentes.push('parametros');

  const recomendacoes: string[] = Array.isArray(d.recomendacoesOperacionais)
    ? d.recomendacoesOperacionais.filter((r: unknown) => typeof r === 'string' && r.trim() !== '')
    : [];
  const pendente = camposAusentes.length > 0;
  if (pendente) {
    recomendacoes.unshift(`[SCD-OCR-002] Laudo incompleto, revisar manualmente: ${camposAusentes.join(', ')}.`);
  }

  const base = nomeArquivo.replace(/\.[^.]+$/, '').slice(0, 20);

  return {
    id: `batch-${Date.now()}-${indice}`,
    numeroLaudo: numeroOk ? d.numeroLaudo.trim() : `SEM-NUMERO-${base}`,
    laboratorio: textoOuNaoInformado(d.laboratorio),
    solicitante: textoOuNaoInformado(d.solicitante),
    matriz: textoOuNaoInformado(d.matriz),
    localColeta: textoOuNaoInformado(d.localColeta),
    dataColeta: dataColetaValida ? d.dataColeta : '',
    dataEmissao: textoOuNaoInformado(d.dataEmissao),
    responsavelTecnico: textoOuNaoInformado(d.responsavelTecnico),
    conclusaoGeral: textoOuNaoInformado(d.conclusaoGeral),
    conformidadePortaria888: conformidade,
    parametros,
    parametrosChaveFteCdi: chave,
    recomendacoesOperacionais: recomendacoes,
    statusSql: pendente ? 'PENDENTE_REVISAO' : 'SALVO',
    camposAusentes: pendente ? camposAusentes : undefined,
  };
}

/** Converte qualquer erro em uma falha padronizada para exibição ao operador. */
export function normalizarFalha(arquivo: string, err: unknown): FalhaOcr {
  if (err instanceof OcrError) return { arquivo, codigo: err.codigo, motivo: err.message };
  return { arquivo, codigo: 'SCD-OCR-001', motivo: err instanceof Error ? err.message : String(err) };
}

/** Texto final do lote, sem afirmar sucesso quando houve falhas ou laudos em revisão. */
export function resumoDoLote(total: number, salvos: number, pendentes: number, falhas: FalhaOcr[]): string {
  const partes = [`Lote de ${total} arquivo(s): ${salvos} salvo(s)`];
  if (pendentes > 0) partes.push(`${pendentes} para revisão manual (dados incompletos)`);
  if (falhas.length > 0) {
    const lista = falhas.slice(0, 3).map(f => `${f.arquivo} [${f.codigo}]`).join(', ');
    partes.push(`${falhas.length} com falha: ${lista}${falhas.length > 3 ? '…' : ''}`);
  }
  return partes.join('; ') + '.';
}
