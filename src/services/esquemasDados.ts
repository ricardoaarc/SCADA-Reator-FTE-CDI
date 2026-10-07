/**
 * Esquemas de validação dos dados que o SCADA salva no navegador (usados por storageSeguro.ts).
 * Mantenha em sincronia com as interfaces em types.ts e multiStationService.ts.
 */

import { esq, Esquema } from './storageSeguro';

const txt = esq.texto();
const txtCurto = esq.texto({ max: 300 });
const num = esq.numero();
const bool = esq.booleano();

// Fórmulas são avaliadas por new Function(): só caracteres aritméticos/identificadores (sem aspas, crases, chaves, ; ou $)
const EXPRESSAO_SEGURA = /^[\w\s.+\-*/%()<>=!&|?:,^]*$/;
const URL_HTTP = /^$|^https?:\/\/\S+$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- Estações e instrumentos (multiStationService)
export const esquemaEstacao: Esquema = esq.objeto({
  id: txtCurto, codigoEstacao: txtCurto, nome: txtCurto,
  tipo: esq.enum(['ETA', 'ETE', 'POCO_ADUTORA', 'RESERVATORIO', 'REBOOT_PUMP']),
  latitude: esq.numero({ min: -90, max: 90 }), longitude: esq.numero({ min: -180, max: 180 }),
  ipGateway: txtCurto,
  protocolo: esq.enum(['MQTT_TLS', 'MODBUS_TCP', 'OPC_UA', 'REST_API']),
  frequenciaPingS: esq.numero({ min: 1, max: 86400 }),
  statusConexao: esq.enum(['ONLINE', 'OFFLINE', 'ALERTA']),
  criadoEm: txtCurto, atualizadoEm: txtCurto,
});

export const esquemaInstrumento: Esquema = esq.objeto({
  id: txtCurto, stationId: txtCurto, tagEquipamento: txtCurto, nomeAmigavel: txtCurto,
  tipoEquipamento: esq.enum(['BOMBA', 'VALVULA', 'FIT_VAZAO', 'ANALISADOR_F', 'PHMETRO', 'TURBIDIMETRO', 'SENS_PRESSAO']),
  enderecoModbus: txtCurto, unidadeMedida: txtCurto,
  limiteAlertaMin: esq.opcional(num), limiteAlertaMax: esq.opcional(num),
  statusOperacional: esq.enum(['OK', 'ALERTA', 'FALHA']),
});

// ---- Fórmulas / tags virtuais (formulaService)
export const esquemaFormula: Esquema = esq.objeto({
  id: txtCurto, nome: txtCurto,
  tagPath: esq.texto({ max: 300, padrao: /^[\w.\-]+$/ }),
  expressao: esq.texto({ max: 500, padrao: EXPRESSAO_SEGURA }),
  unidade: txtCurto, descricao: txt,
  valorCalculado: esq.ouNulo(num), // NaN vira null no JSON; normalizado para 0 ao carregar
  statusCalculo: esq.enum(['OK', 'ERRO_SINTAXE', 'TAG_INEXISTENTE']),
  mensagemErro: esq.opcional(txt),
  limiteAlertaMin: esq.opcional(num), limiteAlertaMax: esq.opcional(num),
  criadoEm: txtCurto, atualizadoEm: txtCurto, autor: txtCurto,
});
export const normalizarFormula = (f: any) => ({ ...f, valorCalculado: f.valorCalculado ?? 0 });

