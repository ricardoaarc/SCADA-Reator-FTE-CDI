/**
 * Avaliador de expressões matemáticas SEM eval/new Function.
 *
 * Substitui o `new Function(...)` do formulaService: a expressão digitada pelo usuário nunca vira código JavaScript.
 * O texto é decomposto em tokens, interpretado por uma gramática fechada e avaliado em aritmética pura.
 *
 * Suporta: números, + - * / % ^ (ou **), parênteses, menos/mais unário, comparações (< > <= >= == !=),
 * && || ! (resultam em 1 ou 0), condicional  a ? b : c , variáveis (tags) e as funções
 * abs sqrt min max round sin cos log, constantes PI e E (com ou sem o prefixo "Math.").
 * Qualquer outra coisa é erro de sintaxe. Divisão por zero e valores não finitos são erros.
 */

export type TipoErroExpressao = 'SINTAXE' | 'TAG' | 'VALOR';

export class ErroExpressao extends Error {
  constructor(public tipo: TipoErroExpressao, message: string) {
    super(message);
    this.name = 'ErroExpressao';
  }
}

const MAX_TAMANHO = 500;
const MAX_TOKENS = 400;
const MAX_PROFUNDIDADE = 40;

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string };

const FUNCOES: Record<string, (...a: number[]) => number> = {
  abs: Math.abs, sqrt: Math.sqrt, min: Math.min, max: Math.max, round: Math.round,
  sin: Math.sin, cos: Math.cos, log: Math.log,
};
const CONSTANTES: Record<string, number> = { PI: Math.PI, E: Math.E };

function tokenizar(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }

    // número: 12, 12.5, .5, 1e-3
    const mNum = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (mNum) {
      tokens.push({ t: 'num', v: Number(mNum[0]) });
      i += mNum[0].length;
    } else {
      // identificador (tags podem ter ponto: Calculadas.DeltaP)
      const mId = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i));
      if (mId) {
        tokens.push({ t: 'id', v: mId[0] });
        i += mId[0].length;
      } else {
        const dois = src.slice(i, i + 2);
        if (['**', '<=', '>=', '==', '!=', '&&', '||'].includes(dois)) {
          tokens.push({ t: 'op', v: dois });
          i += 2;
        } else if ('+-*/%^()<>!?:,'.includes(c)) {
          tokens.push({ t: 'op', v: c });
          i += 1;
        } else {
          throw new ErroExpressao('SINTAXE', `Caractere não permitido: "${c}"`);
        }
      }
    }
    if (tokens.length > MAX_TOKENS) throw new ErroExpressao('SINTAXE', 'Expressão complexa demais');
  }
  return tokens;
}

class Interprete {
  private pos = 0;
  private prof = 0;
  constructor(private tokens: Token[], private variaveis: Record<string, number>) {}

  avaliar(): number {
    if (this.tokens.length === 0) throw new ErroExpressao('SINTAXE', 'Expressão vazia');
    const v = this.condicional();
    if (this.pos < this.tokens.length) throw new ErroExpressao('SINTAXE', `Trecho inesperado: "${this.rotulo(this.tokens[this.pos])}"`);
    return v;
  }

  private rotulo(t: Token) { return String(t.v); }
  private ehOp(v: string) { const t = this.tokens[this.pos]; return !!t && t.t === 'op' && t.v === v; }
  private consome(v: string) { if (this.ehOp(v)) { this.pos++; return true; } return false; }
  private exige(v: string) { if (!this.consome(v)) throw new ErroExpressao('SINTAXE', `Esperado "${v}"`); }

  private entra() { if (++this.prof > MAX_PROFUNDIDADE) throw new ErroExpressao('SINTAXE', 'Parênteses aninhados demais'); }
  private sai() { this.prof--; }

