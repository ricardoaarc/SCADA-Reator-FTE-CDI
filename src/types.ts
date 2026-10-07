/**
 * Definições de Tipos e Interfaces para o SCADA Industrial do Reator FTE-CDI
 * Especificação: Rack com 16 células em paralelo (2000x1600x900 mm), 146 pares de eletrodos por célula (2.336 pares total)
 * Capacidade: 180 m³/h (50 L/s) em tubulação principal PEAD DN200 (8") PN10
 * Compliance: Portaria GM/MS nº 888/2021 (VMP Fluoreto: 1,5 mg/L), NR-12, NR-10, ISA-101 e ISA-18.2
 */

export type NivelAcessoUsuario = 'OPERADOR' | 'SUPERVISOR' | 'ENGENHEIRO';
export type OperatorRole = 'OPERADOR' | 'SUPERVISOR' | 'ENGENHEIRO' | 'ADMIN' | 'AUDITOR';

export type ZonaOperacaoId = 
  | 'ZONA_1_CAPTACAO_POCOS'
  | 'ZONA_2_REATOR_FTE_CDI'
  | 'ZONA_3_SKID_CONTHEC_POA'
  | 'ZONA_4_MANIFOLD_ZLD'
  | 'ZONA_5_ELETRICA_DC'
  | 'ZONA_2_TRATAMENTO_PREVIO'
  | 'ZONA_3_DESFLUORETACAO_FTE_CDI';

export interface ZonaOperacaoInfo {
  id: ZonaOperacaoId;
  nome: string;
  codigo?: string;
  descricao: string;
  equipamentosPrincipais?: string[];
  nivelCriticidade?: 'ALTA' | 'CRITICA_SIL2' | 'MEDIA' | 'CRITICA';
  nivelCritico?: 'ALTO' | 'CRITICO' | 'MEDIO' | 'BAIXO' | string;
  requerDuplaConfirmacao?: boolean;
  cor?: string;
  corHex?: string;
}

export interface UserGranularPermissions {
  canViewSynoptic?: boolean;
  canEditLayout?: boolean;
  canOperatePumps?: boolean;
  canResetInterlocks?: boolean;
  canExportReports?: boolean;
  canManageUsers?: boolean;
  canConfigurePlc?: boolean;
  canModifyFormulas?: boolean;
  canAcknowledgeAlarms?: boolean;
  canOverrideInterlocks?: boolean;
  canCalibrateSensors?: boolean;
  canTunePidGains?: boolean;
  canExecuteBackwash?: boolean;
  canSwitchTopology?: boolean;
  podeVisualizarSinoptico?: boolean;
  podeComutarModoOperacao?: boolean;
  podeAcionarCargaRelogio?: boolean;
  podeConfigurarPids?: boolean;
  podeExportarLaudosPdf?: boolean;
  podeGerenciarUsuarios?: boolean;
  podeEditarFormulasMath?: boolean;
  podeEditarLayoutGrafico?: boolean;
  podeReconhecerAlarmes?: boolean;
  podeRearmarInterlock?: boolean;
  podeComutarModoClp?: boolean;
  podeEditarLayout?: boolean;
  podeExportarLaudos?: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  matricula: string;
  nivel_acesso: NivelAcessoUsuario;
  email?: string;
  cargo?: string;
  zonasAutorizadas?: string[];
}

export interface OperatorProfile {
  id: string;
  nome: string;
  matricula: string;
  role: OperatorRole;
  cargo: string;
  email: string;
  ultimoAcesso: string;
  zonasAutorizadas: string[];
  permissoes?: UserGranularPermissions;
  senhaPin?: string;
  pinHash?: string;
  pinPadrao?: boolean;
  status?: 'ATIVO' | 'INATIVO';
}

export interface AuditActionLog {
  operadorId?: string;
  operadorRole?: OperatorRole;
  id: string;
  timestamp: string;
  operadorMatricula?: string;
  operadorNome?: string;
  usuarioMatricula?: string;
  usuarioNome?: string;
  role?: OperatorRole;
  usuarioRole?: OperatorRole;
  acao?: string;
  acaoRealizada?: string;
  justificativa?: string;
  categoria: 'SEGURANCA' | 'PROCESSO' | 'SISTEMA' | 'RELATORIO';
  zonaAfetada?: string;
  detalhes?: Record<string, any> | string;
  assinaturaEletronica?: boolean | string;
  statusConformidadeCFR21?: boolean;
}

export type FaseCiclo = 'ADSORCAO' | 'REGENERACAO';
export type StatusCiclo = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'INTERROMPIDO' | 'PAUSADO';
export type PolaridadeEletrodo = 'NORMAL' | 'REVERSA';

export type StatusCelula = 
  | 'OPERANDO_ADSORCAO' 
  | 'OPERANDO_DESORCAO' 
  | 'OPERANDO_HIGIENIZACAO' 
  | 'ADSORCAO' 
  | 'REGENERACAO' 
  | 'ALERTA' 
  | 'FALHA_INTERTRAVADA' 
  | 'STANDBY';

export type NivelSeveridadeAlarme = 
  | 'ALERTA' 
  | 'CRITICO' 
  | 'NAO_CONFORMIDADE_REGULATORIA'
  | 'INFO';

export type NivelSeveridade = NivelSeveridadeAlarme;

/** Leitura da pressão do plenum vinda do CLP real, com qualidade (usada pelo interlock em software). */
export interface LeituraPressao {
  pressaoBar: number | null;
  /** BOA = valor atual e plausível; RUIM = indisponível/desatualizado/inválido; AGUARDANDO = período de graça após ativar o modo CLP real. */
  qualidade: 'BOA' | 'RUIM' | 'AGUARDANDO';
  motivo?: string;
  idadeMs?: number;
}

export interface FontePressao {
  /** true quando a pressão do interlock deve vir do CLP real (modo CLP_REAL). */
  ativa(): boolean;
  ler(): LeituraPressao;
}

