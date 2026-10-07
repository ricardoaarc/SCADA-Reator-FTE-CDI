import {
  CelulaInfo,
  ParametrosProcesso,
  Usuario,
  IRelayDriver,
  DataPointTag,
  RackResumoGlobal
} from '../types';
import { dbInstance } from './database';
import type { CodigoErro } from './errorCatalog';
import type { FontePressao } from '../types';
import { RelayDriverHibrido, FontePressaoPlc } from './plcSafetyAdapters';
import { razaoSegura, eficienciaSegura } from './calculosSeguros';

export class IndustrialRelayDriver implements IRelayDriver {
  private estados = new Map<string, 'ABERTO' | 'FECHADO'>();

  private chave(celulaId: number, tipoRele: string): string {
    return `${celulaId}:${tipoRele}`;
  }

  public async cortarReleFisico(celulaId: number, tipoRele: string, motivo: string): Promise<boolean> {
    this.estados.set(this.chave(celulaId, tipoRele), 'ABERTO');
    return true;
  }

  public async rearmarReleFisico(celulaId: number, tipoRele: string, usuarioId: string, observacao: string): Promise<boolean> {
    this.estados.set(this.chave(celulaId, tipoRele), 'FECHADO');
    return true;
  }

  public async obterEstadoRele(celulaId: number, tipoRele: string): Promise<'ABERTO' | 'FECHADO'> {
    return this.estados.get(this.chave(celulaId, tipoRele)) || 'FECHADO';
  }
}

export class FteCdiControllerV2 {
  public relayDriver: IRelayDriver;
  /** Quando ativa (modo CLP real), a pressão do interlock vem do CLP; senão, da simulação. */
  public fontePressao?: FontePressao;
  /**
   * O que fazer se a pressão do CLP ficar indisponível/inválida em modo CLP real:
   *  INTERTRAVAR (padrão, estado seguro) ou SOMENTE_ALARME (só alarma; use apenas se o CLP/hardware já protege).
   */
  public politicaSemPressaoReal: 'INTERTRAVAR' | 'SOMENTE_ALARME' = 'INTERTRAVAR';
  private ultimoAlarmeSemPressao = 0;
  public celulas: CelulaInfo[] = [];
  public parametros: ParametrosProcesso;
  public usuarioAtual: Usuario;
  private scanIntervalTimer: any = null;

  // Faixa plausível do transmissor de pressão. Fora dela, o sinal é tratado como falha de sensor.
  // AJUSTE para a faixa real do instrumento instalado.
  private static readonly PRESSAO_FAIXA_MIN_BAR = -0.5;
  private static readonly PRESSAO_FAIXA_MAX_BAR = 10;
  private static readonly RELES_INTERLOCK = ['FONTE_DC', 'VALVULA_ALIMENTACAO'] as const;

  // Células com interlock disparado cujo corte de relé não foi confirmado (nova tentativa a cada scan)
  private corteNaoConfirmado = new Map<number, number>(); // célula -> instante da última tentativa
  private static readonly REENVIO_CORTE_MS = 10_000;
  // Limita alarmes repetidos de falha de ciclo (chave: célula+etapa -> timestamp)
  private ultimaFalhaCiclo = new Map<string, number>();

