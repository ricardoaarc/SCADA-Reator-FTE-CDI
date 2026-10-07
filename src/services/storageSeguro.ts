/**
 * Leitura e gravação segura do localStorage (SCD-DAT-001 / SCD-DAT-002).
 *
 * Problema: JSON.parse + atribuição direta aceita QUALQUER coisa salva (arquivo corrompido, versão antiga,
 * edição manual), e o resto do sistema falha longe da origem (ex.: `undefined.toFixed`). Aqui todo dado
 * lido é validado contra um esquema; o que é inválido é descartado, uma cópia do valor ruim é guardada
 * em `scada_backup_corrompido:<chave>`, o padrão é usado e o problema aparece para o operador (banner e alarme).
 *
 * Limite: isto valida FORMATO, não autenticidade. Quem edita o localStorage controla o que está nele;
 * controle de acesso real precisa estar no servidor.
 */

// ---------------------------------------------------------------- esquemas

/** Retorna null se o valor é válido, ou a descrição do problema. */
export type Esquema = (valor: unknown, caminho: string) => string | null;

const MAX_TEXTO = 10_000;
const eObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const esq = {
  texto: (o: { max?: number; padrao?: RegExp } = {}): Esquema => (v, c) => {
    if (typeof v !== 'string') return `${c}: esperado texto`;
    if (v.length > (o.max ?? MAX_TEXTO)) return `${c}: texto longo demais`;
    if (o.padrao && !o.padrao.test(v)) return `${c}: formato inválido`;
    return null;
  },
  numero: (o: { min?: number; max?: number; inteiro?: boolean } = {}): Esquema => (v, c) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return `${c}: esperado número`;
    if (o.inteiro && !Number.isInteger(v)) return `${c}: esperado inteiro`;
    if (o.min !== undefined && v < o.min) return `${c}: abaixo de ${o.min}`;
    if (o.max !== undefined && v > o.max) return `${c}: acima de ${o.max}`;
    return null;
  },
  booleano: (): Esquema => (v, c) => (typeof v === 'boolean' ? null : `${c}: esperado verdadeiro/falso`),
  enum: (valores: readonly string[]): Esquema => (v, c) =>
    typeof v === 'string' && valores.includes(v) ? null : `${c}: valor fora da lista (${String(v).slice(0, 40)})`,
  opcional: (e: Esquema): Esquema => (v, c) => (v === undefined ? null : e(v, c)),
  ouNulo: (e: Esquema): Esquema => (v, c) => (v === null ? null : e(v, c)),
  lista: (item: Esquema, o: { max?: number } = {}): Esquema => (v, c) => {
    if (!Array.isArray(v)) return `${c}: esperada lista`;
    if (v.length > (o.max ?? 5000)) return `${c}: lista grande demais`;
    for (let i = 0; i < v.length; i++) {
      const r = item(v[i], `${c}[${i}]`);
      if (r) return r;
    }
    return null;
  },
  /** Objeto usado como dicionário: todos os valores precisam passar em `item`. */
  mapa: (item: Esquema, o: { max?: number } = {}): Esquema => (v, c) => {
    if (!eObjeto(v)) return `${c}: esperado objeto`;
    const chaves = Object.keys(v);
    if (chaves.length > (o.max ?? 5000)) return `${c}: dicionário grande demais`;
    for (const k of chaves) {
      const r = item(v[k], `${c}.${k}`);
      if (r) return r;
    }
    return null;
  },
  /** Campos extras são permitidos (versões futuras); só os declarados são exigidos. */
  objeto: (campos: Record<string, Esquema>): Esquema => (v, c) => {
    if (!eObjeto(v)) return `${c}: esperado objeto`;
    for (const [k, e] of Object.entries(campos)) {
      const r = e(v[k], `${c}.${k}`);
      if (r) return r;
    }
    return null;
  },
};

// ------------------------------------------------- integridade (avisos ao operador)

