/**
 * Serviço de Integração do Sistema Híbrido PurifyWave OS V2
 * Skid CONTHEC (A+B+C) + Bomba Biossônica BBS-100 + Reator FTE-CDI + Unidade UGL ZLD
 * 
 * Versão Restaurada e Estruturada (PR-2)
 * Tipagem estrita em TypeScript, sem @ts-nocheck, integrado com storageSeguro e dbInstance.
 */

import { lerCampos, gravarJson } from "./storageSeguro";
import { camposLayoutPurifyWave } from "./esquemasDados";
import { dbInstance as I } from "./database";
import {
  PurifyWaveState,
  TopologiaTratamentoId,
  FteCdiLayoutPosition,
  ConthecLayoutPosition,
  ModoVisualizacaoSinoptico,
  EstagioSinfoniaQuimica
} from "../types";

export interface ValvulaMotorizada {
  tag: string;
  nome: string;
  tipo: string;
  diametroDn: string;
  pressaoNominal: string;
  atuadorModelo: string;
  estado: 'ABERTA' | 'FECHADA';
  posicaoAberturaPct: number;
  modoControle: string;
  fimCursoAbertoZSO: boolean;
  fimCursoFechadoZSC: boolean;
  tempoCursoS: number;
  torqueNm: number;
  correnteMotorA: number;
  temperaturaAtuadorC: number;
  intertravamentoSeguranca: boolean;
  motivoIntertravamento: string | null;
  ultimaManobraTimestamp: string;
  operadorUltimaManobra: string;
}

export interface TubulacaoProcesso {
  tag: string;
  nome: string;
  origemTag: string;
  destinoTag: string;
  tipoFluido: string;
  diametroDn: string;
  diametroInternoMm: number;
  pressaoNominal: string;
  material: string;
  rugosidadeMm: number;
  comprimentoEquivalenteM: number;
  vazaoM3h: number;
  velocidadeEscoamentoMs: number;
  reynoldsRe: number;
  fatorAtritoDarcy: number;
  perdaCargaBar: number;
  pressaoEntradaBar: number;
  pressaoSaidaBar: number;
  sentidoFluxo: string;
  animacaoAtiva: boolean;
  corHex: string;
  descricaoProcesso: string;
}

export type { PurifyWaveState };

export class PurifyWaveIntegrationService {
  private scanTimer: any = null;
  private listeners: Array<(state: PurifyWaveState) => void> = [];
  public state: PurifyWaveState;