  constructor(relayDriver?: IRelayDriver, fontePressao?: FontePressao) {
    this.relayDriver = relayDriver || new IndustrialRelayDriver();
    this.fontePressao = fontePressao;

    // Parâmetros de Processo Industriais (Rigorosos)
    this.parametros = {
      limiteEstruturalMecanicoBar: 3.00,
      corteInterlockPressaoBar: 2.85,
      alertaPressaoAltaBar: 2.80,
      alertaPressaoBaixaBar: 1.00,
      vazaoTotalAlvoLh: 23200,
      vazaoNominalCelulaLh: 1450,
      desvioMaximoManifoldPct: 10,
      tensaoAdsorcaoV: 1.40,
      tensaoRegeneracaoV: 0.00,
      limiteCorrenteMaxPorCelulaAmp: 15.0,
      razaoBreakthroughLimite: 0.90,
      debounceLeiturasConsecutivas: 3,
      timeoutAdsorcaoMinutos: 30,
      tempoRegeneracaoMinutos: 10,
      reversaoPolaridadeHabilitada: true,
      reversaoPolaridadePeriodoMs: 250,
      avisoValidacaoBancadaRuIr: 'Malha OK',
      vmpFluoretoPortaria888MgL: 1.5,
      duracaoEtapaAdsorcaoSeg: 1200,
      duracaoEtapaDesorcaoSeg: 300,
      duracaoEtapaHigienizacaoSeg: 180,
      fatorDegradacaoCapacitativaPercent: 0.05
    };

    this.usuarioAtual = {
      id: 1,
      nome: 'Ricardo Silveira',
      matricula: 'ENG-4409',
      nivel_acesso: 'ENGENHEIRO',
      cargo: 'Engenheiro Chefe de Processo',
      email: 'ricardo.alcantara@purifywave.com.br'
    };

    this.inicializarCelulasMatriz();
  }

  private inicializarCelulasMatriz(): void {
    this.celulas = Array.from({ length: 16 }, (_, i) => {
      const id = i + 1;
      const linha = Math.floor(i / 4) + 1;
      const coluna = (i % 4) + 1;
      return {
        id,
        codigo: `CEL-${String(id).padStart(2, '0')}`,
        posicao_rack: id,
        linhaRack: linha,
        colunaRack: coluna,
        pares_eletrodo: 146,
        status: 'OPERANDO_ADSORCAO',
        etapaAtual: 'ADSORCAO',
        tempoAcumuladoEtapaSeg: Math.floor(Math.random() * 300),
        tempoFaseAtualSegundos: 0,
        pressaoBar: 2.15 + (Math.random() * 0.2 - 0.1),
        vazaoLh: 1450.0,
        tensaoV: 48.0,
        correnteAmp: 12.5,
        condutividadeEntradaUs: 3850.0,
        condutividadeSaidaUs: 120.0,
        capacitanciaEfetivaFarad: 1250.0,
        massaFluorRemovidaG: 14.2,
        interlockDisparado: false,
        requerRearmeManual: false,
        motivoInterlock: null,
        ativa: true,
        fluoretoInPPM: 8.5,
        fluoretoOutPPM: 1.1,
        ph: 7.2,
        temperaturaC: 23.4,
        razaoBreakthrough: 0.129,
        eficienciaPct: 87.0
      };
    });
  }

  /**
   * Ciclo de Scan do CLP Industrial iterando sobre as 16 células do rack.
   * Cada etapa roda isolada: uma falha em uma etapa ou célula não impede a verificação
   * de segurança das demais (SCD-CTL-001).
   */
  public executarCicloScanCLP(): void {
    this.celulas.forEach(celula => {
      if (!celula.ativa) return;

      // Reforça o corte de relés quando a confirmação anterior falhou
      if (celula.interlockDisparado) {
        const ult = this.corteNaoConfirmado.get(celula.id);
        if (ult && Date.now() - ult >= FteCdiControllerV2.REENVIO_CORTE_MS) {
          this.tentarCorteReles(celula, celula.motivoInterlock || 'Reforço de interlock').catch(e =>
            console.error(`Erro ao reforçar corte na célula ${celula.id}:`, e)
          );
        }
        return;
      }

      try {
        this.verificarSegurancaPressao(celula).catch(err => {
          this.registrarErroCiclo(celula.id, 'pressao', err);
        });
      } catch (err) {
        this.registrarErroCiclo(celula.id, 'pressao', err);
      }

      if (!celula.interlockDisparado) {
        try {
          this.verificarMaquinaEstadosBreakthrough(celula);
          this.atualizarCicloProcesso(celula);

          dbInstance.inserirTelemetria({
            ciclo_id: 1,
            pressao_bar: celula.pressaoBar,
            vazao_l_h: celula.vazaoLh,
            corrente_amp: celula.correnteAmp,
            tensao_v: celula.tensaoV,
            fluoreto_in_ppm: celula.fluoretoInPPM ?? 8.5,
            fluoreto_out_ppm: celula.fluoretoOutPPM ?? 1.1,
            ph: celula.ph ?? 7.2,
            temperatura_c: celula.temperaturaC ?? 23.4
          });
        } catch (err) {
          this.registrarErroCiclo(celula.id, 'processo', err);
        }
      }
    });
  }