export interface CelulaInfo {
  etapaAtual?: string;
  tempoAcumuladoEtapaSeg?: number;
  id: number;
  codigo: string;          // Ex: "CEL-01" até "CEL-16"
  posicao_rack: number;    // 1 a 16 (Grid 4x4)
  /** De onde veio a pressão usada na última verificação de segurança. */
  fontePressao?: 'SIMULADA' | 'CLP_REAL';
  linhaRack: number;       // 1 a 4
  colunaRack: number;      // 1 a 4
  pares_eletrodo: number;  // 146 pares
  dimensoes_mm?: string;    // "2000 x 1600 x 900"
  area_ativa_m2?: number;   // ~375 m² por célula (6000 m² total no rack)
  ativa: boolean;
  status: StatusCelula;
  interlockDisparado: boolean;
  motivoInterlock: string | null;
  requerRearmeManual: boolean;
  pressaoBar: number;
  vazaoLh: number;
  correnteAmp: number;
  tensaoV: number;
  polaridade?: PolaridadeEletrodo;
  ph?: number;
  temperaturaC?: number;
  fluoretoInPPM?: number;
  fluoretoOutPPM?: number;
  eficienciaPct?: number;
  razaoBreakthrough?: number;
  leiturasConsecutivasBreakthrough?: number;
  tempoFaseAtualSegundos?: number;
}

export interface ReleAtuador {
  id: number;
  celula_id: number;
  tipo: 'FONTE_DC' | 'VALVULA_ALIMENTACAO' | 'VALVULA_DESCARTE' | 'BOMBA_FEED';
  estado: 'FECHADO' | 'ABERTO';
  motivo_ultimo_estado?: string;
  requer_rearme_manual: boolean;
  atualizado_em: string;
}

export interface IRelayDriver {
  cortarReleFisico(celulaId: number, tipo: 'FONTE_DC' | 'VALVULA_ALIMENTACAO' | 'BOMBA_FEED', motivo: string): Promise<boolean>;
  rearmarReleFisico(celulaId: number, tipo: 'FONTE_DC' | 'VALVULA_ALIMENTACAO' | 'BOMBA_FEED' | string, usuarioId: number | string, observacao: string): Promise<boolean>;
  obterEstadoRele(celulaId: number, tipo: string): Promise<'FECHADO' | 'ABERTO'>;
}

export interface CicloReator {
  id: number;
  celula_id?: number;
  fase: FaseCiclo;
  inicio: string;
  fim: string | null;
  tensao_alvo: number;
  motivo_encerramento?: string;
  eficiencia_final_pct?: number;
  status: StatusCiclo;
}

export interface TelemetriaSensor {
  id: number;
  celula_id: number;
  ciclo_id: number;
  pressao_bar: number;
  vazao_l_h: number;
  corrente_amp: number;
  tensao_v: number;
  polaridade: PolaridadeEletrodo;
  ph: number;
  temperatura_c: number;
  fluoreto_in_ppm: number;
  fluoreto_out_ppm: number;
  conformidade_regulatoria: boolean; // fluoreto_out_ppm <= 1.50 mg/L
  condutividade_us_cm?: number;
  timestamp: string;
}

export interface Alarme {
  id: number;
  celula_id: number | null;
  codigo: string;
  nivel_severidade: NivelSeveridadeAlarme;
  mensagem: string;
  resolvido: boolean;
  resolvido_em?: string | null;
  reconhecido: boolean;
  reconhecido_por?: string | null;
  reconhecido_em?: string | null;
  timestamp: string;
}

export interface EventoRearme {
  id: number;
  celula_id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_matricula: string;
  timestamp: string;
  observacao: string;
  pressao_no_rearme_bar: number;
}

export interface ParametrosProcesso {
  duracaoEtapaAdsorcaoSeg?: number;
  duracaoEtapaDesorcaoSeg?: number;
  duracaoEtapaHigienizacaoSeg?: number;
  fatorDegradacaoCapacitativaPercent?: number;
  limiteEstruturalMecanicoBar?: number;
  corteInterlockPressaoBar?: number;
  alertaPressaoAltaBar?: number;
  alertaPressaoBaixaBar?: number;
  vazaoTotalAlvoLh?: number;
  vazaoNominalCelulaLh?: number;
  desvioMaximoManifoldPct?: number;
  tensaoAdsorcaoV?: number;
  tensaoRegeneracaoV?: number;
  limiteCorrenteMaxPorCelulaAmp?: number;
  razaoBreakthroughLimite?: number;
  debounceLeiturasConsecutivas?: number;
  timeoutAdsorcaoMinutos?: number;
  tempoRegeneracaoMinutos?: number;
  reversaoPolaridadeHabilitada?: boolean;
  reversaoPolaridadePeriodoMs?: number;
  avisoValidacaoBancadaRuIr?: string;
  vmpFluoretoPortaria888MgL?: number;
}

export interface ManifoldBalancoCelula {
  celula_id: number;
  codigo: string;
  vazao_l_h: number;
  vazao_m3_h: number;
  desvio_em_relacao_a_media_pct: number;
  pressao_bar: number;
  status_t4: 'CONFORME' | 'DESVIO_CRITICO_ALTO' | 'DESVIO_CRITICO_BAIXO';
}

export interface RackResumoGlobal {
  totalCelulas: number;
  celulasAtivas: number;
  celulasEmAdsorcao: number;
  celulasEmRegeneracao: number;
  celulasEmAlerta: number;
  celulasIntertravadas: number;
  vazaoTotalLh: number;
  vazaoTotalM3h: number;
  pressaoMediaBar: number;
  correnteTotalAmp: number;
  potenciaTotalKw: number;
  fluoretoInMedioPPM: number;
  fluoretoOutMedioPPM: number;
  eficienciaMediaPct: number;
  conformidadeGeralPortaria888: boolean;
  statusGeralSeguranca: 'NORMAL' | 'ALERTA' | 'INTERLOCK_PARCIAL' | 'PARADA_EMERGENCIA';
}

// ----------------------------------------------------
// Tipos Legados e de Instrumentação
// ----------------------------------------------------
export interface SensorData {
  pressaoBar: number;
  vazaoLitrosHora: number;
  tensaoV: number;
  correnteAmp: number;
  fluoretoInPPM: number;
  fluoretoOutPPM: number;
  ph: number;
  temperaturaC: number;
  condutividadeInUsCm: number;
  condutividadeOutUsCm: number;
  eficienciaRemocaoPct: number;
}