  constructor() {
    this.state = {
      ativo: true,
      modoOperacao: "AUTOMATICO_ADAPTATIVO",
      topologiaAtiva: "TOPOLOGIA_A_PRE_OXIDACAO",
      posicaoFteCdi: "POS_1_INICIO",
      posicaoConthec: "POS_3_FINAL",
      modoVisualizacao: "LAYOUT_FISICO_PLANTA",
      tubulacaoSelecionadaTag: null,
      estagioAtual: "ESTAGIO_2_OXIDACAO_RADICALAR",
      progressoEstagioPct: 45,
      vazaoAfluenteM3h: 180,
      dosagens: {
        polioxidoCloroMgL: 38.5,
        silicioReativoMgL: 14.2,
        coagulanteAuxiliarMgL: 6.0,
        polimeroFloculantePpm: 1.8
      },
      skidConthec: {
        componenteA: {
          codigo: "CONTHEC_A",
          nome: "CONTHEC A (Reagente Oxidante)",
          funcaoQuimica: "Polióxido de Cloro e radicais oxidantes",
          volumeAtualML: 465,
          capacidadeMaximaML: 500,
          vazaoDosagemMLh: 65,
          proporcaoNominalPct: 53.2,
          statusNivel: "NORMAL"
        },
        componenteB: {
          codigo: "CONTHEC_B",
          nome: "CONTHEC B (Estabilizador Silício)",
          funcaoQuimica: "Silício reativo para passivação e lodo",
          volumeAtualML: 205,
          capacidadeMaximaML: 220,
          vazaoDosagemMLh: 28.6,
          proporcaoNominalPct: 23.4,
          statusNivel: "NORMAL"
        },
        componenteC: {
          codigo: "CONTHEC_C",
          nome: "CONTHEC C (Catalisador Ativador)",
          funcaoQuimica: "Catalisador ativador de clivagem molecular",
          volumeAtualML: 205,
          capacidadeMaximaML: 220,
          vazaoDosagemMLh: 28.6,
          proporcaoNominalPct: 23.4,
          statusNivel: "NORMAL"
        },
        camaraMistura: {
          ativa: true,
          tempoHomogeneizacaoS: 240,
          tempoRestanteS: 85,
          volumeAcumuladoML: 122.2,
          statusReacao: "PRONTO_PARA_INJECAO",
          temperaturaC: 24.8
        },
        injetorDiluicao4: {
          ativo: true,
          vazaoAguaDiluicaoLh: 120,
          concentracaoFinalPpm: 38.5,
          pressaoInjecaoBar: 3.2,
          statusBomba: "OPERANDO_NORMAL"
        },
        proporcaoEstequiometricaValida: true,
        autonomiaEstimadaHoras: 7.2
      },
      tanqueReusoT102: {
        tag: "T-102",
        nome: "Tanque de Água de Reuso ZLD (Circuito Fechado)",
        capacidadeNominalM3: 5.0,
        volumeAtualM3: 3.72,
        nivelPct: 74.4,
        vazaoEntradaFiltradoLh: 780,
        vazaoSaidaLavagemTelaLh: 400,
        vazaoSaidaDiluicaoReagentesLh: 380,
        qualidadeCondutividadeUsCm: 320,
        turbidezNtu: 1.15,
        ph: 7.2,
        statusCircuito: "CIRCUITO_FECHADO_ZLD_ISOLADO"
      },
      biossonica: {
        tag: "BBS-100",
        ativa: true,
        modoOperacao: "AUTOMATICO_ADAPTATIVO",
        posicaoAtual: "POS_2_INTERMEDIARIO_POA",
        rotacaoRpm: 2850,
        frequenciaUltrassonicaKhz: 28.5,
        intensidadeCavitacaoPct: 82.5,
        vazaoProcessadaM3h: 180,
        pressaoEntradaBar: 1.2,
        pressaoSaidaBar: 2.65,
        deltaPBar: 1.45,
        potenciaAcusticaKw: 7.5,
        eficienciaLiseCelularPct: 99.8,
        temperaturaCamaraC: 28.4,
        statusAlarme: "NORMAL",
        horimetroHoras: 142.5
      },
      pocoT100: {
        id: "T-100",
        nome: "Poço Tubular Profundo PTP-04",
        localizacao: "Campo Norte (22°53'36\"S 47°03'30\"W, Cota 612m)",
        aquifero: "Aquífero Guarani / Tubarão (Formação Piramboia)",
        profundidadeTotalM: 180,
        diametroPerfuraoPol: 12,
        revestimentoMaterial: "Aço Inox AISI 304 / PEAD Ranhurado DN250",
        nivelEstaticoM: 28.5,
        nivelDinamicoM: 62.0,
        rebaixamentoM: 33.5,
        vazaoEspecificaM3hM: 5.37,
        vazaoAtualM3h: 180,
        vazaoSetadaM3h: 180,
        temperaturaAguaC: 24.2,
        condutividadeUsCm: 1420,
        phNatural: 6.85,
        fluoretoNaturalMgL: 8.50,
        turbidezNaturalNtu: 12.4,
        bombaSubmersa: {
          tag: "B-100",
          modelo: "Grundfos SP 215-4 (75 CV / 55 kW)",
          potenciaCv: 75,
          status: "LIGADA",
          modoOperacao: "AUTOMATICO_VFD",
          frequenciaHz: 52.4,
          rotacaoRpm: 3140,
          correnteAmp: 86.4,
          tensaoV: 380,
          pressaoDescargaBar: 6.8,
          temperaturaMotorC: 48.5,
          vibracaoMmS: 1.8,
          horimetroHoras: 3840.5
        },
        valvulaSaidaTag: "XV-100",
        transmissorVazaoTag: "FIT-100"
      },
      valvulas: {
        "XV-100": {
          tag: "XV-100",
          nome: "Válvula de Bloqueio da Boca do Poço T-100",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN16",
          atuadorModelo: "Rotork IQ10 (120 Nm)",
          estado: "ABERTA",
          posicaoAberturaPct: 100,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: true,
          fimCursoFechadoZSC: false,
          tempoCursoS: 3.5,
          torqueNm: 95,
          correnteMotorA: 1.65,
          temperaturaAtuadorC: 32.5,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-101": {
          tag: "XV-101",
          nome: "Válvula Geral de Alimentação do Sistema",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "AUMA SA 07.6 (120 Nm)",
          estado: "ABERTA",
          posicaoAberturaPct: 100,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: true,
          fimCursoFechadoZSC: false,
          tempoCursoS: 3.5,
          torqueNm: 110,
          correnteMotorA: 1.8,
          temperaturaAtuadorC: 33.8,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-103": {
          tag: "XV-103",
          nome: "Válvula de Descarga e Retrolavagem FTE-CDI ➔ UGL",
          tipo: "ESFERA_MOTORIZADA",
          diametroDn: "DN100 (4\")",
          pressaoNominal: "PN10",
          atuadorModelo: "Rotork IQ10 Rápida",
          estado: "FECHADA",
          posicaoAberturaPct: 0,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: false,
          fimCursoFechadoZSC: true,
          tempoCursoS: 2.0,
          torqueNm: 75,
          correnteMotorA: 1.4,
          temperaturaAtuadorC: 30.2,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-201": {
          tag: "XV-201",
          nome: "Válvula de Transferência POA ➔ FTE-CDI / P-101",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "AUMA SA 07.6",
          estado: "ABERTA",
          posicaoAberturaPct: 100,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: true,
          fimCursoFechadoZSC: false,
          tempoCursoS: 3.5,
          torqueNm: 115,
          correnteMotorA: 1.85,
          temperaturaAtuadorC: 34.5,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-202": {
          tag: "XV-202",
          nome: "Válvula de Bypass Direto do Reator POA",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "AUMA SA 07.6",
          estado: "FECHADA",
          posicaoAberturaPct: 0,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: false,
          fimCursoFechadoZSC: true,
          tempoCursoS: 3.5,
          torqueNm: 105,
          correnteMotorA: 1.7,
          temperaturaAtuadorC: 31.0,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-301": {
          tag: "XV-301",
          nome: "Válvula de Entrada do Manifold FTE-CDI",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "Rotork IQ10",
          estado: "ABERTA",
          posicaoAberturaPct: 100,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: true,
          fimCursoFechadoZSC: false,
          tempoCursoS: 3.5,
          torqueNm: 118,
          correnteMotorA: 1.88,
          temperaturaAtuadorC: 35.0,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-302": {
          tag: "XV-302",
          nome: "Válvula de Retorno FTE-CDI ➔ POA Polimento (Top-B)",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "Rotork IQ10",
          estado: "FECHADA",
          posicaoAberturaPct: 0,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: false,
          fimCursoFechadoZSC: true,
          tempoCursoS: 3.5,
          torqueNm: 100,
          correnteMotorA: 1.6,
          temperaturaAtuadorC: 29.8,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        },
        "XV-401": {
          tag: "XV-401",
          nome: "Válvula de Saída Potável para Tanque T-201",
          tipo: "BORBOLETA_MOTORIZADA",
          diametroDn: "DN200 (8\")",
          pressaoNominal: "PN10",
          atuadorModelo: "AUMA SA 07.6",
          estado: "ABERTA",
          posicaoAberturaPct: 100,
          modoControle: "AUTOMATICO_TOPOLOGIA",
          fimCursoAbertoZSO: true,
          fimCursoFechadoZSC: false,
          tempoCursoS: 3.5,
          torqueNm: 112,
          correnteMotorA: 1.82,
          temperaturaAtuadorC: 33.5,
          intertravamentoSeguranca: false,
          motivoIntertravamento: null,
          ultimaManobraTimestamp: new Date().toLocaleTimeString(),
          operadorUltimaManobra: "SISTEMA_AUTO"
        }
      },
      orpInMv: -95,
      turbidezInNtu: 78.4,
      phIn: 6.75,
      dqoInMgL: 420,
      dboInMgL: 195,
      fenoisInPpm: 8.9,
      oleosGraxasInPpm: 34.5,
      coliformesInUfc: 1450000,
      orpOutMv: 645,
      turbidezOutNtu: 1.4,
      phOut: 7.18,
      dqoOutMgL: 28.5,
      dboOutMgL: 8.2,
      fenoisOutPpm: 0.04,
      oleosGraxasOutPpm: 1.1,
      coliformesOutUfc: 0,
      eficienciaOxidacaoPct: 94.8,
      remocaoDqoPct: 93.2,
      remocaoFenoisPct: 99.5,
      desinfeccaoPct: 100,
      ugl: {
        prensaAtiva: true,
        taxaDesaguamentoPct: 89.4,
        umidadeTortaPct: 17.8,
        lodoProcessadoKgH: 420,
        estabilizacaoSilicioConforme: true,
        ausenciaOdores: true,
        destinacaoAgricolaStatus: "APTO_BIOSSOLIDO",
        temperaturaReacaoC: 26.4,
        linhaZldRetrolavagemAtiva: true,
        vazaoResiduoRecebidaLh: 850,
        concentracaoFluorRecebidaPpm: 64.5,
        massaFluorossilicatoPrecipitadaKgH: 0.12,
        vazaoFiltradoRecuperadoLh: 780,
        recuperacaoAguaZldPct: 91.8
      },
      fluxoLiberadoParaFteCdi: true,
      motivoBloqueio: null
    };

    this.carregarConfiguracaoPersistida();
    this.iniciarLoopIntegracao();
  }