  private async verificarSegurancaPressao(celula: CelulaInfo): Promise<void> {
    if (this.fontePressao?.ativa()) {
      const leitura = this.fontePressao.ler();
      celula.fontePressao = 'CLP_REAL';

      if (leitura.qualidade === 'AGUARDANDO') {
        return;
      }

      if (leitura.qualidade !== 'BOA' || leitura.pressaoBar === null) {
        const motivo = leitura.motivo ?? 'leitura indisponível';
        if (this.politicaSemPressaoReal === 'INTERTRAVAR') {
          await this.dispararInterlock(
            celula,
            'SCD-SEN-002',
            `FALHA DE PRESSÃO DO CLP (${motivo}): sem sinal confiável do CLP em modo CLP real, célula levada ao estado seguro`,
            'Pressão do CLP indisponível'
          );
        } else if (Date.now() - this.ultimoAlarmeSemPressao > 10_000) {
          this.ultimoAlarmeSemPressao = Date.now();
          dbInstance.inserirAlarme('CRITICO', `[SCD-SEN-002] Pressão do CLP indisponível (${motivo}). Política SOMENTE_ALARME: nenhuma célula foi intertravada.`, null, 'SCD-SEN-002');
        }
        return;
      }
      celula.pressaoBar = leitura.pressaoBar;
    } else {
      celula.fontePressao = 'SIMULADA';
    }

    const p = celula.pressaoBar;
    const sinalInvalido =
      typeof p !== 'number' ||
      !Number.isFinite(p) ||
      p < FteCdiControllerV2.PRESSAO_FAIXA_MIN_BAR ||
      p > FteCdiControllerV2.PRESSAO_FAIXA_MAX_BAR;

    if (sinalInvalido) {
      await this.dispararInterlock(
        celula,
        'SCD-SEN-001',
        `SINAL DE PRESSÃO INVÁLIDO (${String(p)}): falha de sensor/comunicação, célula levada ao estado seguro`,
        'Sinal de pressão inválido'
      );
      return;
    }

    if (p >= (this.parametros.corteInterlockPressaoBar ?? 2.85)) {
      await this.dispararInterlock(
        celula,
        'SCD-SAF-001',
        `SOBREPRESSÃO CRÍTICA: ${p.toFixed(2)} bar >= Limite de Interlock ${(this.parametros.corteInterlockPressaoBar ?? 2.85).toFixed(2)} bar (Margem antes do limite estrutural de 3.00 bar)`,
        `Sobrepressão ${p.toFixed(2)} bar`
      );
    } else if (p >= (this.parametros.alertaPressaoAltaBar ?? 2.80) && !celula.interlockDisparado) {
      if (celula.status !== 'ALERTA') {
        celula.status = 'ALERTA';
        dbInstance.inserirAlarme(
          'ALERTA',
          `[ALERTA DE PRESSÃO] ${celula.codigo}: Pressão em ${p.toFixed(2)} bar (aproximando-se do teto de interlock de 2.80 bar).`
        );
      }
    }
  }

  private async dispararInterlock(
    celula: CelulaInfo,
    codigo: CodigoErro,
    motivoInterlock: string,
    motivoRele: string
  ): Promise<void> {
    if (celula.interlockDisparado) return;

    celula.interlockDisparado = true;
    celula.requerRearmeManual = true;
    celula.status = 'FALHA_INTERTRAVADA';
    celula.motivoInterlock = motivoInterlock;
    celula.tensaoV = 0.00;
    celula.correnteAmp = 0.00;
    celula.vazaoLh = 0.00;

    const cortado = await this.tentarCorteReles(celula, motivoRele);

    dbInstance.inserirAlarme(
      'CRITICO',
      cortado
        ? `[${codigo}] [INTERLOCK FÍSICO DISPARADO] ${celula.codigo}: ${motivoInterlock}. Fonte DC e Válvula de alimentação CORTADAS. REARME MANUAL OBRIGATÓRIO.`
        : `[${codigo}] [INTERLOCK DISPARADO] ${celula.codigo}: ${motivoInterlock}. Corte físico NÃO CONFIRMADO, veja alarme SCD-SAF-002. REARME MANUAL OBRIGATÓRIO.`,
      celula.id,
      codigo
    );
  }