export interface CellTelemetry {
  cellId: number;
  pressaoIndividualBar: number;
  vazaoIndividualLh: number;
  temperaturaC: number;
  status: 'OPERACIONAL' | 'ALERTA_FOULING' | 'SOBREPRESSAO' | 'STANDBY';
  potencialV: number;
}

export interface ValvulasEstado {
  xv101Retrolavagem: boolean;
  xv102Alimentacao: boolean;
  xv103Descarte: boolean;
  xv104Bypass: boolean;
  xv105AirScour: boolean;
}

export type BackwashFase = 'IDLE' | 'DESPOLARIZACAO' | 'LAVAGEM_REVERSA' | 'ENXAGUE' | 'STANDBY';

export interface BackwashCicloRegistro {
  id: string;
  timestamp: string;
  duracaoS: number;
  motivo: 'MANUAL_OPERADOR' | 'DELTA_P_AUTOMATICO' | 'TEMPO_PROGRAMADO' | 'INTERLOCK_EMERGENCIA';
  pressaoAntesBar: number;
  pressaoDepoisBar: number;
  operador: string;
  sucesso: boolean;
}

export interface BackwashState {
  emAndamento: boolean;
  tempoRestanteSegundos: number;
  duracaoTotalSegundos: number;
  faseAtual: BackwashFase;
  modoAuto: boolean;
  intervaloHorasAuto: number;
  pressaoGatilhoAutoBar: number;
  ultimoCicloTimestamp: string | null;
  recuperacaoPermeabilidadePct: number;
  totalCiclosExecutados: number;
  bypassAtivo: boolean;
  valvulas: ValvulasEstado;
  historicoCiclos: BackwashCicloRegistro[];
}

export interface SkidHardwareState {
  bombaAlimentacaoAtiva: boolean;
  interlockDisparado: boolean;
  motivoInterlock: string | null;
  fonteDcAtiva: boolean;
  tensaoAlvoV: number;
  tensaoRealV: number;
  correnteTotalA: number;
  modoOperacao: 'AUTOMATICO' | 'MANUAL';
  foulingDetectado: boolean;
  eficienciaRemocaoPct: number;
  massaFRemovidaMg: number;
  celulas: CellTelemetry[];
  retrolavagem: BackwashState;
}

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'WEBHOOK' | 'SIREN';
export type NotificationStatus = 'ENVIADO' | 'ENTREGUE' | 'FALHA' | 'BLOQUEADO_NAVEGADOR';

export interface AlertaNotificacao {
  id: string;
  timestamp: string;
  interlockMotivo: string;
  severidade: NivelSeveridadeAlarme;
  canaisDisparados: NotificationChannel[];
  destinatariosEmail: string[];
  statusEnvio: NotificationStatus;
  /** Preenchido quando algum canal falhou após as tentativas (ex.: webhook, SCD-NOT-001). */
  falhaEntrega?: string;
  pressaoBar: number;
  vazaoLh: number;
  tensaoV: number;
  correnteA: number;
  detalhesTecnicos: {
    releBombaDesarmado: boolean;
    pressaoCriticaAtingida: boolean;
    celulasComprometidas: number[];
    recomendacaoOperacional: string;
  };
  emailPreview: {
    remetente: string;
    destinatarios: string[];
    assunto: string;
    corpoHtml: string;
    corpoTexto: string;
  };
}

export interface NotificationConfig {
  emailHabilitado: boolean;
  destinatariosEmail: string[];
  pushHabilitado: boolean;
  somSireneHabilitado: boolean;
  webhookHabilitado: boolean;
  webhookUrl: string;
  cooldownSegundos: number;
}

export interface EmailApiMockResponse {
  sucesso: boolean;
  messageId: string;
  statusCode: number;
  tempoRespostaMs: number;
  provedor: string;
  endpoint: string;
  timestamp: string;
  dadosEnvio: {
    remetente: string;
    destinatarios: string[];
    assunto: string;
    corpoHtml: string;
    corpoTexto: string;
    headers: Record<string, string>;
  };
}

export type DataSourceMode = 'SIMULADOR' | 'CLP_REAL';
export type PlcProtocol = 'MODBUS_TCP' | 'OPC_UA' | 'MQTT_GATEWAY';
export type PlcConnectionStatus = 'CONECTADO' | 'CONECTANDO' | 'DESCONECTADO' | 'ERRO_TIMEOUT' | 'VERIFICANDO' | 'ERRO_COMUNICACAO';

export interface ModbusRegister {
  endereco: number;
  tipo: 'HOLDING_REGISTER' | 'COIL' | 'DISCRETE_INPUT' | 'INPUT_REGISTER';
  nome: string;
  descricao: string;
  valor: any;
  unidade: string;
  somenteLeitura: boolean;
}

export interface PlcConnectionConfig {
  modoFonteDados: DataSourceMode;
  protocolo: PlcProtocol;
  ipAddress: string;
  porta: number;
  slaveId: number;
  intervaloScanMs: number;
  status: PlcConnectionStatus;
  ultimoScanTimestamp: string | null;
  pacotesRecebidos: number;
  pacotesEnviados: number;
  errosComunicacao: number;
  latenciaMs: number;
  mapaRegistradores: Record<number, ModbusRegister>;
}

export interface PidConfig {
  habilitado: boolean;
  modo: 'AUTO' | 'MANUAL';
  setpointVazaoLh: number;
  kp: number;
  ki: number;
  kd: number;
  saidaMinPct: number;
  saidaMaxPct: number;
  limitePressaoOverrideBar: number;
  overridePressaoAtivo: boolean;
  saidaManualPct: number;
  sinalVfdAtualPct: number;
  termoP: number;
  termoI: number;
  termoD: number;
  erroAtual: number;
}

export interface PidTelemetryPoint {
  timestamp: string;
  spVazao: number;
  pvVazao: number;
  mvVfdPct: number;
  pressaoBar: number;
  overrideAtivo: boolean;
}