export interface ProblemaDados {
  id: string;
  codigo: 'SCD-DAT-001' | 'SCD-DAT-002';
  chave: string;
  rotulo: string;
  motivo: string;
  acao: string;
  quando: string;
}

class IntegridadeDados {
  private problemas: ProblemaDados[] = [];
  private ouvintes: Array<(lista: ProblemaDados[]) => void> = [];
  private ganchos: Array<(p: ProblemaDados) => void> = [];

  registrar(p: Omit<ProblemaDados, 'id' | 'quando'>): void {
    console.warn(`[${p.codigo}] ${p.rotulo} (${p.chave}): ${p.motivo}. ${p.acao}`);
    // Sem duplicar o mesmo problema enquanto ele ainda está na lista
    if (this.problemas.some(x => x.chave === p.chave && x.codigo === p.codigo && x.motivo === p.motivo)) return;
    const novo: ProblemaDados = { ...p, id: `${p.codigo}:${p.chave}:${Date.now()}`, quando: new Date().toISOString() };
    this.problemas = [...this.problemas, novo].slice(-20);
    this.ganchos.forEach(g => { try { g(novo); } catch (e) { console.error('Erro em gancho de integridade:', e); } });
    this.notificar();
  }

  listar(): ProblemaDados[] { return [...this.problemas]; }

  dispensar(id?: string): void {
    this.problemas = id ? this.problemas.filter(p => p.id !== id) : [];
    this.notificar();
  }

  assinar(fn: (lista: ProblemaDados[]) => void): () => void {
    this.ouvintes.push(fn);
    fn(this.listar());
    return () => { this.ouvintes = this.ouvintes.filter(o => o !== fn); };
  }

  /** Recebe cada problema novo (ex.: para gerar alarme). Problemas anteriores são reenviados na hora. */
  aoRegistrar(fn: (p: ProblemaDados) => void): () => void {
    this.ganchos.push(fn);
    this.problemas.forEach(p => { try { fn(p); } catch (e) { console.error('Erro em gancho de integridade:', e); } });
    return () => { this.ganchos = this.ganchos.filter(g => g !== fn); };
  }

  private notificar(): void {
    const l = this.listar();
    this.ouvintes.forEach(o => { try { o(l); } catch (e) { console.error('Erro em ouvinte de integridade:', e); } });
  }
}

export const integridadeDados = new IntegridadeDados();

// ------------------------------------------------------------------ leitura

const PREFIXO_BACKUP = 'scada_backup_corrompido:';
const ACAO_PADRAO = 'Valores padrão em uso para o item afetado; confira e reconfigure se necessário.';

function ler(chave: string, rotulo: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(chave);
  } catch (e) {
    integridadeDados.registrar({
      codigo: 'SCD-DAT-002', chave, rotulo,
      motivo: `armazenamento do navegador inacessível (${(e as Error)?.message ?? e})`,
      acao: 'Valores padrão em uso; as alterações não serão lembradas.',
    });
    return null;
  }
}

function guardarCopia(chave: string, bruto: string, motivo: string): void {
  try {
    localStorage.setItem(PREFIXO_BACKUP + chave, JSON.stringify({ em: new Date().toISOString(), motivo, bruto: bruto.slice(0, 200_000) }));
  } catch { /* sem espaço para a cópia: segue sem ela */ }
}

function reprovar(chave: string, rotulo: string, bruto: string, motivo: string, acao = ACAO_PADRAO): void {
  guardarCopia(chave, bruto, motivo);
  integridadeDados.registrar({ codigo: 'SCD-DAT-001', chave, rotulo, motivo, acao });
}

function analisar(bruto: string): { ok: true; valor: unknown } | { ok: false; motivo: string } {
  try {
    return { ok: true, valor: JSON.parse(bruto) };
  } catch (e) {
    return { ok: false, motivo: `JSON inválido (${(e as Error)?.message ?? e})` };
  }
}