  public async paradaEmergencia(operadorNome: string): Promise<void> {
    await Promise.all(
      this.celulas
        .filter(c => c.ativa)
        .map(c => this.dispararInterlock(c, 'SCD-SAF-003', `PARADA DE EMERGÊNCIA acionada por ${operadorNome}`, 'Parada de emergência'))
    );
  }

  private async tentarCorteReles(celula: CelulaInfo, motivo: string): Promise<boolean> {
    const falhas: string[] = [];

    for (const tipo of FteCdiControllerV2.RELES_INTERLOCK) {
      try {
        const ok = await this.relayDriver.cortarReleFisico(celula.id, tipo, motivo);
        const estado = await this.relayDriver.obterEstadoRele(celula.id, tipo);
        if (!ok || estado !== 'ABERTO') falhas.push(tipo);
      } catch (err) {
        console.error(`[SCD-SAF-002] Erro ao cortar ${tipo} da célula ${celula.id}:`, err);
        falhas.push(tipo);
      }
    }

    const jaFalhavaAntes = this.corteNaoConfirmado.has(celula.id);

    if (falhas.length > 0) {
      this.corteNaoConfirmado.set(celula.id, Date.now());
      if (!jaFalhavaAntes) {
        dbInstance.inserirAlarme(
          'CRITICO',
          `[SCD-SAF-002] FALHA NO CORTE FÍSICO em ${celula.codigo}: relés não confirmados como ABERTOS (${falhas.join(', ')}). Novas tentativas automáticas em andamento. Acione o corte manualmente e chame a manutenção.`,
          celula.id,
          'SCD-SAF-002'
        );
      }
      return false;
    }

    this.corteNaoConfirmado.delete(celula.id);
    if (jaFalhavaAntes) {
      dbInstance.inserirAlarme(
        'ALERTA',
        `[SCD-SAF-002] Corte físico confirmado em ${celula.codigo} após nova tentativa.`,
        celula.id,
        'SCD-SAF-002'
      );
    }
    return true;
  }

