/**
 * Motor de Cálculo e Avaliação de Fórmulas Matemáticas em Tempo Real (Meta Data Points)
 * Compatível com Rapid SCADA v6 e SCADA-LTS
 */

import { FormulaTag, DataPointTag } from '../types';
import { lerLista, gravarJson } from './storageSeguro';
import { esquemaFormula, normalizarFormula } from './esquemasDados';
import { avaliarExpressaoSegura, ErroExpressao } from './expressaoSegura';

const STORAGE_KEY = 'purifywave_scada_formula_tags_v2';

export class FormulaService {
  private formulas: FormulaTag[] = [];

  constructor() {
    this.inicializarFormulas();
  }

  private inicializarFormulas(): void {
    const formulasPadrao: FormulaTag[] = [
      {
        id: 'FORM-001',
        nome: 'Delta P (Perda de Carga Manifold PEAD)',
        tagPath: 'Calculadas.DeltaP_Manifold',
        expressao: '(PT_101 - PT_102) * 10.197',
        unidade: 'mca',
        descricao: 'Diferencial de pressão entre entrada e saída do rack DN200 em metros de coluna de água',
        valorCalculado: 1.22,
        statusCalculo: 'OK',
        limiteAlertaMax: 3.5,
        criadoEm: '2026-03-01T10:00:00.000Z',
        atualizadoEm: '2026-03-01T10:00:00.000Z',
        autor: 'Engenharia de Processos (CREA-SP)'
      },
      {
        id: 'FORM-002',
        nome: 'Vazão Específica por Célula (Fluxo Radial)',
        tagPath: 'Calculadas.Vazao_Media_Celula',
        expressao: 'FIT_101 / 16',
        unidade: 'm³/h',
        descricao: 'Distribuição simétrica da vazão total de 180 m³/h dividida pelas 16 células PEAD',
        valorCalculado: 11.25,
        statusCalculo: 'OK',
        limiteAlertaMin: 8.0,
        limiteAlertaMax: 15.0,
        criadoEm: '2026-03-01T10:00:00.000Z',
        atualizadoEm: '2026-03-01T10:00:00.000Z',
        autor: 'Engenharia de Processos (CREA-SP)'
      },
      {
        id: 'FORM-003',
        nome: 'Eficiência de Remoção de Fluoreto (Eletrodiálise)',
        tagPath: 'Calculadas.Eficiencia_Remocao_F',
        expressao: '((AIT_F_IN - AIT_F_OUT) / AIT_F_IN) * 100',
        unidade: '%',
        descricao: 'Porcentagem de abatimento do íon fluoreto no efluente desfluoretado',
        valorCalculado: 78.4,
        statusCalculo: 'OK',
        limiteAlertaMin: 65.0,
        criadoEm: '2026-03-01T10:00:00.000Z',
        atualizadoEm: '2026-03-01T10:00:00.000Z',
        autor: 'Engenharia Química (CRQ-IV)'
      },
      {
        id: 'FORM-004',
        nome: 'Consumo Específico Energético (SEC)',
        tagPath: 'Calculadas.SEC_kWh_m3',
        expressao: '(TELES_V_BUS * TELES_I_BUS) / (FIT_101 * 1000)',
        unidade: 'kWh/m³',
        descricao: 'Energia consumida no barramento DC por volume de água tratada',
        valorCalculado: 0.42,
        statusCalculo: 'OK',
        limiteAlertaMax: 0.85,
        criadoEm: '2026-03-01T10:00:00.000Z',
        atualizadoEm: '2026-03-01T10:00:00.000Z',
        autor: 'Automação & Elétrica'
      }
    ];

    this.formulas = lerLista<FormulaTag>(STORAGE_KEY, esquemaFormula, () => formulasPadrao, 'Fórmulas e tags virtuais', normalizarFormula);
    this.persistir();
  }

  private persistir(): void {
    gravarJson(STORAGE_KEY, this.formulas, 'Fórmulas e tags virtuais');
  }

  public getFormulas(): FormulaTag[] {
    return this.formulas;
  }

  public recalcularTodasFormulas(contextoVariaveis: Record<string, number>): FormulaTag[] {
    this.formulas.forEach(f => {
      const res = this.avaliarExpressao(f.expressao, contextoVariaveis);
      f.valorCalculado = res.valor;
      f.statusCalculo = res.status;
      f.mensagemErro = res.erro;
    });
    return this.formulas;
  }