/** Objeto único: tudo ou nada. Inválido -> padrão. */
export function lerJson<T>(chave: string, esquema: Esquema, padrao: () => T, rotulo = chave): T {
  const bruto = ler(chave, rotulo);
  if (bruto === null) return padrao();
  const a = analisar(bruto);
  if (!a.ok) { reprovar(chave, rotulo, bruto, a.motivo); return padrao(); }
  const erro = esquema(a.valor, 'valor');
  if (erro) { reprovar(chave, rotulo, bruto, erro); return padrao(); }
  return a.valor as T;
}

/** Lista: mantém os itens válidos e descarta os inválidos. Sem nenhum válido -> padrão. */
export function lerLista<T>(
  chave: string, esquemaItem: Esquema, padrao: () => T[], rotulo = chave,
  normalizar: (item: any) => T = (i) => i as T
): T[] {
  const bruto = ler(chave, rotulo);
  if (bruto === null) return padrao();
  const a = analisar(bruto);
  if (!a.ok) { reprovar(chave, rotulo, bruto, a.motivo); return padrao(); }
  if (!Array.isArray(a.valor)) { reprovar(chave, rotulo, bruto, 'esperada uma lista'); return padrao(); }
  if (a.valor.length === 0) return padrao();

  const validos: T[] = [];
  const motivos: string[] = [];
  a.valor.forEach((item, i) => {
    const erro = esquemaItem(item, `item ${i}`);
    if (erro) motivos.push(erro); else validos.push(normalizar(item));
  });

  if (motivos.length > 0) {
    reprovar(
      chave, rotulo, bruto,
      `${motivos.length} de ${a.valor.length} item(ns) inválido(s) descartado(s). Primeiro problema: ${motivos[0]}`,
      validos.length > 0 ? 'Itens válidos mantidos; os inválidos foram descartados.' : ACAO_PADRAO
    );
  }
  return validos.length > 0 ? validos : padrao();
}

/** Objeto de configuração: cada campo é validado separadamente; campo inválido volta ao padrão, os demais ficam. */
export function lerCampos<T extends Record<string, unknown>>(
  chave: string, esquemasPorCampo: { [K in keyof T]?: Esquema }, padrao: T, rotulo = chave
): T {
  const bruto = ler(chave, rotulo);
  if (bruto === null) return { ...padrao };
  const a = analisar(bruto);
  if (!a.ok) { reprovar(chave, rotulo, bruto, a.motivo); return { ...padrao }; }
  if (!eObjeto(a.valor)) { reprovar(chave, rotulo, bruto, 'esperado um objeto'); return { ...padrao }; }

  const saida: Record<string, unknown> = { ...padrao };
  const invalidos: string[] = [];
  for (const [campo, e] of Object.entries(esquemasPorCampo) as Array<[string, Esquema]>) {
    const v = a.valor[campo];
    if (v === undefined) continue; // ausente (versão antiga): fica o padrão, sem alarme
    const erro = e(v, campo);
    if (erro) invalidos.push(erro); else saida[campo] = v;
  }
  if (invalidos.length > 0) {
    reprovar(chave, rotulo, bruto, `${invalidos.length} campo(s) inválido(s) voltaram ao padrão: ${invalidos.slice(0, 3).join('; ')}`,
      'Os campos inválidos voltaram ao padrão; os demais foram mantidos.');
  }
  return saida as T;
}

// ----------------------------------------------------------------- gravação

/** Grava JSON sem lançar exceção. Em falha (cota/privacidade) avisa o operador (SCD-DAT-002) e retorna false. */
export function gravarJson(chave: string, valor: unknown, rotulo = chave): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    integridadeDados.registrar({
      codigo: 'SCD-DAT-002', chave, rotulo,
      motivo: `não foi possível gravar (${(e as Error)?.name ?? 'erro'}: ${(e as Error)?.message ?? e})`,
      acao: 'As alterações valem só até recarregar a página. Libere espaço ou permita armazenamento para este site.',
    });
    return false;
  }
}