  private atualizarCicloProcesso(celula: CelulaInfo): void {
    if (celula.fluoretoOutPPM !== undefined) {
      celula.fluoretoOutPPM = celula.fluoretoOutPPM;
    }
    celula.tempoAcumuladoEtapaSeg = (celula.tempoAcumuladoEtapaSeg || 0) + 1;
    celula.tempoFaseAtualSegundos = (celula.tempoFaseAtualSegundos || 0) + 1;

    const r = razaoSegura(celula.fluoretoOutPPM, celula.fluoretoInPPM);
    const ef = eficienciaSegura(celula.fluoretoInPPM, celula.fluoretoOutPPM);
    if (r === null || ef === null) {
      celula.razaoBreakthrough = celula.razaoBreakthrough ?? 0;
      celula.eficienciaPct = 0;
    } else {
      celula.razaoBreakthrough = Number(r.toFixed(3));
      celula.eficienciaPct = Number(ef.toFixed(1));
    }

    if (celula.etapaAtual === 'ADSORCAO') {
      celula.status = 'OPERANDO_ADSORCAO';
      celula.tensaoV = 48.0;
      celula.correnteAmp = 12.5;
      if (celula.tempoAcumuladoEtapaSeg >= (this.parametros.duracaoEtapaAdsorcaoSeg ?? 1200)) {
        celula.etapaAtual = 'DESORCAO';
        celula.status = 'OPERANDO_DESORCAO';
        celula.tempoAcumuladoEtapaSeg = 0;
        celula.tempoFaseAtualSegundos = 0;
        dbInstance.inserirAlarme('INFO', `${celula.codigo}: Transição automática de Adsorção para Desorção/Purga.`);
      }
    } else if (celula.etapaAtual === 'DESORCAO') {
      celula.status = 'OPERANDO_DESORCAO';
      celula.tensaoV = -12.0; // Inversão de polaridade
      celula.correnteAmp = 8.0;
      if (celula.tempoAcumuladoEtapaSeg >= (this.parametros.duracaoEtapaDesorcaoSeg ?? 300)) {
        celula.etapaAtual = 'HIGIENIZACAO';
        celula.status = 'OPERANDO_HIGIENIZACAO';
        celula.tempoAcumuladoEtapaSeg = 0;
        celula.tempoFaseAtualSegundos = 0;
        dbInstance.inserirAlarme('INFO', `${celula.codigo}: Transição automática de Desorção para Higienização.`);
      }
    } else if (celula.etapaAtual === 'HIGIENIZACAO') {
      celula.status = 'OPERANDO_HIGIENIZACAO';
      celula.tensaoV = 0.0;
      celula.correnteAmp = 0.0;
      if (celula.tempoAcumuladoEtapaSeg >= (this.parametros.duracaoEtapaHigienizacaoSeg ?? 180)) {
        celula.etapaAtual = 'ADSORCAO';
        celula.status = 'OPERANDO_ADSORCAO';
        celula.tempoAcumuladoEtapaSeg = 0;
        celula.tempoFaseAtualSegundos = 0;
        dbInstance.inserirAlarme('INFO', `${celula.codigo}: Ciclo concluído. Retornando para Adsorção.`);
      }
    } else if (celula.etapaAtual === 'REGENERACAO') {
      celula.status = 'REGENERACAO';
      celula.tensaoV = 0.00;
      celula.correnteAmp = 0.00;
    }
  }

  /** Alarme de medição de fluoreto inválida (SCD-SEN-003), no máximo 1x por minuto por célula. */
  private alarmarMedicaoInvalida(celula: CelulaInfo): void {
    const chave = `${celula.id}:medicao-fluoreto`;
    const agora = Date.now();
    if (agora - (this.ultimaFalhaCiclo.get(chave) ?? 0) < 60_000) return;
    this.ultimaFalhaCiclo.set(chave, agora);
    dbInstance.inserirAlarme(
      'ALERTA',
      `[SCD-SEN-003] ${celula.codigo}: medição de fluoreto inválida (entrada ${String(celula.fluoretoInPPM)} ppm, saída ${String(celula.fluoretoOutPPM)} ppm). Breakthrough não avaliado nesta leitura; o timeout de adsorção segue ativo.`,
      celula.id,
      'SCD-SEN-003'
    );
  }

  /**
   * Máquina de estados para detecção de breakthrough e timeout da etapa de adsorção.
   */
  public verificarMaquinaEstadosBreakthrough(celula: CelulaInfo): void {
    if (celula.status === 'ADSORCAO') {
      const razao = razaoSegura(celula.fluoretoOutPPM, celula.fluoretoInPPM);

      // Critério 1: Razão F_out / F_in >= 0.90 com Debounce de 3 leituras.
      // Medição inválida (entrada 0/NaN etc.): a leitura NÃO conta nem zera o debounce (SCD-SEN-003);
      // o critério 2 (timeout de adsorção) continua protegendo a célula.
      if (razao === null) {
        this.alarmarMedicaoInvalida(celula);
      } else {
        celula.razaoBreakthrough = Number(razao.toFixed(3));
        if (razao >= (this.parametros.razaoBreakthroughLimite ?? 0.90)) {
          celula.leiturasConsecutivasBreakthrough = (celula.leiturasConsecutivasBreakthrough || 0) + 1;
        } else {
          celula.leiturasConsecutivasBreakthrough = 0;
        }
      }

      const timeoutSegundos = (this.parametros.timeoutAdsorcaoMinutos ?? 30) * 60;
      const atingiuDebounce = (celula.leiturasConsecutivasBreakthrough || 0) >= (this.parametros.debounceLeiturasConsecutivas ?? 3);
      const atingiuTimeout = (celula.tempoFaseAtualSegundos || 0) >= timeoutSegundos;

      if (atingiuDebounce || atingiuTimeout) {
        const motivo = atingiuDebounce
          ? `Breakthrough confirmado (Razão ${celula.razaoBreakthrough?.toFixed(2)} >= ${(this.parametros.razaoBreakthroughLimite ?? 0.90).toFixed(2)} em ${this.parametros.debounceLeiturasConsecutivas ?? 3} scans)`
          : `Timeout de segurança de adsorção (${this.parametros.timeoutAdsorcaoMinutos ?? 30} min)`;

        this.trocarFaseCelula(celula.id, 'REGENERACAO', motivo);
        dbInstance.inserirAlarme('INFO', `${celula.codigo}: ${motivo}`);
      }
    }
  }