// ----------------------------------------------------
// Laudos Laboratoriais e Auditoria (Supabase / SQL)
// ----------------------------------------------------
export interface ParametroLaudo {
  nome: string;
  resultado: string | number;
  unidade: string;
  vmp: string;
  lq?: string;
  metodologia: string;
  emConformidade: boolean;
  impactoFteCdi: string;
}

export interface ParametrosChaveFteCdi {
  fluoretoMgL: number | null;
  ph: number | null;
  condutividadeUsCm: number | null;
  stdMgL: number | null;
  cloretosMgL: number | null;
  sulfatosMgL: number | null;
  nitratosMgL: number | null;
  ferroMgL: number | null;
  durezaMgL: number | null;
  coliformesUfc100ml: number | null;
  dboMgL: number | null;
}

export interface LaudoLaboratorial {
  id: string;
  numeroLaudo: string;
  laboratorio: string;
  solicitante: string;
  matriz: string;
  localColeta: string;
  dataColeta: string;
  dataEmissao: string;
  responsavelTecnico: string;
  conclusaoGeral: string;
  /** null = não foi possível determinar (laudo em revisão); nunca assumir conformidade. */
  conformidadePortaria888: boolean | null;
  parametros: ParametroLaudo[];
  parametrosChaveFteCdi: ParametrosChaveFteCdi;
  recomendacoesOperacionais: string[];
  statusSql?: 'SALVO' | 'PENDENTE' | 'PENDENTE_REVISAO';
  /** Campos críticos que a leitura por OCR não conseguiu extrair. */
  camposAusentes?: string[];
  dataSalvamentoSql?: string;
  loteId?: string;
  pocoId?: string;
}

export interface PocoHistoricoPonto {
  laudoId: string;
  numeroLaudo: string;
  dataColeta: string;
  dataTimestamp: number;
  localPoco: string;
  fluoretoMgL: number;
  ph: number;
  stdMgL: number;
  nitratosMgL: number;
  durezaMgL: number;
  sulfatosMgL: number;
  coliformesUfc100ml: number;
  conformidadeGeral: boolean;
}

// ----------------------------------------------------
// SCADA Data Points & Watchlist Hierarchy (Estilo ScadaBR / SCADA-LTS)
// ----------------------------------------------------
export type DataPointQuality = 'GOOD' | 'BAD' | 'STALE' | 'OVERRIDDEN';
export type DataPointDataType = 'NUMERICO' | 'BINARIO' | 'TEXTO' | 'MULTI_ESTADO' | 'FLOAT';

export interface DataPointTag {
  id: string;
  tagPath: string;              // Ex: "Rack_FTE_CDI.Celula_01.PT_01_Pressao"
  tag?: string;
  nome: string;
  categoria: 'CELULAS' | 'MANIFOLD' | 'ALIMENTACAO' | 'RETROLAVAGEM' | 'QUALIDADE_AGUA' | 'SEGURANCA';
  tipoDado: DataPointDataType;
  unidade?: string;
  valorAtual: number | boolean | string;
  valor?: number | boolean | string;
  valorFormatado: string;
  qualidade: DataPointQuality;
  isSettable: boolean;           // Se aceita escrita remota pelo SCADA
  isOverridden: boolean;        // Se está em forçamento manual
  valorForcado?: number | boolean | string;
  enderecoModbus?: string;      // Ex: "40001 (HR1)", "00005 (Coil 5)"
  dataFonte: string;            // Ex: "CLP_PRINCIPAL_MODBUS_TCP"
  limiteMinimoAlerta?: number;
  limiteMaximoAlerta?: number;
  limiteCritico?: number;
  ultimoScan: string;
  descricao: string;
}

export interface DataSourceTagGroup {
  id: string;
  nome: string;
  protocolo: 'MODBUS_TCP' | 'OPC_UA' | 'DNP3' | 'INTERNAL_MEMORY';
  ipHost: string;
  porta: number;
  statusConexao: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  taxaScanMs: number;
  totalTags: number;
  tagsComFalha: number;
}

export interface CellProvisionConfig {
  codigo: string;
  posicaoRack: number;
  paresEletrodo: number;
  dimensoesMm: string;
  vazaoNominalLh: number;
  ativa: boolean;
}

// ----------------------------------------------------
// FASE 1: Motor de Tags Virtuais e Fórmulas Matemáticas
// ----------------------------------------------------
export interface FormulaTag {
  id: string;
  nome: string;
  tagPath: string;               // Ex: "Calculadas.DeltaP_Manifold"
  expressao: string;             // Ex: "(PT_101 - PT_102) * 10.197"
  unidade: string;               // Ex: "mca", "L/h", "%", "kW"
  descricao: string;
  valorCalculado: number;
  statusCalculo: 'OK' | 'ERRO_SINTAXE' | 'TAG_INEXISTENTE';
  mensagemErro?: string;
  limiteAlertaMin?: number;
  limiteAlertaMax?: number;
  criadoEm: string;
  atualizadoEm: string;
  autor: string;
}

// ----------------------------------------------------
// FASE 2: Central de Alertas e Notificações Externas
// ----------------------------------------------------
export interface ExternalNotificationSettings {
  telegramHabilitado: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  webhookHabilitado: boolean;
  webhookUrl: string;
  webhookSecret?: string;
  emailHabilitado: boolean;
  destinatariosEmail: string[];
  nivelMinimoDisparo: 'INFO' | 'ALERTA' | 'CRITICO';
  intervaloMinimoReenvioMinutos: number; // Anti-flood
  notificarRecuperacao: boolean;
  ultimoDisparoTimestamp?: string;
  totalNotificacoesEnviadas: number;
}

export interface NotificationDispatchLog {
  id: string;
  timestamp: string;
  severidade: NivelSeveridadeAlarme;
  canal: 'TELEGRAM' | 'WEBHOOK' | 'EMAIL' | 'SISTEMA';
  destinatario: string;
  mensagem: string;
  status: 'SUCESSO' | 'FALHA' | 'SIMULADO';
  detalhesResposta?: string;
}