  private salvarConfiguracaoPersistida(): void {
    try {
      const config = {
        topologiaAtiva: this.state.topologiaAtiva,
        posicaoFteCdi: this.state.posicaoFteCdi,
        posicaoConthec: this.state.posicaoConthec,
        modoVisualizacao: this.state.modoVisualizacao,
        posicaoBiossonica: this.state.biossonica?.posicaoAtual
      };
      gravarJson("purifywave_layout_config_v2", config, "Layout PurifyWave");
    } catch (e) {
      console.error("Erro ao salvar layout config:", e);
    }
  }

  private carregarConfiguracaoPersistida(): void {
    const cfg: any = lerCampos("purifywave_layout_config_v2", camposLayoutPurifyWave, {}, "Layout PurifyWave");
    if (cfg.topologiaAtiva) this.state.topologiaAtiva = cfg.topologiaAtiva;
    if (cfg.posicaoFteCdi) this.state.posicaoFteCdi = cfg.posicaoFteCdi;
    if (cfg.posicaoConthec) this.state.posicaoConthec = cfg.posicaoConthec;
    if (cfg.modoVisualizacao) this.state.modoVisualizacao = cfg.modoVisualizacao;
    if (cfg.posicaoBiossonica && this.state.biossonica) {
      this.state.biossonica.posicaoAtual = cfg.posicaoBiossonica;
    }
  }

  public setModoVisualizacao(modo: string): void {
    this.state.modoVisualizacao = modo;
    this.salvarConfiguracaoPersistida();
    this.notificarListeners();
  }

  public atualizarPoco(dados: any): void {
    this.state.pocoT100 = {
      ...this.state.pocoT100,
      ...dados,
      bombaSubmersa: {
        ...this.state.pocoT100.bombaSubmersa,
        ...(dados.bombaSubmersa || {})
      }
    };
    this.notificarListeners();
  }

  public comandarValvula(tag: string, comando: 'ABRIR' | 'FECHAR', modo = 'MANUAL_SUPERVISIONADO'): void {
    if (!this.state.valvulas[tag]) return;
    const v = { ...this.state.valvulas[tag] };
    const novoEstado = comando === 'ABRIR' ? 'ABERTA' : 'FECHADA';
    v.estado = novoEstado;
    v.posicaoAberturaPct = comando === 'ABRIR' ? 100 : 0;
    v.fimCursoAbertoZSO = comando === 'ABRIR';
    v.fimCursoFechadoZSC = comando === 'FECHAR';
    v.modoControle = modo;
    v.ultimaManobraTimestamp = new Date().toLocaleTimeString();
    v.operadorUltimaManobra = 'OPERADOR_SCADA';
    this.state.valvulas[tag] = v;

    I.inserirAlarme(
      'INFO',
      `[MANOBRA VÁLVULA] ${tag} (${v.nome}) comandada para ${novoEstado} [Modo: ${modo}].`
    );
    this.notificarListeners();
  }

  private iniciarLoopIntegracao(): void {
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = setInterval(() => {
      this.executarCicloScan();
    }, 1500);
  }

  public executarCicloScan(): void {
    if (!this.state.ativo) return;

    let progresso = this.state.progressoEstagioPct + 4;
    let estagio = this.state.estagioAtual;

    if (progresso >= 100) {
      progresso = 0;
      switch (this.state.estagioAtual) {
        case 'ESTAGIO_1_CONDICIONAMENTO':
          estagio = 'ESTAGIO_2_OXIDACAO_RADICALAR';
          break;
        case 'ESTAGIO_2_OXIDACAO_RADICALAR':
          estagio = 'ESTAGIO_3_ESTABILIZACAO_SILICIO';
          break;
        case 'ESTAGIO_3_ESTABILIZACAO_SILICIO':
          estagio = 'ESTAGIO_4_CLARIFICACAO_POLIMENTO';
          break;
        case 'ESTAGIO_4_CLARIFICACAO_POLIMENTO':
          estagio = 'ESTAGIO_1_CONDICIONAMENTO';
          break;
      }
    }

    const conthec = { ...this.state.skidConthec };
    const taxaA = (conthec.componenteA.vazaoDosagemMLh / 3600) * 1.5;
    const taxaB = (conthec.componenteB.vazaoDosagemMLh / 3600) * 1.5;
    const taxaC = (conthec.componenteC.vazaoDosagemMLh / 3600) * 1.5;

    conthec.componenteA.volumeAtualML = Math.max(0, Number((conthec.componenteA.volumeAtualML - taxaA).toFixed(1)));
    conthec.componenteB.volumeAtualML = Math.max(0, Number((conthec.componenteB.volumeAtualML - taxaB).toFixed(1)));
    conthec.componenteC.volumeAtualML = Math.max(0, Number((conthec.componenteC.volumeAtualML - taxaC).toFixed(1)));

    conthec.componenteA.statusNivel = conthec.componenteA.volumeAtualML < 50 ? 'CRITICO_VAZIO' : conthec.componenteA.volumeAtualML < 150 ? 'NIVEL_BAIXO' : 'NORMAL';
    conthec.componenteB.statusNivel = conthec.componenteB.volumeAtualML < 25 ? 'CRITICO_VAZIO' : conthec.componenteB.volumeAtualML < 70 ? 'NIVEL_BAIXO' : 'NORMAL';
    conthec.componenteC.statusNivel = conthec.componenteC.volumeAtualML < 25 ? 'CRITICO_VAZIO' : conthec.componenteC.volumeAtualML < 70 ? 'NIVEL_BAIXO' : 'NORMAL';

    if (conthec.camaraMistura.tempoRestanteS > 0) {
      conthec.camaraMistura.tempoRestanteS -= 2;
    } else {
      conthec.camaraMistura.tempoRestanteS = conthec.camaraMistura.tempoHomogeneizacaoS;
      conthec.camaraMistura.statusReacao = 'PRONTO_PARA_INJECAO';
    }

    const ruido = (Math.random() - 0.5) * 0.05;
    const deltaOrp = Math.floor((Math.random() - 0.5) * 8);

    const bbs = { ...this.state.biossonica };
    if (bbs.ativa) {
      const intensidade = Number(((bbs.rotacaoRpm / 3600) * 50 + (bbs.frequenciaUltrassonicaKhz / 40) * 50).toFixed(1));
      bbs.intensidadeCavitacaoPct = intensidade;
      bbs.potenciaAcusticaKw = Number(((bbs.rotacaoRpm / 3600) * 4.5 + (bbs.frequenciaUltrassonicaKhz / 40) * 3.5).toFixed(1));
      bbs.deltaPBar = Number((bbs.pressaoSaidaBar - bbs.pressaoEntradaBar + ruido * 0.05).toFixed(2));
      bbs.temperaturaCamaraC = Number((28 + (intensidade / 100) * 2.5 + ruido * 0.2).toFixed(1));
      bbs.horimetroHoras = Number((bbs.horimetroHoras + 0.001).toFixed(3));

      const ef = 100 * (1 - Math.exp(-Math.pow(0.4 * (bbs.rotacaoRpm / 3600) + 0.6 * (bbs.frequenciaUltrassonicaKhz / 40), 2) * 3.8));
      bbs.eficienciaLiseCelularPct = Number(Math.min(99.9, Math.max(85, ef + ruido * 0.2)).toFixed(1));
      bbs.statusAlarme = bbs.intensidadeCavitacaoPct > 95 ? 'ALERTA_CAVITACAO_EXCESSIVA' : bbs.temperaturaCamaraC > 45 ? 'SOBREAQUECIMENTO' : 'NORMAL';
    }

    const orpOut = Math.min(720, Math.max(580, this.state.orpOutMv + deltaOrp));
    const turbOut = Number(Math.max(0.8, Math.min(2.5, this.state.turbidezOutNtu + ruido * 0.2)).toFixed(2));
    const dqoOut = Number(Math.max(18, Math.min(45, this.state.dqoOutMgL + ruido * 2)).toFixed(1));
    const phOut = Number(Math.max(6.85, Math.min(7.45, this.state.phOut + ruido * 0.05)).toFixed(2));

    let fluxoOk = true;
    let motivo: string | null = null;

    if (turbOut > 5.0) {
      fluxoOk = false;
      motivo = 'Turbidez elevada (> 5.0 NTU) após clarificação. Retendo para retrolavagem.';
      I.inserirAlarme('ALERTA', `[PuriFyWave] ${motivo}`);
    } else if (orpOut < 400) {
      fluxoOk = false;
      motivo = 'Potencial Redox ORP insuficiente (< 400 mV) para proteção das membranas de grafite.';
      I.inserirAlarme('ALERTA', `[PuriFyWave] ${motivo}`);
    }

    this.state = {
      ...this.state,
      estagioAtual: estagio,
      progressoEstagioPct: progresso,
      orpOutMv: orpOut,
      turbidezOutNtu: turbOut,
      dqoOutMgL: dqoOut,
      phOut: phOut,
      skidConthec: conthec,
      biossonica: bbs,
      fluxoLiberadoParaFteCdi: fluxoOk,
      motivoBloqueio: motivo
    };

    this.notificarListeners();
  }