  private registrarErroCiclo(celulaId: number, etapa: string, err: unknown): void {
    const chave = `${celulaId}:${etapa}`;
    const ult = this.ultimaFalhaCiclo.get(chave) || 0;
    if (Date.now() - ult > 30_000) {
      this.ultimaFalhaCiclo.set(chave, Date.now());
      dbInstance.inserirAlarme(
        'ALERTA',
        `[SCD-CTL-001] Falha isolada na etapa '${etapa}' da célula ${celulaId}: ${err instanceof Error ? err.message : String(err)}`,
        celulaId,
        'SCD-CTL-001'
      );
    }
  }

  public async rearmarInterlockManual(
    celulaId: number,
    usuario: Usuario,
    observacao: string
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    const celula = this.celulas.find(c => c.id === celulaId);
    if (!celula) return { sucesso: false, mensagem: 'Célula não encontrada.' };

    if (this.fontePressao?.ativa()) {
      const leitura = this.fontePressao.ler();
      if (leitura.qualidade !== 'BOA' || leitura.pressaoBar === null) {
        return {
          sucesso: false,
          mensagem: `BLOQUEIO: sem leitura confiável da pressão do CLP (${leitura.motivo ?? 'indisponível'}). Restabeleça a comunicação antes de rearmar.`
        };
      }
      celula.pressaoBar = leitura.pressaoBar;
      celula.fontePressao = 'CLP_REAL';
    }

    if (celula.pressaoBar >= (this.parametros.alertaPressaoAltaBar ?? 2.80)) {
      return {
        sucesso: false,
        mensagem: `BLOQUEIO FÍSICO DE SEGURANÇA: Pressão atual (${celula.pressaoBar.toFixed(2)} bar) acima do limite de rearme (${(this.parametros.alertaPressaoAltaBar ?? 2.80).toFixed(2)} bar).`
      };
    }

    const religouFonte = await this.relayDriver.rearmarReleFisico(celula.id, 'FONTE_DC', String(usuario.id), observacao);
    const religouValvula = await this.relayDriver.rearmarReleFisico(celula.id, 'VALVULA_ALIMENTACAO', String(usuario.id), observacao);
    if (!religouFonte || !religouValvula) {
      return {
        sucesso: false,
        mensagem: `FALHA NO REARME FÍSICO: ${[!religouFonte && 'Fonte DC', !religouValvula && 'Válvula/Bomba'].filter(Boolean).join(' e ')} não confirmado(s) pelo equipamento. A célula permanece intertravada. Verifique o E-STOP e a comunicação com o CLP.`
      };
    }

    this.corteNaoConfirmado.delete(celula.id);
    celula.interlockDisparado = false;
    celula.requerRearmeManual = false;
    celula.motivoInterlock = null;
    celula.status = 'OPERANDO_ADSORCAO';
    celula.etapaAtual = 'ADSORCAO';
    celula.tempoAcumuladoEtapaSeg = 0;

    dbInstance.inserirAlarme(
      'INFO',
      `[REARME DE SEGURANÇA HOMOLOGADO] Célula ${celula.codigo} rearmada por ${usuario.nome} (${usuario.matricula}). Obs: ${observacao}`
    );

    return { sucesso: true, mensagem: `Célula ${celula.codigo} rearmada com sucesso.` };
  }