// ----------------------------------------------------
// FASE 3: Gateway de Conexão Física a PLCs & Barramento Modbus
// ----------------------------------------------------
export interface ModbusFieldMapping {
  id: string;
  nome: string;
  tagAssociada: string;
  tipoRegistrador: 'COIL' | 'DISCRETE_INPUT' | 'INPUT_REGISTER' | 'HOLDING_REGISTER';
  endereco: number;              // Ex: 1, 30001, 40001
  tipoDado: 'INT16' | 'UINT16' | 'FLOAT32' | 'BOOLEAN';
  fatorEscala: number;           // Ex: 0.1 para 24.5V armazenado como 245
  offset: number;
  unidade: string;
  descricao: string;
  somenteLeitura: boolean;
  ultimoValorLido?: number | boolean | string;
}

export interface HardwareGatewayStatus {
  statusConexao: 'ONLINE' | 'OFFLINE' | 'DEGRADADO';
  ipGateway: string;
  porta: number;
  protocolo: 'MODBUS_TCP' | 'MODBUS_RTU_SERIAL' | 'OPC_UA';
  taxaVarreduraMs: number;
  ultimoHeartbeat: string;
  pacotesRecebidos: number;
  pacotesPerdidos: number;
  latenciaMs: number;
  totalRegistradoresMapeados: number;
  dispositivoAlvo: 'CLP_SIEMENS_S7_1200' | 'CLP_SCHNEIDER_M241' | 'CLP_WEG_PLC300' | 'ESP32_INDUSTRIAL_GATEWAY';
}

// ----------------------------------------------------
// INTEGRAÇÃO PURIFYWAVE OS V2 (OXIDAÇÃO AVANÇADA, UGL & CONAMA 430)
// ----------------------------------------------------
export type EstagioSinfoniaQuimica = 
  | 'ESTAGIO_1_CONDICIONAMENTO'
  | 'ESTAGIO_2_OXIDACAO_RADICALAR'
  | 'ESTAGIO_3_ESTABILIZACAO_SILICIO'
  | 'ESTAGIO_4_CLARIFICACAO_POLIMENTO';

export interface PurifyWaveReagentesDosagem {
  polioxidoCloroMgL: number;      // Dosagem típica: 15 a 80 mg/L
  silicioReativoMgL: number;       // Dosagem típica: 5 a 30 mg/L
  coagulanteAuxiliarMgL: number;   // Dosagem típica: 2 a 15 mg/L
  polimeroFloculantePpm: number;   // Dosagem para UGL: 0.5 a 4.0 ppm
}

export interface ConthecComponente {
  codigo: 'CONTHEC_A' | 'CONTHEC_B' | 'CONTHEC_C';
  nome: string;                 // "CONTHEC A (Reagente Oxidante)", "CONTHEC B (Estabilizador Silício)", "CONTHEC C (Catalisador)"
  funcaoQuimica: string;
  volumeAtualML: number;
  capacidadeMaximaML: number;    // 500 mL para A, 220 mL para B, 220 mL para C
  vazaoDosagemMLh: number;      // Vazão instantânea da bomba dosadora
  proporcaoNominalPct: number;  // 53.2% A, 23.4% B, 23.4% C (Base 500:220:220)
  statusNivel: 'NORMAL' | 'NIVEL_BAIXO' | 'CRITICO_VAZIO';
}

export interface ConthecSkidState {
  componenteA: ConthecComponente;  // Reagente 500 mL
  componenteB: ConthecComponente;  // Estabilizador Silício 220 mL
  componenteC: ConthecComponente;  // Catalisador 220 mL
  camaraMistura: {
    ativa: boolean;
    tempoHomogeneizacaoS: number;   // 180s a 300s (3-5 min)
    tempoRestanteS: number;
    volumeAcumuladoML: number;
    statusReacao: 'HOMOGENEIZANDO' | 'PRONTO_PARA_INJECAO' | 'STANDBY';
    temperaturaC: number;
  };
  injetorDiluicao4: {
    ativo: boolean;
    vazaoAguaDiluicaoLh: number;    // Ex: 120 L/h de água de arraste
    concentracaoFinalPpm: number;   // Ex: 38.5 ppm de produto ativo
    pressaoInjecaoBar: number;      // Ex: 3.2 bar
    statusBomba: 'OPERANDO_NORMAL' | 'STANDBY' | 'FALHA_PRESSAO';
  };
  proporcaoEstequiometricaValida: boolean;
  autonomiaEstimadaHoras: number;
}

// ----------------------------------------------------
// FASE 2: BOMBA BIOSSÔNICA DE CAVITAÇÃO (BBS-100)
// ----------------------------------------------------
export type BombaBiossonicaPosicao = 
  | 'POS_1_PRIMARIO_ENTRADA'      // Entrada de Água Bruta (desaglomeração e quebra de coloides)
  | 'POS_2_INTERMEDIARIO_POA'     // Pós-PuriFyWave (homogeneização radicalar da mistura CONTHEC)
  | 'POS_3_RETROLAVAGEM_UGL'      // Retrolavagem ZLD (descolamento de biofilmes nos eletrodos e condicionamento de lodo)
  | 'POS_4_POLIMENTO_TERMINAL';   // Terminal antes do T-201 (esterilização física e lise terminal)

export interface BombaBiossonicaState {
  tag: string;                    // "BBS-100"
  ativa: boolean;
  modoOperacao: 'AUTOMATICO_ADAPTATIVO' | 'MANUAL_SUPERVISIONADO';
  posicaoAtual: BombaBiossonicaPosicao;
  rotacaoRpm: number;             // Faixa: 1.200 a 3.600 RPM (nominal: 2.850 RPM)
  frequenciaUltrassonicaKhz: number; // Faixa: 20.0 a 40.0 kHz (nominal: 28.5 kHz)
  intensidadeCavitacaoPct: number; // 0 a 100% (nominal: 82%)
  vazaoProcessadaM3h: number;     // 30 a 180 m³/h (nominal: 180 m³/h)
  pressaoEntradaBar: number;      // Nominal: 1.20 bar
  pressaoSaidaBar: number;        // Nominal: 2.65 bar
  deltaPBar: number;              // Pressão diferencial (1.45 bar)
  potenciaAcusticaKw: number;     // Nominal: 7.5 kW
  eficienciaLiseCelularPct: number; // Nominal: 99.8%
  temperaturaCamaraC: number;     // Nominal: 28.4 °C
  statusAlarme: 'NORMAL' | 'ALERTA_CAVITACAO_EXCESSIVA' | 'SOBREAQUECIMENTO';
  horimetroHoras: number;
}