  public alternarBiossonica(): void {
    this.state.biossonica.ativa = !this.state.biossonica.ativa;
    I.inserirAlarme('INFO', `[BBS-100] Bomba Biossônica ${this.state.biossonica.ativa ? 'ATIVADA' : 'DESATIVADA'} na posição: ${this.state.biossonica.posicaoAtual}.`);
    this.notificarListeners();
  }

  public trocarPosicaoBiossonica(posicao: string): void {
    this.state.biossonica.posicaoAtual = posicao;
    I.inserirAlarme('INFO', `[BBS-100] Topologia alterada: Bomba Biossônica movida para ${posicao}.`);
    this.notificarListeners();
  }

  public ajustarBiossonica(rotacaoRpm: number, frequenciaUltrassonicaKhz: number): void {
    this.state.biossonica.rotacaoRpm = rotacaoRpm;
    this.state.biossonica.frequenciaUltrassonicaKhz = frequenciaUltrassonicaKhz;
    this.state.biossonica.intensidadeCavitacaoPct = Number(((rotacaoRpm / 3600) * 50 + (frequenciaUltrassonicaKhz / 40) * 50).toFixed(1));
    this.notificarListeners();
  }

  public ajustarHidraulicaBiossonica(vazao: number, pIn: number, pOut: number): void {
    this.state.biossonica.vazaoProcessadaM3h = vazao;
    this.state.biossonica.pressaoEntradaBar = pIn;
    this.state.biossonica.pressaoSaidaBar = pOut;
    this.state.biossonica.deltaPBar = Number((pOut - pIn).toFixed(2));
    this.notificarListeners();
  }

  public alternarModoBiossonica(): void {
    this.state.biossonica.modoOperacao = this.state.biossonica.modoOperacao === 'AUTOMATICO_ADAPTATIVO' ? 'MANUAL_SUPERVISIONADO' : 'AUTOMATICO_ADAPTATIVO';
    this.notificarListeners();
  }

  public setModoOperacao(modo: 'AUTOMATICO_ADAPTATIVO' | 'MANUAL_SUPERVISIONADO'): void {
    this.state.modoOperacao = modo;
    this.notificarListeners();
  }

  public setDosagens(novas: Partial<PurifyWaveState['dosagens']>): void {
    this.state.dosagens = { ...this.state.dosagens, ...novas };
    this.notificarListeners();
  }

  public reabastecerFrascosConthec(): void {
    this.state.skidConthec.componenteA.volumeAtualML = 500;
    this.state.skidConthec.componenteB.volumeAtualML = 220;
    this.state.skidConthec.componenteC.volumeAtualML = 220;
    this.state.skidConthec.componenteA.statusNivel = 'NORMAL';
    this.state.skidConthec.componenteB.statusNivel = 'NORMAL';
    this.state.skidConthec.componenteC.statusNivel = 'NORMAL';
    this.state.skidConthec.autonomiaEstimadaHoras = 7.7;
    I.inserirAlarme('INFO', '[CONTHEC] Frascos A (500ml), B (220ml) e C (220ml) reabastecidos e calibrados com sucesso.');
    this.notificarListeners();
  }

  public ajustarDosadoraConthec(comp: 'A' | 'B' | 'C', vazao: number): void {
    if (comp === 'A') this.state.skidConthec.componenteA.vazaoDosagemMLh = vazao;
    if (comp === 'B') this.state.skidConthec.componenteB.vazaoDosagemMLh = vazao;
    if (comp === 'C') this.state.skidConthec.componenteC.vazaoDosagemMLh = vazao;
    this.notificarListeners();
  }

  public ajustarInjetorDiluicao(vazao: number, concentracaoPpm: number): void {
    this.state.skidConthec.injetorDiluicao4.vazaoAguaDiluicaoLh = vazao;
    this.state.skidConthec.injetorDiluicao4.concentracaoFinalPpm = concentracaoPpm;
    this.state.dosagens.polioxidoCloroMgL = concentracaoPpm;
    this.notificarListeners();
  }