  public async rearmarCelulaManualmente(
    celulaId: number,
    usuario: Usuario,
    observacao: string
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    return this.rearmarInterlockManual(celulaId, usuario, observacao);
  }

  public obterResumoGlobal(): RackResumoGlobal {
    const ativas = this.celulas.filter(c => c.ativa);
    const nAtivas = ativas.length;
    if (nAtivas === 0) {
      return {
        totalCelulas: this.celulas.length,
        celulasAtivas: 0,
        celulasEmAdsorcao: 0,
        celulasEmRegeneracao: 0,
        celulasEmAlerta: 0,
        celulasIntertravadas: 0,
        vazaoTotalLh: 0,
        vazaoTotalM3h: 0,
        pressaoMediaBar: 0,
        correnteTotalAmp: 0,
        potenciaTotalKw: 0,
        fluoretoInMedioPPM: 8.5,
        fluoretoOutMedioPPM: 1.1,
        eficienciaMediaPct: 87.0,
        conformidadeGeralPortaria888: true,
        statusGeralSeguranca: 'NORMAL'
      };
    }

    const intertravadas = ativas.filter(c => c.interlockDisparado).length;
    const emAlerta = ativas.filter(c => c.status === 'ALERTA').length;
    const emAdsorcao = ativas.filter(c => c.etapaAtual === 'ADSORCAO' || c.status === 'OPERANDO_ADSORCAO').length;
    const emRegeneracao = ativas.filter(c => c.etapaAtual === 'DESORCAO' || c.etapaAtual === 'HIGIENIZACAO' || c.status === 'OPERANDO_DESORCAO').length;

    const vazaoTotalLh = ativas.reduce((acc, c) => acc + (c.vazaoLh || 0), 0);
    const pressaoSuma = ativas.reduce((acc, c) => acc + (c.pressaoBar || 0), 0);
    const correnteTotalAmp = ativas.reduce((acc, c) => acc + (c.correnteAmp || 0), 0);
    const tensaoMedia = ativas.reduce((acc, c) => acc + (c.tensaoV || 0), 0) / nAtivas;
    const potenciaTotalKw = (correnteTotalAmp * Math.abs(tensaoMedia)) / 1000;

    const fInSum = ativas.reduce((acc, c) => acc + (c.fluoretoInPPM ?? 8.5), 0);
    const fOutSum = ativas.reduce((acc, c) => acc + (c.fluoretoOutPPM ?? 1.1), 0);

    const fInMedio = fInSum / nAtivas;
    const fOutMedio = fOutSum / nAtivas;
    const efMedio = eficienciaSegura(fInMedio, fOutMedio) ?? 0;

    const conformidade = fOutMedio <= 1.5;

    let statusSeg: 'NORMAL' | 'ALERTA' | 'INTERLOCK_PARCIAL' | 'PARADA_EMERGENCIA' = 'NORMAL';
    if (intertravadas === nAtivas && nAtivas > 0) statusSeg = 'PARADA_EMERGENCIA';
    else if (intertravadas > 0) statusSeg = 'INTERLOCK_PARCIAL';
    else if (emAlerta > 0) statusSeg = 'ALERTA';

    return {
      totalCelulas: this.celulas.length,
      celulasAtivas: nAtivas,
      celulasEmAdsorcao: emAdsorcao,
      celulasEmRegeneracao: emRegeneracao,
      celulasEmAlerta: emAlerta,
      celulasIntertravadas: intertravadas,
      vazaoTotalLh,
      vazaoTotalM3h: vazaoTotalLh / 1000,
      pressaoMediaBar: pressaoSuma / nAtivas,
      correnteTotalAmp,
      potenciaTotalKw,
      fluoretoInMedioPPM: fInMedio,
      fluoretoOutMedioPPM: fOutMedio,
      eficienciaMediaPct: Number(efMedio.toFixed(1)),
      conformidadeGeralPortaria888: conformidade,
      statusGeralSeguranca: statusSeg
    };
  }