// ---- Usuários cadastrados (AuthService)
export const esquemaOperador: Esquema = esq.objeto({
  id: txtCurto, nome: txtCurto, matricula: txtCurto,
  role: esq.enum(['OPERADOR', 'SUPERVISOR', 'ENGENHEIRO', 'ADMIN', 'AUDITOR']),
  cargo: txtCurto, email: txtCurto, ultimoAcesso: txtCurto,
  zonasAutorizadas: esq.opcional(esq.lista(txtCurto, { max: 50 })),
  permissoes: esq.opcional(esq.objeto({
    canViewSynoptic: bool, canEditLayout: bool, canOperatePumps: bool,
    canResetInterlocks: bool, canExportReports: bool, canManageUsers: bool,
  })),
  senhaPin: esq.opcional(txtCurto), // legado (texto puro), migrado ao carregar
  pinHash: esq.opcional(esq.texto({ max: 200, padrao: /^pbkdf2-sha256\$\d{4,8}\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/ })),
  pinPadrao: esq.opcional(bool),
  status: esq.opcional(esq.enum(['ATIVO', 'INATIVO'])),
});

// ---- Notificações (NotificationService)
export const camposNotificacao: Record<string, Esquema> = {
  emailHabilitado: bool,
  destinatariosEmail: esq.lista(esq.texto({ max: 254, padrao: EMAIL }), { max: 50 }),
  pushHabilitado: bool,
  somSireneHabilitado: bool,
  webhookHabilitado: bool,
  webhookUrl: esq.texto({ max: 2000, padrao: URL_HTTP }),
  cooldownSegundos: esq.numero({ min: 0, max: 86400 }),
};

export const esquemaAlerta: Esquema = esq.objeto({
  id: txtCurto, timestamp: txtCurto, interlockMotivo: txt,
  severidade: esq.enum(['ALERTA', 'CRITICO', 'NAO_CONFORMIDADE_REGULATORIA', 'INFO']),
  canaisDisparados: esq.lista(esq.enum(['PUSH', 'EMAIL', 'WEBHOOK', 'SIREN']), { max: 10 }),
  destinatariosEmail: esq.lista(txtCurto, { max: 50 }),
  statusEnvio: esq.enum(['ENVIADO', 'ENTREGUE', 'FALHA', 'BLOQUEADO_NAVEGADOR']),
  falhaEntrega: esq.opcional(txt),
  pressaoBar: num, vazaoLh: num, tensaoV: num, correnteA: num,
  detalhesTecnicos: esq.objeto({
    releBombaDesarmado: bool, pressaoCriticaAtingida: bool,
    celulasComprometidas: esq.lista(num, { max: 100 }), recomendacaoOperacional: txt,
  }),
  emailPreview: esq.objeto({
    remetente: txtCurto, destinatarios: esq.lista(txtCurto, { max: 50 }),
    assunto: txt, corpoHtml: txt, corpoTexto: txt,
  }),
});

// ---- Layout CAD (database)
export const esquemaCadLayout: Esquema = esq.objeto({
  id: txtCurto, estacaoId: txtCurto, nomeLayout: txtCurto, operador: txtCurto,
  posicoes: esq.mapa(esq.objeto({ x: num, y: num })),
  criadoEm: txtCurto, atualizadoEm: txtCurto,
});

// ---- Layout PurifyWave (purifywaveIntegrationService)
const POS = esq.enum(['POS_1_INICIO', 'POS_2_MEIO', 'POS_3_FINAL']);
export const camposLayoutPurifyWave: Record<string, Esquema> = {
  topologiaAtiva: esq.enum(['TOPOLOGIA_A_PRE_OXIDACAO', 'TOPOLOGIA_B_POS_OXIDACAO', 'TOPOLOGIA_C_LINHAS_PARALELAS', 'TOPOLOGIA_D_FTE_DIRETO_BYPASS']),
  posicaoFteCdi: POS,
  posicaoConthec: POS,
  modoVisualizacao: esq.enum(['LAYOUT_FISICO_PLANTA', 'DIAGRAMA_FLUXO_SEQUENCIAL']),
  posicaoBiossonica: esq.enum(['POS_1_PRIMARIO_ENTRADA', 'POS_2_INTERMEDIARIO_POA', 'POS_3_RETROLAVAGEM_UGL', 'POS_4_POLIMENTO_TERMINAL']),
};