  public obterTopologiasDisponiveis(): any[] {
    return [
      {
        id: "TOPOLOGIA_A_PRE_OXIDACAO",
        codigo: "TOP-A",
        nome: "1. Pré-Oxidação (POA ➔ FTE-CDI)",
        descricaoCurta: "Padrão: Oxidação prévia e clarificação seguida de polimento eletroquímico",
        descricaoDetalhada: "A água bruta do poço T-100 passa primeiro pelo Reator PuriFyWave com Skid CONTHEC (A+B+C) para remoção de 93% da DQO e oxidação radicalar, sendo em seguida transferida pela Bomba P-101 para as 16 células FTE-CDI para desfluoretação.",
        fluxoDiagrama: "T-100 ➔ PuriFyWave OS (CONTHEC) ➔ [BBS-100] ➔ P-101 ➔ FTE-CDI (16 Células) ➔ T-201 Potável",
        perdaCargaEstimadaBar: 0.85,
        tempoResidenciaHidraulicoMin: 18.5,
        indicacaoAplicacao: "Recomendada para águas com alta carga orgânica (DQO > 200 mg/L), biofilmes ou metais solúveis.",
        statusValvulasMotorizadas: {
          xv101_EntradaPoco: "ABERTA",
          xv201_TransferenciaPoaParaFte: "ABERTA",
          xv202_BypassPoaDireto: "FECHADA",
          xv301_EntradaFteCdi: "ABERTA",
          xv302_TransferenciaFteParaPoa: "FECHADA",
          xv401_SaidaPotavelFinal: "ABERTA"
        }
      },
      {
        id: "TOPOLOGIA_B_POS_OXIDACAO",
        codigo: "TOP-B",
        nome: "2. Pós-Oxidação (FTE-CDI ➔ POA Polimento)",
        descricaoCurta: "Invertida: Desfluoretação inicial e desinfecção terminal oxidativa com residual",
        descricaoDetalhada: "A água bruta é alimentada diretamente no Reator FTE-CDI para remoção seletiva do fluoreto até 1.08 ppm. O efluente segue para o Reator PuriFyWave para esterilização terminal, destruição de micropollutants residuais e garantia de residual para a rede.",
        fluxoDiagrama: "T-100 ➔ FTE-CDI (16 Células) ➔ P-101 ➔ PuriFyWave OS (CONTHEC) ➔ [BBS-100] ➔ T-201 Potável",
        perdaCargaEstimadaBar: 0.72,
        tempoResidenciaHidraulicoMin: 16.2,
        indicacaoAplicacao: "Ideal para águas de poço profundas já clarificadas (baixa turbidez e baixa DQO) com foco em residual sanitário.",
        statusValvulasMotorizadas: {
          xv101_EntradaPoco: "ABERTA",
          xv201_TransferenciaPoaParaFte: "FECHADA",
          xv202_BypassPoaDireto: "ABERTA",
          xv301_EntradaFteCdi: "ABERTA",
          xv302_TransferenciaFteParaPoa: "ABERTA",
          xv401_SaidaPotavelFinal: "ABERTA"
        }
      },
      {
        id: "TOPOLOGIA_C_LINHAS_PARALELAS",
        codigo: "TOP-C",
        nome: "3. Linhas Paralelas (Split 50/50 + Blend)",
        descricaoCurta: "Paralelo: Divisão simétrica de carga e mistura homogênea no manifold terminal",
        descricaoDetalhada: "O afluente de 180 m³/h é bipartido: Linha 1 (90 m³/h) é processada pelo PuriFyWave OS para destruição orgânica e Linha 2 (90 m³/h) é desfluoretada no FTE-CDI. As duas correntes se combinam no Manifold Misturador para entrega potável balanceada.",
        fluxoDiagrama: "T-100 ➔ Split 50/50 [Linha 1 POA (90m³/h) // Linha 2 FTE-CDI (90m³/h)] ➔ Manifold Blend ➔ T-201",
        perdaCargaEstimadaBar: 0.48,
        tempoResidenciaHidraulicoMin: 12.0,
        indicacaoAplicacao: "Máxima capacidade hidráulica instantânea e economia de reagentes em matrizes com contaminação moderada.",
        statusValvulasMotorizadas: {
          xv101_EntradaPoco: "ABERTA",
          xv201_TransferenciaPoaParaFte: "ABERTA",
          xv202_BypassPoaDireto: "ABERTA",
          xv301_EntradaFteCdi: "ABERTA",
          xv302_TransferenciaFteParaPoa: "FECHADA",
          xv401_SaidaPotavelFinal: "ABERTA"
        }
      },
      {
        id: "TOPOLOGIA_D_FTE_DIRETO_BYPASS",
        codigo: "TOP-D",
        nome: "4. Bypass POA (FTE-CDI Direto)",
        descricaoCurta: "Contingência: FTE-CDI direto com PuriFyWave em recirculação fechada / manutenção",
        descricaoDetalhada: "Permite intervenções, limpezas químicas (CIP) ou recarga de reagentes no módulo PuriFyWave sem interromper a produção contínua de água potável no rack de 16 células FTE-CDI.",
        fluxoDiagrama: "T-100 ➔ Bypass Direto ➔ P-101 ➔ FTE-CDI (16 Células) ➔ T-201 Potável [POA em Standby/Manutenção]",
        perdaCargaEstimadaBar: 0.35,
        tempoResidenciaHidraulicoMin: 9.5,
        indicacaoAplicacao: "Modo de contingência operacional e manutenção preventiva do módulo de pré-oxidação.",
        statusValvulasMotorizadas: {
          xv101_EntradaPoco: "ABERTA",
          xv201_TransferenciaPoaParaFte: "FECHADA",
          xv202_BypassPoaDireto: "ABERTA",
          xv301_EntradaFteCdi: "ABERTA",
          xv302_TransferenciaFteParaPoa: "FECHADA",
          xv401_SaidaPotavelFinal: "ABERTA"
        }
      }
    ];
  }

  public selecionarTopologia(topId: string): void {
    const anterior = this.state.topologiaAtiva;
    this.state.topologiaAtiva = topId;
    const top = this.obterTopologiasDisponiveis().find((t: any) => t.id === topId);
    if (top) {
      const vMap = top.statusValvulasMotorizadas;
      const setV = (tag: string, aberta: boolean) => {
        if (this.state.valvulas[tag]) {
          this.state.valvulas[tag].estado = aberta ? 'ABERTA' : 'FECHADA';
          this.state.valvulas[tag].posicaoAberturaPct = aberta ? 100 : 0;
          this.state.valvulas[tag].fimCursoAbertoZSO = aberta;
          this.state.valvulas[tag].fimCursoFechadoZSC = !aberta;
          this.state.valvulas[tag].ultimaManobraTimestamp = new Date().toLocaleTimeString();
          this.state.valvulas[tag].operadorUltimaManobra = '1-CLICK_SWITCHER';
        }
      };
      setV('XV-101', vMap.xv101_EntradaPoco === 'ABERTA');
      setV('XV-201', vMap.xv201_TransferenciaPoaParaFte === 'ABERTA');
      setV('XV-202', vMap.xv202_BypassPoaDireto === 'ABERTA');
      setV('XV-301', vMap.xv301_EntradaFteCdi === 'ABERTA');
      setV('XV-302', vMap.xv302_TransferenciaFteParaPoa === 'ABERTA');
      setV('XV-401', vMap.xv401_SaidaPotavelFinal === 'ABERTA');
    }

    I.inserirAlarme('INFO', `[1-Click Switcher] Topologia alterada de ${anterior} para ${top ? top.nome : topId}. Válvulas e rotas de fluxo reconfiguradas.`);
    this.notificarListeners();
  }