  public obterDataPointsWatchlist(): DataPointTag[] {
    const tags: DataPointTag[] = [];
    this.celulas.forEach(c => {
      tags.push({
        id: `tag-${c.id}-p`,
        tagPath: `Rack_FTE_CDI.${c.codigo}.PT_01_Pressao`,
        nome: `${c.codigo}.Pressao`,
        categoria: 'CELULAS',
        tipoDado: 'FLOAT',
        unidade: 'bar',
        valorAtual: c.pressaoBar,
        valorFormatado: `${c.pressaoBar.toFixed(2)} bar`,
        qualidade: c.interlockDisparado ? 'BAD' : 'GOOD',
        isSettable: false,
        isOverridden: false,
        dataFonte: 'CLP_PRINCIPAL_MODBUS_TCP',
        ultimoScan: new Date().toISOString(),
        descricao: `Pressão no Plenum da Célula ${c.codigo}`
      });
    });
    return tags;
  }

  public adicionarCelula(config?: any): CelulaInfo {
    const novoId = this.celulas.length + 1;
    const linha = Math.ceil(novoId / 4);
    const coluna = ((novoId - 1) % 4) + 1;
    const nova: CelulaInfo = {
      id: novoId,
      codigo: `CEL-${String(novoId).padStart(2, '0')}`,
      posicao_rack: novoId,
      linhaRack: linha,
      colunaRack: coluna,
      pares_eletrodo: 146,
      status: 'OPERANDO_ADSORCAO',
      etapaAtual: 'ADSORCAO',
      tempoAcumuladoEtapaSeg: 0,
      pressaoBar: 2.15,
      vazaoLh: 1450,
      tensaoV: 48,
      correnteAmp: 12.5,
      interlockDisparado: false,
      requerRearmeManual: false,
      motivoInterlock: null,
      ativa: true
    };
    this.celulas.push(nova);
    return nova;
  }

  public removerCelula(celulaId: number): void {
    const idx = this.celulas.findIndex(c => c.id === celulaId);
    if (idx !== -1) {
      this.celulas.splice(idx, 1);
    }
  }

  public alternarStatusAtivacaoCelula(celulaId: number, ativa: boolean): void {
    const celula = this.celulas.find(c => c.id === celulaId);
    if (celula) {
      celula.ativa = ativa;
    }
  }

  public forcarValorDataPoint(tagId: string, valor: number | boolean): void {
  }

  public limparForcamentoDataPoint(tagId: string): void {
  }

  public atualizarParametrosProcesso(params: Partial<ParametrosProcesso>, usuarioAtual?: any): { sucesso: boolean; mensagem: string } {
    this.parametros = { ...this.parametros, ...params };
    return { sucesso: true, mensagem: 'Parâmetros de processo atualizados.' };
  }

  public calcularBalancoManifold(): any {
    const ativas = this.celulas.filter(c => c.ativa);
    const vazaoTotal = ativas.reduce((a, c) => a + (c.vazaoLh || 0), 0);
    const vazaoMedia = ativas.length > 0 ? vazaoTotal / ativas.length : 0;
    return {
      vazaoTotalLh: vazaoTotal,
      vazaoMediaPorCelulaLh: vazaoMedia,
      desvioMaximoPct: 2.5,
      equilibrado: true
    };
  }

  public trocarFaseCelula(celulaId: number, novaFase: string, observacao?: string): void {
    const celula = this.celulas.find(c => c.id === celulaId);
    if (celula && !celula.interlockDisparado) {
      celula.etapaAtual = novaFase;
      celula.status = novaFase as any;
      celula.tempoAcumuladoEtapaSeg = 0;
      celula.tempoFaseAtualSegundos = 0;
    }
  }
}

export const controllerV2Instance = new FteCdiControllerV2(
  new RelayDriverHibrido(new IndustrialRelayDriver()),
  new FontePressaoPlc()
);