  /**
   * Avalia uma expressão matemática com as tags do contexto. Usa um interpretador próprio (expressaoSegura.ts):
   * a expressão digitada NUNCA é executada como JavaScript (antes: new Function).
   */
  public avaliarExpressao(
    expressao: string,
    contextoVariaveis: Record<string, number>
  ): { valor: number; status: 'OK' | 'ERRO_SINTAXE' | 'TAG_INEXISTENTE'; erro?: string } {
    try {
      const resultado = avaliarExpressaoSegura(expressao, contextoVariaveis);
      return { valor: parseFloat(resultado.toFixed(4)), status: 'OK' };
    } catch (e: any) {
      if (e instanceof ErroExpressao) {
        // Valor de erro 0 acompanha sempre um status != OK: quem consome deve checar o status
        return { valor: 0, status: e.tipo === 'TAG' ? 'TAG_INEXISTENTE' : 'ERRO_SINTAXE', erro: e.message };
      }
      return { valor: 0, status: 'ERRO_SINTAXE', erro: e?.message || 'Erro ao avaliar a expressão' };
    }
  }

  public obterFormulasComValores(tagsReais: DataPointTag[]): FormulaTag[] {
    const mapaVariaveis: Record<string, number> = {};
    tagsReais.forEach(t => {
      const v = typeof t.valorAtual === 'number' ? t.valorAtual : typeof t.valor === 'number' ? t.valor : 0;
      const key = t.tagPath || t.tag || '';
      if (key) {
        mapaVariaveis[key] = v;
        mapaVariaveis[key.replace(/[^a-zA-Z0-9_.]/g, '_')] = v;
      }
    });

    this.recalcularTodasFormulas(mapaVariaveis);
    return this.formulas;
  }

  /**
   * Garante que a fórmula salva passará pela validação do carregamento (esquemaFormula); do contrário ela seria
   * descartada em silêncio no próximo reinício. Retorna a mensagem do problema ou null.
   */
  public validarEntradaFormula(f: { nome?: unknown; tagPath?: unknown; expressao?: unknown; unidade?: unknown; descricao?: unknown; autor?: unknown }): string | null {
    const txt = (v: unknown, campo: string, max: number, obrigatorio: boolean) => {
      if (typeof v !== 'string') return obrigatorio ? `${campo}: informe um texto` : null;
      if (obrigatorio && v.trim() === '') return `${campo}: obrigatório`;
      return v.length > max ? `${campo}: máximo de ${max} caracteres` : null;
    };
    const erro =
      txt(f.nome, 'Nome', 300, true) ||
      txt(f.tagPath, 'Caminho da tag', 300, true) ||
      txt(f.expressao, 'Expressão', 500, true) ||
      txt(f.unidade, 'Unidade', 300, false) ||
      txt(f.descricao, 'Descrição', 10000, false) ||
      txt(f.autor, 'Autor', 300, false);
    if (erro) return erro;
    if (!/^[\w.\-]+$/.test(f.tagPath as string)) return 'Caminho da tag: use apenas letras, números, ponto, hífen e sublinhado (sem espaços ou acentos)';
    if (!/^[\w\s.+\-*/%()<>=!&|?:,^]*$/.test(f.expressao as string)) return 'Expressão: caracteres não permitidos (use números, tags, + - * / % ^ ( ) comparações e funções)';
    return null;
  }

  public salvarFormula(formula: Omit<FormulaTag, 'id' | 'valorCalculado' | 'statusCalculo' | 'criadoEm' | 'atualizadoEm'> & { id?: string }): FormulaTag {
    const problema = this.validarEntradaFormula(formula);
    if (problema) throw new Error(problema);

    const agora = new Date().toISOString();
    let salva: FormulaTag;

    if (formula.id) {
      const idx = this.formulas.findIndex(f => f.id === formula.id);
      if (idx >= 0) {
        salva = {
          ...this.formulas[idx],
          ...formula,
          id: formula.id,
          atualizadoEm: agora
        };
        this.formulas[idx] = salva;
      } else {
        salva = {
          ...formula,
          id: formula.id,
          valorCalculado: 0,
          statusCalculo: 'OK',
          criadoEm: agora,
          atualizadoEm: agora
        };
        this.formulas.push(salva);
      }
    } else {
      salva = {
        ...formula,
        id: this.proximoIdFormula(),
        valorCalculado: 0,
        statusCalculo: 'OK',
        criadoEm: agora,
        atualizadoEm: agora
      };
      this.formulas.push(salva);
    }

    this.persistir();
    return salva;
  }

  /** Próximo FORM-NNN livre (maior número existente + 1). Antes usava length+1 e repetia ids depois de exclusões. */
  private proximoIdFormula(): string {
    const maior = this.formulas.reduce((m, f) => {
      const n = /^FORM-(\d+)$/.exec(f.id);
      return n ? Math.max(m, Number(n[1])) : m;
    }, 0);
    return `FORM-${String(maior + 1).padStart(3, '0')}`;
  }

  public excluirFormula(id: string): boolean {
    const lenAntes = this.formulas.length;
    this.formulas = this.formulas.filter(f => f.id !== id);
    if (this.formulas.length !== lenAntes) {
      this.persistir();
      return true;
    }
    return false;
  }

  public restaurarFormulasPadrao(): FormulaTag[] {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* armazenamento indisponível: recria só em memória */ }
    this.inicializarFormulas();
    return this.formulas;
  }
}

export const formulaServiceInstance = new FormulaService();