export interface PurifyWaveUglState {
  prensaAtiva: boolean;
  taxaDesaguamentoPct: number;     // Ex: 88.5%
  umidadeTortaPct: number;         // Ex: 18.2% (apto para agricultura < 25%)
  lodoProcessadoKgH: number;       // Ex: 450 kg/h
  estabilizacaoSilicioConforme: boolean;
  ausenciaOdores: boolean;
  destinacaoAgricolaStatus: 'APTO_BIOSSOLIDO' | 'EM_ANALISE' | 'RESTRITO';
  temperaturaReacaoC: number;
  
  // Interligação ZLD (Zero Liquid Discharge) com Retrolavagem FTE-CDI (XV-103)
  linhaZldRetrolavagemAtiva: boolean;
  vazaoResiduoRecebidaLh: number;             // Resíduo concentrado recebido de XV-103 (ex: 850 L/h)
  concentracaoFluorRecebidaPpm: number;       // Concentração do rejeito (ex: 64.5 mg/L F⁻)
  massaFluorossilicatoPrecipitadaKgH: number; // Imobilização mineral por silício (ex: 0.12 kg/h de SiF6²⁻)
  vazaoFiltradoRecuperadoLh: number;          // Água limpa recuperada que retorna para T-100 (ex: 780 L/h)
  recuperacaoAguaZldPct: number;              // Taxa de recuperação hídrica (ex: 91.8%)
}

// ----------------------------------------------------
// FASE 3: SELETOR DE TOPOLOGIAS DINÂMICAS (1-CLICK PIPELINE SWITCHER)
// ----------------------------------------------------
export type TopologiaTratamentoId = 
  | 'TOPOLOGIA_A_PRE_OXIDACAO'        // Padrão: T-100 -> PuriFyWave (POA CONTHEC) -> FTE-CDI -> T-201
  | 'TOPOLOGIA_B_POS_OXIDACAO'        // Invertida: T-100 -> FTE-CDI -> PuriFyWave (Polimento/Residual) -> T-201
  | 'TOPOLOGIA_C_LINHAS_PARALELAS'    // Paralelo 50/50: T-100 -> [Linha 1 POA + Linha 2 FTE-CDI] -> Misturador -> T-201
  | 'TOPOLOGIA_D_FTE_DIRETO_BYPASS';  // Direto: T-100 -> FTE-CDI -> T-201 (Bypass do POA para manutenção)

export interface TopologiaInfo {
  id: TopologiaTratamentoId;
  nome: string;
  codigo: string;
  descricaoCurta: string;
  descricaoDetalhada: string;
  fluxoDiagrama: string;
  perdaCargaEstimadaBar: number;
  tempoResidenciaHidraulicoMin: number;
  indicacaoAplicacao: string;
  statusValvulasMotorizadas: {
    xv101_EntradaPoco: 'ABERTA' | 'FECHADA';
    xv201_TransferenciaPoaParaFte: 'ABERTA' | 'FECHADA';
    xv202_BypassPoaDireto: 'ABERTA' | 'FECHADA';
    xv301_EntradaFteCdi: 'ABERTA' | 'FECHADA';
    xv302_TransferenciaFteParaPoa: 'ABERTA' | 'FECHADA';
    xv401_SaidaPotavelFinal: 'ABERTA' | 'FECHADA';
  };
}

// ----------------------------------------------------
// FASE 4: VÁLVULAS MOTORIZADAS SCADA, POÇO TUBULAR PROFUNDO T-100 E VISUALIZAÇÃO
// ----------------------------------------------------
export type EstadoValvulaMotorizada = 'ABERTA' | 'FECHADA' | 'TRANSITANDO' | 'FALHA_TORQUE' | 'INTERTRAVADA';
export type ModoControleValvula = 'AUTOMATICO_TOPOLOGIA' | 'MANUAL_SUPERVISIONADO';

export interface ValvulaMotorizadaInfo {
  tag: string;                    // Ex: 'XV-100', 'XV-101', 'XV-103', 'XV-201', 'XV-202', 'XV-301', 'XV-302', 'XV-401'
  nome: string;                   // "Válvula de Transferência POA ➔ FTE-CDI", "Válvula de Retrolavagem/Rejeito FTE ➔ UGL"
  tipo: 'BORBOLETA_MOTORIZADA' | 'ESFERA_MOTORIZADA' | 'GLOBO_CONTROLE';
  diametroDn: string;             // "DN200 (8\")" ou "DN100 (4\")"
  pressaoNominal: string;         // "PN10 / PN16"
  atuadorModelo: string;          // "AUMA SA 07.6 / Rotork IQ10"
  estado: EstadoValvulaMotorizada;
  posicaoAberturaPct: number;     // 0 a 100%
  modoControle: ModoControleValvula;
  fimCursoAbertoZSO: boolean;
  fimCursoFechadoZSC: boolean;
  tempoCursoS: number;            // 3.5 segundos
  torqueNm: number;               // 120 Nm
  correnteMotorA: number;         // 1.85 A
  temperaturaAtuadorC: number;    // 34.2 °C
  intertravamentoSeguranca: boolean;
  motivoIntertravamento?: string | null;
  ultimaManobraTimestamp: string;
  operadorUltimaManobra: string;
}

export interface BombaSubmersaState {
  tag: string;                    // "B-100"
  modelo: string;                 // "Grundfos SP 215-4 / Ebara 8BPS 200"
  potenciaCv: number;             // 75 CV (55 kW)
  status: 'LIGADA' | 'DESLIGADA' | 'TRIP_SOBRECARGA' | 'PROTECAO_NIVEL_SECO';
  modoOperacao: 'AUTOMATICO_VFD' | 'MANUAL';
  frequenciaHz: number;           // 30 a 60 Hz (nominal: 52.4 Hz)
  rotacaoRpm: number;             // Nominal: 3.140 RPM
  correnteAmp: number;            // Nominal: 86.4 A
  tensaoV: number;                // 380 V Trifásico
  pressaoDescargaBar: number;     // Nominal: 6.8 bar (68 mca)
  temperaturaMotorC: number;      // Nominal: 48.5 °C
  vibracaoMmS: number;            // Nominal: 1.8 mm/s
  horimetroHoras: number;
}