  private condicional(): number {
    const c = this.ou();
    if (this.consome('?')) {
      this.entra();
      const a = this.condicional();
      this.exige(':');
      const b = this.condicional();
      this.sai();
      return c !== 0 ? a : b;
    }
    return c;
  }
  private ou(): number { let v = this.e(); while (this.consome('||')) { const d = this.e(); v = v !== 0 || d !== 0 ? 1 : 0; } return v; }
  private e(): number { let v = this.igualdade(); while (this.consome('&&')) { const d = this.igualdade(); v = v !== 0 && d !== 0 ? 1 : 0; } return v; }
  private igualdade(): number {
    let v = this.relacional();
    for (;;) {
      if (this.consome('==')) v = v === this.relacional() ? 1 : 0;
      else if (this.consome('!=')) v = v !== this.relacional() ? 1 : 0;
      else return v;
    }
  }
  private relacional(): number {
    let v = this.soma();
    for (;;) {
      if (this.consome('<=')) v = v <= this.soma() ? 1 : 0;
      else if (this.consome('>=')) v = v >= this.soma() ? 1 : 0;
      else if (this.consome('<')) v = v < this.soma() ? 1 : 0;
      else if (this.consome('>')) v = v > this.soma() ? 1 : 0;
      else return v;
    }
  }
  private soma(): number {
    let v = this.termo();
    for (;;) {
      if (this.consome('+')) v += this.termo();
      else if (this.consome('-')) v -= this.termo();
      else return v;
    }
  }
  private termo(): number {
    let v = this.unario();
    for (;;) {
      if (this.consome('*')) v *= this.unario();
      else if (this.consome('/')) {
        const d = this.unario();
        if (d === 0) throw new ErroExpressao('VALOR', 'Divisão por zero');
        v /= d;
      } else if (this.consome('%')) {
        const d = this.unario();
        if (d === 0) throw new ErroExpressao('VALOR', 'Divisão por zero (%)');
        v %= d;
      } else return v;
    }
  }
  private unario(): number {
    if (this.consome('-')) { this.entra(); const v = -this.unario(); this.sai(); return v; }
    if (this.consome('+')) { this.entra(); const v = this.unario(); this.sai(); return v; }
    if (this.consome('!')) { this.entra(); const v = this.unario() === 0 ? 1 : 0; this.sai(); return v; }
    return this.potencia();
  }
  private potencia(): number {
    const base = this.primario();
    if (this.consome('^') || this.consome('**')) {
      this.entra();
      const exp = this.unario(); // associa à direita e aceita expoente negativo
      this.sai();
      const r = Math.pow(base, exp);
      if (!Number.isFinite(r)) throw new ErroExpressao('VALOR', 'Potência fora do intervalo numérico');
      return r;
    }
    return base;
  }
  private primario(): number {
    const t = this.tokens[this.pos];
    if (!t) throw new ErroExpressao('SINTAXE', 'Expressão incompleta');
    if (t.t === 'num') { this.pos++; return t.v; }
    if (t.t === 'op') {
      if (t.v === '(') {
        this.pos++; this.entra();
        const v = this.condicional();
        this.exige(')');
        this.sai();
        return v;
      }
      throw new ErroExpressao('SINTAXE', `Trecho inesperado: "${t.v}"`);
    }
    // identificador: função, constante ou tag
    this.pos++;
    const nome = t.v.startsWith('Math.') ? t.v.slice(5) : t.v;
    if (this.ehOp('(')) {
      const fn = Object.prototype.hasOwnProperty.call(FUNCOES, nome) ? FUNCOES[nome] : undefined;
      if (!fn) throw new ErroExpressao('TAG', `Função desconhecida: ${t.v}`);
      this.pos++; this.entra();
      const args: number[] = [];
      if (!this.ehOp(')')) {
        do { args.push(this.condicional()); } while (this.consome(','));
      }
      this.exige(')');
      this.sai();
      if (args.length === 0) throw new ErroExpressao('SINTAXE', `${t.v}() exige argumentos`);
      const r = fn(...args);
      if (!Number.isFinite(r)) throw new ErroExpressao('VALOR', `${t.v}() resultou em valor inválido`);
      return r;
    }
    if (Object.prototype.hasOwnProperty.call(CONSTANTES, nome)) return CONSTANTES[nome];
    if (!Object.prototype.hasOwnProperty.call(this.variaveis, t.v)) throw new ErroExpressao('TAG', `Tag ou variável não encontrada: ${t.v}`);
    const val = this.variaveis[t.v];
    if (typeof val !== 'number' || !Number.isFinite(val)) throw new ErroExpressao('VALOR', `Tag ${t.v} sem valor numérico válido`);
    return val;
  }
}

/** Avalia a expressão com as variáveis dadas. Lança ErroExpressao em qualquer problema. */
export function avaliarExpressaoSegura(expressao: string, variaveis: Record<string, number>): number {
  if (typeof expressao !== 'string' || expressao.trim() === '') throw new ErroExpressao('SINTAXE', 'Expressão vazia');
  if (expressao.length > MAX_TAMANHO) throw new ErroExpressao('SINTAXE', `Expressão acima de ${MAX_TAMANHO} caracteres`);
  const r = new Interprete(tokenizar(expressao), variaveis).avaliar();
  if (!Number.isFinite(r)) throw new ErroExpressao('VALOR', 'Resultado não finito');
  return r;
}