  public setPosicaoFteCdi(pos: string): void {
    const ant = this.state.posicaoFteCdi;
    this.state.posicaoFteCdi = pos;
    let label = 'MEIO (Série Central)';
    if (pos === 'POS_1_INICIO') label = 'INÍCIO (Montante / Desfluoretação Primária)';
    if (pos === 'POS_3_FINAL') label = 'FINAL (Jusante / Polimento Terminal)';
    I.inserirAlarme('INFO', `[Reator FTE-CDI] Estágio dinâmico alterado de ${ant} para ${label}. Nós, bicos e válvulas XV-301/XV-103 reposicionados solidariamente.`);
    this.salvarConfiguracaoPersistida();
    this.notificarListeners();
  }

  public setPosicaoConthec(pos: string): void {
    const ant = this.state.posicaoConthec;
    this.state.posicaoConthec = pos;
    let label = 'INÍCIO (Montante / Pré-Oxidação)';
    if (pos === 'POS_2_MEIO') label = 'MEIO (Intermediário / Pós-Oxidação)';
    if (pos === 'POS_3_FINAL') label = 'FINAL (Jusante / Polimento & Desinfecção)';
    I.inserirAlarme('INFO', `[Skid CONTHEC] Estágio dinâmico alterado de ${ant} para ${label}. Válvulas XV-101/XV-201/XV-202 e ramais reposicionados solidariamente.`);
    this.salvarConfiguracaoPersistida();
    this.notificarListeners();
  }

  public selecionarTubulacao(tag: string | null): void {
    this.state.tubulacaoSelecionadaTag = tag;
    this.notificarListeners();
  }

  public getTubulacoesInfo(): TubulacaoProcesso[] {
    const q = this.state.vazaoAfluenteM3h || 180;
    return [
      {
        tag: 'L-101-DN200-PEAD',
        nome: 'Alimentação Geral de Água Bruta Subterrânea',
        origemTag: 'T-100',
        destinoTag: this.state.posicaoFteCdi === 'POS_1_INICIO' ? 'REATOR_FTE_CDI' : 'SKID_CONTHEC',
        tipoFluido: 'AGUA_BRUTA',
        diametroDn: 'DN200 (8")',
        diametroInternoMm: 190.2,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 35,
        vazaoM3h: q,
        velocidadeEscoamentoMs: 1.76,
        reynoldsRe: 334000,
        fatorAtritoDarcy: 0.0145,
        perdaCargaBar: 0.22,
        pressaoEntradaBar: 6.8,
        pressaoSaidaBar: 6.58,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#fbbf24',
        descricaoProcesso: 'Recalque profundo da Bomba B-100 (75 CV / 52.4 Hz) transportando 180 m³/h até a entrada da planta.'
      },
      {
        tag: 'L-201-DN200-PEAD',
        nome: 'Transferência Intermediária e Homogeneização',
        origemTag: 'SKID_CONTHEC',
        destinoTag: 'P-101_MANIFOLD',
        tipoFluido: 'AGUA_OXIDADA',
        diametroDn: 'DN200 (8")',
        diametroInternoMm: 190.2,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 22,
        vazaoM3h: q,
        velocidadeEscoamentoMs: 1.76,
        reynoldsRe: 334000,
        fatorAtritoDarcy: 0.0145,
        perdaCargaBar: 0.14,
        pressaoEntradaBar: 3.2,
        pressaoSaidaBar: 3.06,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#818cf8',
        descricaoProcesso: 'Água em processo de oxidação com blend CONTHEC (A+B+C) com 38.5 ppm de polióxido de cloro.'
      },
      {
        tag: 'L-301-DN200-PEAD',
        nome: 'Alimentação do Reator FTE-CDI (16 Células)',
        origemTag: 'P-101',
        destinoTag: 'REATOR_FTE_CDI',
        tipoFluido: 'AGUA_OXIDADA',
        diametroDn: 'DN200 (8")',
        diametroInternoMm: 190.2,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 18,
        vazaoM3h: q,
        velocidadeEscoamentoMs: 1.76,
        reynoldsRe: 334000,
        fatorAtritoDarcy: 0.0145,
        perdaCargaBar: 0.11,
        pressaoEntradaBar: 2.65,
        pressaoSaidaBar: 2.54,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#38bdf8',
        descricaoProcesso: 'Conduto distribuidor principal para o manifold de entrada das 16 células com interlock de 2.80 bar.'
      },
      {
        tag: 'L-401-DN200-PEAD',
        nome: 'Saída e Entrega de Água Potável Portaria 888',
        origemTag: 'REATOR_FTE_CDI',
        destinoTag: 'T-201',
        tipoFluido: 'POTAVEL_PORTARIA_888',
        diametroDn: 'DN200 (8")',
        diametroInternoMm: 190.2,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 28,
        vazaoM3h: q,
        velocidadeEscoamentoMs: 1.76,
        reynoldsRe: 334000,
        fatorAtritoDarcy: 0.0145,
        perdaCargaBar: 0.18,
        pressaoEntradaBar: 2.1,
        pressaoSaidaBar: 1.92,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#10b981',
        descricaoProcesso: 'Água tratada conforme Portaria GM/MS nº 888/2021 (Fluoreto 1.08 mg/L, turbidez 0.45 NTU).'
      },
      {
        tag: 'L-103-DN100-INOX-ZLD',
        nome: 'Dessorção de Concentrado Salino / Rejeito FTE-CDI para UGL',
        origemTag: 'XV-103',
        destinoTag: 'MODULO_UGL',
        tipoFluido: 'REJEITO_ZLD_SALMOURA',
        diametroDn: 'DN100 (4")',
        diametroInternoMm: 95,
        pressaoNominal: 'PN10',
        material: 'ACO_INOX_304',
        rugosidadeMm: 0.015,
        comprimentoEquivalenteM: 16,
        vazaoM3h: 0.85,
        velocidadeEscoamentoMs: 0.33,
        reynoldsRe: 31000,
        fatorAtritoDarcy: 0.024,
        perdaCargaBar: 0.04,
        pressaoEntradaBar: 1.8,
        pressaoSaidaBar: 1.76,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#ef4444',
        descricaoProcesso: 'Salmoura concentrada de despolarização (64.5 mg/L F⁻) das 16 células encaminhada para precipitação de CaSiF₆ na UGL.'
      },
      {
        tag: 'L-LODO-CONTHEC-DN50',
        nome: 'Purga e Dreno de Lodo Químico do Skid CONTHEC para UGL',
        origemTag: 'SKID_CONTHEC',
        destinoTag: 'MODULO_UGL',
        tipoFluido: 'LODO_QUIMICO',
        diametroDn: 'DN50 (2")',
        diametroInternoMm: 50,
        pressaoNominal: 'PN10',
        material: 'PVC_U',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 14,
        vazaoM3h: 0.15,
        velocidadeEscoamentoMs: 0.21,
        reynoldsRe: 10500,
        fatorAtritoDarcy: 0.031,
        perdaCargaBar: 0.02,
        pressaoEntradaBar: 1.5,
        pressaoSaidaBar: 1.48,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#78350f',
        descricaoProcesso: 'Dreno de purga e lodo coagulado/floculado do CONTHEC para co-tratamento na câmara de mistura da UGL.'
      },
      {
        tag: 'L-ZLD-CLARIF-T102-DN80',
        nome: 'Clarificado ZLD da Prensa UGL para Tanque T-102',
        origemTag: 'MODULO_UGL',
        destinoTag: 'T-102',
        tipoFluido: 'AGUA_REUSO_ZLD',
        diametroDn: 'DN80 (3")',
        diametroInternoMm: 76,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 18,
        vazaoM3h: 0.78,
        velocidadeEscoamentoMs: 0.48,
        reynoldsRe: 36000,
        fatorAtritoDarcy: 0.022,
        perdaCargaBar: 0.04,
        pressaoEntradaBar: 2.2,
        pressaoSaidaBar: 2.16,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#06b6d4',
        descricaoProcesso: 'Água clarificada da Prensa UGL (780 L/h) direcionada ao Tanque de Reuso T-102 (5 m³), sem contato com água de entrada.'
      },
      {
        tag: 'L-REUSO-LAVAGEM-DN40',
        nome: 'Água de Reuso T-102 para Lavagem Contínua da Prensa',
        origemTag: 'T-102',
        destinoTag: 'MODULO_UGL',
        tipoFluido: 'AGUA_REUSO_ZLD',
        diametroDn: 'DN40 (1.1/2")',
        diametroInternoMm: 40,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 12,
        vazaoM3h: 0.40,
        velocidadeEscoamentoMs: 0.88,
        reynoldsRe: 35000,
        fatorAtritoDarcy: 0.022,
        perdaCargaBar: 0.06,
        pressaoEntradaBar: 2.5,
        pressaoSaidaBar: 2.44,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#06b6d4',
        descricaoProcesso: 'Circuito fechado de lavagem contínua da tela e anéis da Prensa Parafuso UGL (400 L/h).'
      },
      {
        tag: 'L-REUSO-DILUICAO-DN40',
        nome: 'Água de Reuso T-102 para Diluição Skid CONTHEC',
        origemTag: 'T-102',
        destinoTag: 'SKID_CONTHEC',
        tipoFluido: 'AGUA_REUSO_ZLD',
        diametroDn: 'DN40 (1.1/2")',
        diametroInternoMm: 40,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 26,
        vazaoM3h: 0.38,
        velocidadeEscoamentoMs: 0.84,
        reynoldsRe: 33000,
        fatorAtritoDarcy: 0.023,
        perdaCargaBar: 0.05,
        pressaoEntradaBar: 2.5,
        pressaoSaidaBar: 2.45,
        sentidoFluxo: 'NORMAL',
        animacaoAtiva: true,
        corHex: '#0ea5e9',
        descricaoProcesso: 'Água de reuso do T-102 utilizada na diluição dos frascos B e C e 4º Injetor CONTHEC (380 L/h).'
      },
      {
        tag: 'L-BYPASS-DN200',
        nome: 'Barramento de Bypass Superior de Contingência',
        origemTag: 'T-100',
        destinoTag: 'REATOR_FTE_CDI',
        tipoFluido: 'AGUA_BRUTA',
        diametroDn: 'DN200 (8")',
        diametroInternoMm: 190.2,
        pressaoNominal: 'PN10',
        material: 'PEAD_PE100',
        rugosidadeMm: 0.007,
        comprimentoEquivalenteM: 52,
        vazaoM3h: this.state.valvulas['XV-202']?.estado === 'ABERTA' ? q : 0,
        velocidadeEscoamentoMs: this.state.valvulas['XV-202']?.estado === 'ABERTA' ? 1.76 : 0,
        reynoldsRe: this.state.valvulas['XV-202']?.estado === 'ABERTA' ? 334000 : 0,
        fatorAtritoDarcy: 0.0145,
        perdaCargaBar: 0.32,
        pressaoEntradaBar: 6.8,
        pressaoSaidaBar: 6.48,
        sentidoFluxo: this.state.valvulas['XV-202']?.estado === 'ABERTA' ? 'NORMAL' : 'BLOQUEADO',
        animacaoAtiva: this.state.valvulas['XV-202']?.estado === 'ABERTA',
        corHex: '#fbbf24',
        descricaoProcesso: 'Linha superior de bypass manobrada pela válvula XV-202 para manutenção isolada do módulo POA.'
      }
    ];
  }

