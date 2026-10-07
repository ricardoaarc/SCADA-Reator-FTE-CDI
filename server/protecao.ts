/**
 * Proteções do servidor para endpoints que gastam dinheiro ou recursos (ex.: IA Gemini):
 * limite de requisições por IP e validação das entradas. Sem dependências externas.
 *
 * Limite: o contador fica em memória deste processo (reinicia ao reiniciar o servidor e não é compartilhado entre
 * várias instâncias). Atrás de proxy reverso, configure `app.set('trust proxy', ...)` para o IP real aparecer em req.ip.
 */

import type { Request, Response, NextFunction } from 'express';

export function limitarTaxa(opcoes: { janelaMs: number; max: number }) {
  const acessos = new Map<string, { inicio: number; n: number }>();

  // Limpeza periódica para o mapa não crescer sem limite
  const faxina = setInterval(() => {
    const agora = Date.now();
    for (const [ip, a] of acessos) if (agora - a.inicio > opcoes.janelaMs) acessos.delete(ip);
  }, Math.max(1000, opcoes.janelaMs));
  (faxina as any).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'desconhecido';
    const agora = Date.now();
    const a = acessos.get(ip);
    if (!a || agora - a.inicio > opcoes.janelaMs) {
      acessos.set(ip, { inicio: agora, n: 1 });
      return next();
    }
    a.n += 1;
    if (a.n > opcoes.max) {
      const esperaS = Math.ceil((a.inicio + opcoes.janelaMs - agora) / 1000);
      res.setHeader('Retry-After', String(esperaS));
      return res.status(429).json({ sucesso: false, erro: `Muitas requisições. Tente novamente em ${esperaS} s.` });
    }
    next();
  };
}

export const MIME_LAUDO_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;
export const MAX_IMAGEM_BASE64 = 20 * 1024 * 1024; // caracteres (~15 MB de arquivo)
export const MAX_TEXTO_LAUDO = 200_000;

export interface EntradaLaudo {
  textoLaudo?: string;
  imagemBase64?: string;
  mimeType: string;
}

/** Valida o corpo de /api/gemini/analisar-laudo. Retorna a entrada limpa ou a mensagem do problema. */
export function validarEntradaLaudo(body: any): { ok: true; entrada: EntradaLaudo } | { ok: false; erro: string } {
  const { textoLaudo, imagemBase64, mimeType } = body ?? {};
  if (textoLaudo !== undefined && typeof textoLaudo !== 'string') return { ok: false, erro: '"textoLaudo" deve ser texto.' };
  if (imagemBase64 !== undefined && typeof imagemBase64 !== 'string') return { ok: false, erro: '"imagemBase64" deve ser texto base64.' };
  if (!textoLaudo && !imagemBase64) return { ok: false, erro: 'Forneça o texto ou a imagem/PDF do laudo para análise.' };
  if (textoLaudo && textoLaudo.length > MAX_TEXTO_LAUDO) return { ok: false, erro: `Texto do laudo acima de ${MAX_TEXTO_LAUDO} caracteres.` };
  if (imagemBase64 && imagemBase64.length > MAX_IMAGEM_BASE64) return { ok: false, erro: 'Arquivo grande demais (máximo ~15 MB).' };

  const mime = typeof mimeType === 'string' && mimeType !== '' ? mimeType : 'image/png';
  if (imagemBase64 && !(MIME_LAUDO_PERMITIDOS as readonly string[]).includes(mime)) {
    return { ok: false, erro: `Tipo de arquivo não suportado (${mime.slice(0, 40)}). Use PNG, JPEG, WEBP ou PDF.` };
  }
  return { ok: true, entrada: { textoLaudo, imagemBase64, mimeType: mime } };
}