export interface PocoT100State {
  id: string;                     // "T-100"
  nome: string;                   // "Poço Tubular Profundo PTP-04"
  localizacao: string;            // "Campo de Captação Norte - Lat: -22.8934° Long: -47.0583° Cota: 612m"
  aquifero: string;               // "Aquífero Guarani / Tubarão (Formação Piramboia)"
  profundidadeTotalM: number;     // 180.0 m
  diametroPerfuraoPol: number;    // 12 pol (300 mm)
  revestimentoMaterial: string;   // "Aço Inox AISI 304 / PEAD Ranhurado DN250"
  nivelEstaticoM: number;         // 28.5 m
  nivelDinamicoM: number;         // 62.0 m
  rebaixamentoM: number;          // 33.5 m
  vazaoEspecificaM3hM: number;    // 5.37 m³/h·m
  vazaoAtualM3h: number;          // Nominal: 180.0 m³/h (50 L/s)
  vazaoSetadaM3h: number;         // 180.0 m³/h
  temperaturaAguaC: number;       // 24.2 °C
  condutividadeUsCm: number;      // 1.420 µS/cm
  phNatural: number;              // 6.85
  fluoretoNaturalMgL: number;     // 8.50 mg/L
  turbidezNaturalNtu: number;     // 12.4 NTU
  bombaSubmersa: BombaSubmersaState;
  valvulaSaidaTag: string;        // "XV-100"
  transmissorVazaoTag: string;    // "FIT-100"
}

export type ModoVisualizacaoSinoptico = 
  | 'LAYOUT_FISICO_PLANTA'        // Layout Físico Real e Manifold de Manobra
  | 'DIAGRAMA_FLUXO_SEQUENCIAL';  // Diagrama de Fluxo Sequencial Dinâmico (Dynamic PFD)

// ----------------------------------------------------
// FASE 6: NAVEGAÇÃO INDUSTRIAL HÍBRIDA SCADA (HORIZONTAL X VERTICAL RETRÁTIL)
// ----------------------------------------------------
export type LayoutNavegacaoScada = 
  | 'HORIZONTAL'          // Modelo Imagem 2: Header horizontal com abas em pill, mega-dropdowns e overflow "Mais"
  | 'VERTICAL_EXPANDIDO'  // Modelo Imagem 3: Sidebar vertical expandida (260 px) com árvore ISA-101
  | 'VERTICAL_COLAPSADO'; // Modelo Imagem 3: Sidebar vertical colapsada / mini-sidebar (68 px) com tooltips flutuantes

export interface UserNavPreference {
  id: string;
  usuarioId: number;
  layoutNavegacao: LayoutNavegacaoScada;
  somAlarmeHabilitado: boolean;
  temaVisual: 'DARK_INDUSTRIAL' | 'HIGH_CONTRAST';
  abaInicial: string;
  atualizadoEm: string;
}

export interface NavDropdownItem {
  id: string;
  label: string;
  desc: string;
  badge?: string;
  categoria: 'PROCESSO' | 'QUIMICA_ZLD' | 'ENGENHARIA_APOIO';
}

// ----------------------------------------------------
// FASE 5: REATOR FTE-CDI E SKID CONTHEC DE 3 POSIÇÕES & REDE HIDRÁULICA VETORIAL SCADA WEB
// ----------------------------------------------------
export type FteCdiLayoutPosition = 
  | 'POS_1_INICIO'   // FTE-CDI a Montante: T-100 -> FTE-CDI -> POA -> T-201
  | 'POS_2_MEIO'     // FTE-CDI Central: T-100 -> POA -> FTE-CDI -> BBS-100 -> T-201
  | 'POS_3_FINAL';   // FTE-CDI a Jusante: T-100 -> POA -> BBS-100 -> FTE-CDI -> T-201

export type ConthecLayoutPosition =
  | 'POS_1_INICIO'   // Skid CONTHEC a Montante: T-100 -> CONTHEC (Pré-Oxidação) -> Manifold
  | 'POS_2_MEIO'     // Skid CONTHEC Intermediário: FTE-CDI -> CONTHEC (Pós-Oxidação) -> Manifold
  | 'POS_3_FINAL';   // Skid CONTHEC a Jusante: Manifold -> CONTHEC (Desinfecção/Polimento Terminal)

export interface TanqueReusoT102State {
  tag: string;                       // 'T-102'
  nome: string;                      // 'Tanque de Água de Reuso ZLD (Circuito Fechado)'
  capacidadeNominalM3: number;       // 5.0 m³
  volumeAtualM3: number;             // Ex: 3.72 m³
  nivelPct: number;                  // Ex: 74.4%
  vazaoEntradaFiltradoLh: number;    // Ex: 780 L/h (Proveniente da Prensa Parafuso UGL)
  vazaoSaidaLavagemTelaLh: number;   // Ex: 400 L/h (Lavagem contínua da tela da prensa)
  vazaoSaidaDiluicaoReagentesLh: number; // Ex: 380 L/h (Diluição frascos B e C e Injetor 4 CONTHEC)
  qualidadeCondutividadeUsCm: number;// Ex: 320 µS/cm
  turbidezNtu: number;               // Ex: 1.15 NTU
  ph: number;                        // Ex: 7.20
  statusCircuito: 'CIRCUITO_FECHADO_ZLD_ISOLADO' | 'ALERTA_NIVEL_ALTO' | 'TRANSBORDAMENTO';
}

export type TipoFluidoIndustrial = 
  | 'AGUA_BRUTA'
  | 'AGUA_OXIDADA'
  | 'POTAVEL_PORTARIA_888'
  | 'REJEITO_ZLD_SALMOURA'
  | 'LODO_QUIMICO'
  | 'AGUA_REUSO_ZLD';

