/**
 * Cálculos com proteção contra divisão por zero e dados inválidos (SCD-SEN-003).
 *
 * `a / b` com b = 0 dá Infinity (ou NaN se a também é 0). Isso tem efeitos opostos e igualmente ruins:
 *  - Infinity >= limite é verdadeiro: o debounce de breakthrough conta uma leitura que não existe;
 *  - NaN >= limite é falso: um breakthrough real passaria despercebido se o analisador de entrada falhasse.
 * Aqui, entrada inválida devolve null e quem chama decide (não contar, manter o último valor, alarmar).
 */

/** Abaixo disto o fluoreto de entrada é tratado como medição inválida/irrelevante para calcular razão e eficiência. */
export const FLUORETO_MIN_PARA_RAZAO_PPM = 0.1;

const valido = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** numerador / denominador, ou null se algum valor é inválido, negativo (numerador) ou o denominador é pequeno demais. */
export function razaoSegura(numerador: unknown, denominador: unknown, minDenominador = FLUORETO_MIN_PARA_RAZAO_PPM): number | null {
  if (!valido(numerador) || !valido(denominador)) return null;
  if (numerador < 0 || denominador < minDenominador) return null;
  const r = numerador / denominador;
  return Number.isFinite(r) ? r : null;
}

/** Eficiência de remoção em % = (entrada - saída) / entrada * 100, ou null se a entrada/saída é inválida. */
export function eficienciaSegura(entrada: unknown, saida: unknown): number | null {
  const r = razaoSegura(saida, entrada);
  return r === null ? null : (1 - r) * 100;
}