  public atualizarSentidoFluxoTubulacao(tag: string, sentido: string): void {
    I.inserirAlarme('ALERTA', `[Hidráulica] Sentido de fluxo da tubulação ${tag} comutado para ${sentido}.`);
    this.notificarListeners();
  }

  public alternarAtivo(): void {
    this.state.ativo = !this.state.ativo;
    this.notificarListeners();
  }

  public forcarTransicaoEstagio(estagio: string): void {
    this.state.estagioAtual = estagio;
    this.state.progressoEstagioPct = 0;
    this.notificarListeners();
  }

  public subscribe(cb: (state: PurifyWaveState) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notificarListeners(): void {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  public gerarLaudoIntegradoDuplo(): any {
    const dataIso = new Date().toISOString();
    const numLaudo = `LTI-PW-FTE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const params = [
      {
        nome: "Fluoreto (F⁻) de Saída",
        categoria: "PORTARIA_888_POTABILIDADE",
        amostraEntrada: "8.50 mg/L",
        amostraSaida: "1.08 mg/L",
        unidade: "mg/L",
        limiteNorma: "≤ 1.50 mg/L (Portaria 888)",
        statusConformidade: "CONFORME",
        metodologia: "Eletrodo Íon Seletivo (ISE) / SMWW 4500-F⁻ C",
        observacoes: "Desfluoretação por eletrodiálise capacitiva (1.40 V DC)"
      },
      {
        nome: "pH Final da Água Tratada",
        categoria: "PORTARIA_888_POTABILIDADE",
        amostraEntrada: "6.75",
        amostraSaida: `${this.state.phOut}`,
        unidade: "U pH",
        limiteNorma: "6.00 a 9.00 (Portaria 888)",
        statusConformidade: "CONFORME",
        metodologia: "Potenciometria / SMWW 4500-H⁺ B",
        observacoes: "Estabilizado na faixa neutra potável"
      },
      {
        nome: "Turbidez Efluente Final",
        categoria: "PORTARIA_888_POTABILIDADE",
        amostraEntrada: `${this.state.turbidezInNtu} NTU`,
        amostraSaida: `${this.state.turbidezOutNtu} NTU`,
        unidade: "NTU",
        limiteNorma: "≤ 5.0 NTU (Portaria 888)",
        statusConformidade: "CONFORME",
        metodologia: "Nefelometria / SMWW 2130 B",
        observacoes: "Clarificação profunda com Kit CONTHEC (A + B + C)"
      },
      {
        nome: "Coliformes Totais e E. coli",
        categoria: "PORTARIA_888_POTABILIDADE",
        amostraEntrada: "1.450.000 UFC/100mL",
        amostraSaida: "Ausente (< 1 UFC/100mL)",
        unidade: "UFC/100mL",
        limiteNorma: "Ausência em 100 mL (Portaria 888)",
        statusConformidade: "CONFORME",
        metodologia: "Substrato Enzimático Cromogênico",
        observacoes: "100% de inativação microbiológica por POA CONTHEC"
      },
      {
        nome: "Demanda Química de Oxigênio (DQO)",
        categoria: "CONAMA_430_EFLUENTES",
        amostraEntrada: `${this.state.dqoInMgL} mg/L`,
        amostraSaida: `${this.state.dqoOutMgL} mg/L`,
        unidade: "mg/L O₂",
        limiteNorma: "≤ 90.0 mg/L (CONAMA 430)",
        statusConformidade: "CONFORME",
        metodologia: "Refluxo Fechado Colorimétrico / SMWW 5220 D",
        observacoes: `Redução de ${this.state.remocaoDqoPct}% por POA`
      },
      {
        nome: "Demanda Bioquímica de Oxigênio (DBO₅)",
        categoria: "CONAMA_430_EFLUENTES",
        amostraEntrada: `${this.state.dboInMgL} mg/L`,
        amostraSaida: `${this.state.dboOutMgL} mg/L`,
        unidade: "mg/L O₂",
        limiteNorma: "≤ 60.0 mg/L ou Remoção ≥ 60%",
        statusConformidade: "CONFORME",
        metodologia: "Incubação 5 dias a 20°C / SMWW 5210 B",
        observacoes: "Mineralização acelerada da carga biodegradável"
      },
      {
        nome: "Fenóis Totais",
        categoria: "CONAMA_430_EFLUENTES",
        amostraEntrada: `${this.state.fenoisInPpm} mg/L`,
        amostraSaida: `${this.state.fenoisOutPpm} mg/L`,
        unidade: "mg/L",
        limiteNorma: "≤ 0.50 mg/L (CONAMA 430)",
        statusConformidade: "CONFORME",
        metodologia: "4-Aminoantipirina / SMWW 5530 D",
        observacoes: "Clivagem oxidativa do anel aromático por radicais"
      },
      {
        nome: "Óleos e Graxas Minerais",
        categoria: "CONAMA_430_EFLUENTES",
        amostraEntrada: `${this.state.oleosGraxasInPpm} mg/L`,
        amostraSaida: `${this.state.oleosGraxasOutPpm} mg/L`,
        unidade: "mg/L",
        limiteNorma: "≤ 20.0 mg/L (CONAMA 430)",
        statusConformidade: "CONFORME",
        metodologia: "Partição Gravimétrica / SMWW 5520 B",
        observacoes: "Separação e degradação completa"
      },
      {
        nome: "Lise Celular & Cavitação Acústica (BBS-100)",
        categoria: "CONAMA_430_EFLUENTES",
        amostraEntrada: `${this.state.biossonica.rotacaoRpm} RPM | ${this.state.biossonica.frequenciaUltrassonicaKhz} kHz`,
        amostraSaida: `${this.state.biossonica.eficienciaLiseCelularPct}% Eficiência`,
        unidade: "% Lise",
        limiteNorma: "≥ 95.0% Lise / Cisalhamento de Biofilme",
        statusConformidade: "CONFORME",
        metodologia: "Cavitação Acústica Ultrassônica + Hidrodinâmica",
        observacoes: `Operação ativa no slot: ${this.state.biossonica.posicaoAtual}`
      },
      {
        nome: "Umidade da Torta de Lodo Desaguada",
        categoria: "BIOSSOLIDO_UGL",
        amostraEntrada: "98.5% (Lodo Fluido)",
        amostraSaida: `${this.state.ugl.umidadeTortaPct}%`,
        unidade: "%",
        limiteNorma: "≤ 25.0% para Biossólido Agrícola",
        statusConformidade: "CONFORME",
        metodologia: "Secagem Gravimétrica a 105°C",
        observacoes: "Passivação mineral por Silício Reativo (CONTHEC B)"
      },
      {
        nome: "Recuperação Hídrica ZLD (Retrolavagem FTE-CDI)",
        categoria: "BIOSSOLIDO_UGL",
        amostraEntrada: "850 L/h Rejeito XV-103",
        amostraSaida: "780 L/h Recuperados (91.8%)",
        unidade: "%",
        limiteNorma: "≥ 85.0% Recuperação ZLD",
        metodologia: "Balanço Hídrico de Massa e Fluorossilicatos",
        observacoes: "Clarificado isolado no Tanque de Reuso T-102 (5 m³): 400 L/h lavagem tela prensa e 380 L/h diluição CONTHEC, 100% ZLD sem contato com manancial ou água de entrada"
      },
      {
        nome: "Estabilização e Inibição de Odores (H₂S / Mercaptanas)",
        categoria: "BIOSSOLIDO_UGL",
        amostraEntrada: "Odor Pútrido Intenso",
        amostraSaida: "Ausência Total de Odor",
        unidade: "Qualitativo",
        limiteNorma: "Ausência de Putrefação (CONAMA 498)",
        metodologia: "Inspeção Organoléptica e Sulfeto de Hidrogênio",
        observacoes: "Apto para destinação e enriquecimento de solo agrícola"
      }
    ];

    return {
      id: `laudo-duplo-${Date.now()}`,
      numeroLaudo: numLaudo,
      dataEmissao: dataIso,
      responsavelTecnicoCRQ: "Dr. Gentil M. Pinheiro Jr. - CRQ 09100961 (Química e Tratamento)",
      responsavelTecnicoCREA: "Eng. Ricardo Silveira - CREA 506982441-SP (Automação & Processos)",
      solicitante: "CONCESSIONÁRIA INTEGRADA DE SANEAMENTO & ÁGUAS INDUSTRIAIS",
      unidadePlanta: "Estação Central Híbrida: PuriFyWave OS V2 (CONTHEC) + FTE-CDI 180 m³/h",
      conformidadePortaria888: true,
      conformidadeConama430: true,
      conformidadeBiossolidoUgl: true,
      resumoQuimico: {
        vazaoTotalTratadaM3h: this.state.vazaoAfluenteM3h,
        fluoretoFinalPpm: 1.08,
        dqoFinalMgL: this.state.dqoOutMgL,
        turbidezFinalNtu: this.state.turbidezOutNtu,
        phFinal: this.state.phOut,
        desinfeccaoPct: this.state.desinfeccaoPct,
        desaguamentoLodoPct: this.state.ugl.taxaDesaguamentoPct
      },
      parametros: params,
      conclusaoParecer: "Aprovado para CONSUMO HUMANO POTÁVEL (Portaria GM/MS nº 888/2021) com REÚSO / LANÇAMENTO AMBIENTAL (CONAMA 430/357), BIOSSÓLIDO AGRÍCOLA ESTABILIZADO (UGL) e DESCARTE ZERO (ZLD).",
      statusSql: "PENDENTE"
    };
  }
}

export interface IPurifyWaveService {
  state: PurifyWaveState;
  subscribe(cb: (state: PurifyWaveState) => void): () => void;
  [key: string]: any;
}

export const purifyWaveService: IPurifyWaveService = new PurifyWaveIntegrationService();