export interface PipelineSectionInfo {
  tag: string;                    // Ex: 'L-101-DN200-PEAD'
  nome: string;                   // 'Linha de Alimentação Geral de Água Bruta'
  origemTag: string;              // 'T-100'
  destinoTag: string;             // 'SKID_CONTHEC' ou 'REATOR_FTE_CDI'
  tipoFluido: TipoFluidoIndustrial;
  diametroDn: string;             // 'DN200 (8")'
  diametroInternoMm: number;      // 190.2 mm
  pressaoNominal: string;         // 'PN10'
  material: 'PEAD_PE100' | 'ACO_INOX_304' | 'PVC_U';
  rugosidadeMm: number;           // 0.007 mm
  comprimentoEquivalenteM: number;// 45.0 m
  vazaoM3h: number;               // 180.0 m³/h
  velocidadeEscoamentoMs: number; // 1.76 m/s
  reynoldsRe: number;             // 334.000
  fatorAtritoDarcy: number;       // 0.0145
  perdaCargaBar: number;          // 0.28 bar
  pressaoEntradaBar: number;      // 6.80 bar
  pressaoSaidaBar: number;        // 6.52 bar
  sentidoFluxo: 'NORMAL' | 'REVERSO' | 'BLOQUEADO';
  animacaoAtiva: boolean;
  corHex: string;                 // '#fbbf24', '#10b981', '#ef4444', '#78350f', '#06b6d4'
  descricaoProcesso: string;
}

export interface PurifyWaveState {
  ativo: boolean;
  modoOperacao: 'AUTOMATICO_ADAPTATIVO' | 'MANUAL_SUPERVISIONADO';
  topologiaAtiva: TopologiaTratamentoId; // Topologia Dinâmica Ativa (Fase 3)
  posicaoFteCdi: FteCdiLayoutPosition;   // Posição Real do Reator FTE-CDI no Sinóptico (Início, Meio, Final)
  posicaoConthec: ConthecLayoutPosition; // Posição Real do Skid CONTHEC no Sinóptico (Início, Meio, Final)
  modoVisualizacao: ModoVisualizacaoSinoptico; // Modo de Exibição do Sinóptico
  tubulacaoSelecionadaTag?: string | null; // TAG da tubulação ativa para inspeção no modal
  estagioAtual: EstagioSinfoniaQuimica;
  progressoEstagioPct: number;
  vazaoAfluenteM3h: number;        // Vazão de entrada (ex: 180 m³/h)
  dosagens: PurifyWaveReagentesDosagem;
  skidConthec: ConthecSkidState;   // Skid Quádruplo CONTHEC (A, B, C + Injetor 4 de Diluição)
  tanqueReusoT102: TanqueReusoT102State; // Tanque de Água de Reuso T-102 (5 m³ - Circuito Fechado ZLD)
  biossonica: BombaBiossonicaState; // Bomba Biossônica de Cavitação BBS-100
  pocoT100: PocoT100State;         // Poço Tubular Profundo T-100 & Bomba Submersa B-100
  valvulas: Record<string, ValvulaMotorizadaInfo>; // Válvulas Motorizadas SCADA (XV-100, XV-101, XV-103, XV-201, XV-202, XV-301, XV-302, XV-401)
  
  // Parâmetros de Entrada (Água Bruta / Efluente)
  orpInMv: number;                 // Ex: -120 mV (ambiente redutor)
  turbidezInNtu: number;           // Ex: 85 NTU
  phIn: number;                    // Ex: 6.8
  dqoInMgL: number;                // Ex: 450 mg/L
  dboInMgL: number;                // Ex: 220 mg/L
  fenoisInPpm: number;             // Ex: 12.5 ppm
  oleosGraxasInPpm: number;        // Ex: 45.0 ppm
  coliformesInUfc: number;         // Ex: 1.8e6 UFC/100mL
  
  // Parâmetros de Saída da Pré-Oxidação (Alimentação para FTE-CDI)
  orpOutMv: number;                // Ex: +680 mV (ambiente oxidante controlado)
  turbidezOutNtu: number;          // Ex: 1.2 NTU
  phOut: number;                   // Ex: 7.2
  dqoOutMgL: number;               // Ex: 35 mg/L (redução > 92%)
  dboOutMgL: number;               // Ex: 12 mg/L
  fenoisOutPpm: number;            // Ex: 0.05 ppm (redução 99.6%)
  oleosGraxasOutPpm: number;       // Ex: < 2.0 ppm
  coliformesOutUfc: number;        // Ex: < 1 UFC/100mL (100% desinfecção)
  
  // Eficiências Instantâneas
  eficienciaOxidacaoPct: number;
  remocaoDqoPct: number;
  remocaoFenoisPct: number;
  desinfeccaoPct: number;
  
  // Módulo UGL & ZLD
  ugl: PurifyWaveUglState;
  
  // Intertravamento com Reator FTE-CDI
  fluxoLiberadoParaFteCdi: boolean;
  motivoBloqueio?: string | null;
}

export interface LaudoDuploParametro {
  nome: string;
  categoria: 'PORTARIA_888_POTABILIDADE' | 'CONAMA_430_EFLUENTES' | 'BIOSSOLIDO_UGL';
  amostraEntrada: string | number;
  amostraSaida: string | number;
  unidade: string;
  limiteNorma: string;
  statusConformidade: 'CONFORME' | 'NAO_CONFORME' | 'EM_ANALISE';
  metodologia: string;
  observacoes: string;
}

export interface LaudoIntegradoDuplo {
  id: string;
  numeroLaudo: string;
  dataEmissao: string;
  responsavelTecnicoCRQ: string;
  responsavelTecnicoCREA: string;
  solicitante: string;
  unidadePlanta: string;
  
  // Status de Conformidade
  conformidadePortaria888: boolean;
  conformidadeConama430: boolean;
  conformidadeBiossolidoUgl: boolean;
  
  // Resumo Quantitativo
  resumoQuimico: {
    vazaoTotalTratadaM3h: number;
    fluoretoFinalPpm: number;
    dqoFinalMgL: number;
    turbidezFinalNtu: number;
    phFinal: number;
    desinfeccaoPct: number;
    desaguamentoLodoPct: number;
  };
  
  parametros: LaudoDuploParametro[];
  conclusaoParecer: string;
  statusSql: 'SALVO' | 'PENDENTE';
}


