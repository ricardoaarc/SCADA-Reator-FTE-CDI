/**
 * Hash de PIN/senha: PBKDF2-HMAC-SHA256 com sal aleatório por usuário (Web Crypto).
 *
 * Formato armazenado: `pbkdf2-sha256$<iterações>$<sal base64>$<hash base64>`
 * As iterações vão junto do hash, então dá para aumentá-las no futuro (precisaRehash) sem invalidar PINs antigos.
 *
 * LIMITES (leia): isto impede que o PIN apareça em texto puro no localStorage, em telas ou em logs, e
 * encarece cada tentativa de adivinhação. Mas um PIN curto (4 a 6 dígitos) continua adivinhável por força bruta
 * OFFLINE por quem copiar o localStorage, mesmo com PBKDF2. Autenticação de verdade tem que ficar no servidor.
 *
 * Exige Web Crypto (crypto.subtle), que só existe em contextos seguros (HTTPS ou localhost).
 * Sem ela, falha de forma FECHADA (SCD-AUT-002): nunca libera acesso.
 */

import { ScadaError } from './errorCatalog';

export const ITERACOES_PADRAO = 600_000; // recomendação OWASP (2023) para PBKDF2-HMAC-SHA256
const ITERACOES_MAX_ACEITAS = 2_000_000; // evita travar o navegador com um valor adulterado no armazenamento
const FORMATO = /^pbkdf2-sha256\$(\d{4,8})\$([A-Za-z0-9+/]+={0,2})\$([A-Za-z0-9+/]+={0,2})$/;

const FRACOS = new Set(['0000', '1111', '1234', '4321', '12345', '123456', '000000', '111111', 'admin', 'senha', 'password']);

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new ScadaError('SCD-AUT-002');
  return s;
}

const paraB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const deB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function derivar(pin: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number): Promise<Uint8Array> {
  const chave = await subtle().importKey('raw', new TextEncoder().encode(pin.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, chave, 256);
  return new Uint8Array(bits);
}

/** Comparação em tempo constante (não vaza em qual byte começa a diferença). */
function iguais(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

/** Regras mínimas de PIN. Retorna a mensagem do problema, ou null se aceito. */
export function validarPoliticaPin(pin: unknown): string | null {
  if (typeof pin !== 'string') return 'Informe o PIN.';
  if (pin.length < 4) return 'O PIN precisa ter pelo menos 4 caracteres.';
  if (pin.length > 64) return 'O PIN pode ter no máximo 64 caracteres.';
  if (FRACOS.has(pin.toLowerCase())) return 'PIN fraco demais (sequência ou valor comum). Escolha outro.';
  if (/^(.)\1+$/.test(pin)) return 'PIN fraco demais (caracteres repetidos). Escolha outro.';
  return null;
}

/** Web Crypto disponível? (false em HTTP fora de localhost) */
export const criptografiaDisponivel = (): boolean => !!globalThis.crypto?.subtle;

export const ehHashPin = (v: unknown): v is string => typeof v === 'string' && FORMATO.test(v);

export async function hashPin(pin: string, iteracoes: number = ITERACOES_PADRAO): Promise<string> {
  subtle(); // sem Web Crypto: SCD-AUT-002 (e não um TypeError obscuro)
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const h = await derivar(pin, sal, iteracoes);
  return `pbkdf2-sha256$${iteracoes}$${paraB64(sal)}$${paraB64(h)}`;
}

/** true somente se o PIN confere. Formato inválido ou iterações absurdas = false (nunca lança por dado ruim). */
export async function verificarPin(pin: string, armazenado: unknown): Promise<boolean> {
  if (typeof pin !== 'string' || typeof armazenado !== 'string') return false;
  const m = FORMATO.exec(armazenado);
  if (!m) return false;
  const iteracoes = Number(m[1]);
  if (iteracoes < 1000 || iteracoes > ITERACOES_MAX_ACEITAS) return false;
  let sal: Uint8Array<ArrayBuffer>, esperado: Uint8Array;
  try { sal = deB64(m[2]); esperado = deB64(m[3]); } catch { return false; }
  return iguais(await derivar(pin, sal, iteracoes), esperado);
}

/** O hash foi gerado com menos iterações que o padrão atual? Então vale regravar após um login correto. */
export function precisaRehash(armazenado: string): boolean {
  const m = FORMATO.exec(armazenado);
  return !m || Number(m[1]) < ITERACOES_PADRAO;
}
