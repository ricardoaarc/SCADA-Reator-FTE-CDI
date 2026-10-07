/**
 * Fonte Única Oficial de Engenharia: Mapa Modbus PurifyWave / FTE-CDI
 * Conformidade: IEC 61131-3, IEC 62443-4-2 e ISA-18.2
 *
 * Módulo introduzido no PR-3a como autoridade canônica de endereçamento,
 * classes operacionais, limites físicos [min, max], polaridades fail-safe e escalas.
 */

import { ModbusRegister } from '../types';

export type ClassePontoModbus = 'seguranca' | 'comando' | 'medicao' | 'setpoint' | 'status';
export type TipoModbusPonto = 'HOLDING_REGISTER' | 'COIL' | 'DISCRETE_INPUT' | 'INPUT_REGISTER';
export type PolaridadePonto = 'NF' | 'NA' | 'NAO_APLICAVEL';
export type SinalPonto = 'unsigned' | 'signed';

export interface PontoModbusMeta {
  endereco: number;
  tipoModbus: TipoModbusPonto;
  tag: string;
  nome: string;
  descricao: string;
  classe: ClassePontoModbus;
  faixa: [number, number];
  unidade: string;
  escala: number;
  tamanho: 1 | 16 | 32;
  sinal: SinalPonto;
  polaridade: PolaridadePonto;
  somenteLeitura: boolean;
  valorPadrao: number | boolean;
}

/**
 * Versão do Mapa Modbus congelada no CLP para validação de integridade.
 * Registrador 40099 conterá o valor 21 (v2.1).
 */
export const MAP_VERSION_ATUAL = 21;
export const REGISTRADOR_MAP_VERSION = 40099;
export const REGISTRADOR_WATCHDOG = 40015;
export const TIMEOUT_WATCHDOG_CLP_MS = 5000;
export const INTERVALO_WATCHDOG_SCADA_MS = 1000;

/**
 * -------------------------------------------------------------------------
 * MAPA MODBUS v2.1 CONGELADO (CONTRATO DEFINITIVO COM A ENGENHARIA DE AUTOMAÇÃO)
 * -------------------------------------------------------------------------
 */
export const MAPA_MODBUS_V2_1: Record<number, PontoModbusMeta> = {
  // === DISCRETE INPUTS (Função Modbus 02 — 10001 a 19999) ===
  10001: {
    endereco: 10001,
    tipoModbus: 'DISCRETE_INPUT',
    tag: 'ESTOP_OK_DI',
    nome: 'Circuito de Parada de Emergência (E-STOP)',
    descricao: 'Circuito físico cabeado normalmente fechado (NF). 1 = Íntegro/Seguro, 0 = Atuado/Emergência.',
    classe: 'seguranca',
    faixa: [0, 1],
    unidade: 'OK/FALHA',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NF',
    somenteLeitura: true,
    valorPadrao: true
  },
  10002: {
    endereco: 10002,
    tipoModbus: 'DISCRETE_INPUT',
    tag: 'SOBREPRESSAO_OK_DI',
    nome: 'Pressostato de Segurança do Reator FTE-CDI (PSH-101)',
    descricao: 'Pressostato cabeado NF para proteção contra sobrepressão do plenum. 1 = Pressão Normal, 0 = Sobrepressão.',
    classe: 'seguranca',
    faixa: [0, 1],
    unidade: 'OK/FALHA',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NF',
    somenteLeitura: true,
    valorPadrao: true
  },

  // === COILS DIGITAIS (Funções Modbus 01/05 — 00001 a 09999) ===
  1: {
    endereco: 1,
    tipoModbus: 'COIL',
    tag: 'CMD_P101',
    nome: 'Comando Bomba Principal P-101',
    descricao: 'Habilitação da partida da Bomba P-101 de alimentação do reator CDI.',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'ON/OFF',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: true
  },
  2: {
    endereco: 2,
    tipoModbus: 'COIL',
    tag: 'CMD_PW201',
    nome: 'Comando Fonte DC Células PW-201',
    descricao: 'Habilitação da fonte chaveada DC de polarização eletrostática das células FTE-CDI.',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'ON/OFF',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: true
  },
  3: {
    endereco: 3,
    tipoModbus: 'COIL',
    tag: 'CMD_XV102',
    nome: 'Válvula de Purga ZLD XV-102',
    descricao: 'Válvula solenoide de purga e descarte de salmoura para o skid de recuperação ZLD.',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'ABERTA/FECHADA',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: false
  },
  4: {
    endereco: 4,
    tipoModbus: 'COIL',
    tag: 'CMD_XV103',
    nome: 'Válvula Recirculação / Reúso T-102 XV-103',
    descricao: 'Válvula solenoide de direcionamento do permeado para o tanque de homogeneização biossônica.',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'ABERTA/FECHADA',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: true
  },
  5: {
    endereco: 5,
    tipoModbus: 'COIL',
    tag: 'CMD_RESET_INTERLOCK',
    nome: 'Comando Rearme Geral de Intertravamento',
    descricao: 'Pulso de rearme do circuito de intertravamento após eliminação da causa e validação de segurança.',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'PULSO',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: false
  },
  6: {
    endereco: 6,
    tipoModbus: 'COIL',
    tag: 'MODO_PID_AUTO_MANUAL',
    nome: 'Comutação Modo PID Bomba P-101',
    descricao: 'Modo de controle da vazão da bomba P-101: 1 = AUTO (CLP fecha malha), 0 = MANUAL (CLP obedece 40016).',
    classe: 'comando',
    faixa: [0, 1],
    unidade: 'AUTO/MANUAL',
    escala: 1,
    tamanho: 1,
    sinal: 'unsigned',
    polaridade: 'NA',
    somenteLeitura: false,
    valorPadrao: true
  },

  // === HOLDING REGISTERS (Funções Modbus 03/06/16 — 40001 a 49999) ===
  40001: {
    endereco: 40001,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'PT-101',
    nome: 'Pressão de Entrada (PT-101)',
    descricao: 'Transmissor piezoresistivo de pressão na alimentação das células CDI (bar x 10).',
    classe: 'medicao',
    faixa: [0, 60], // 0 a 6.0 bar
    unidade: 'bar',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 2.15
  },
  40002: {
    endereco: 40002,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'FT-101',
    nome: 'Vazão de Alimentação (FT-101)',
    descricao: 'Medidor magnético de vazão do skid piloto FTE-CDI (L/h). Saturação física em 20.000 L/h.',
    classe: 'medicao',
    faixa: [0, 20000],
    unidade: 'L/h',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 1450.0
  },
  40003: {
    endereco: 40003,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'CT-101',
    nome: 'Condutividade de Entrada (CT-101)',
    descricao: 'Sensor toroidal de condutividade eletrolítica da água bruta afluente (µS/cm).',
    classe: 'medicao',
    faixa: [0, 10000],
    unidade: 'µS/cm',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 3850.0
  },
  40004: {
    endereco: 40004,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'CT-102',
    nome: 'Condutividade do Permeado (CT-102)',
    descricao: 'Sensor de condutividade da água tratada após dessalinização por eletrodiálise (µS/cm).',
    classe: 'medicao',
    faixa: [0, 5000],
    unidade: 'µS/cm',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 120.0
  },
  40005: {
    endereco: 40005,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'VT-201',
    nome: 'Tensão do Barramento DC Geral (VT-201)',
    descricao: 'Tensão contínua geral do barramento de alimentação das células CDI (V x 10, nominal 48.0 V).',
    classe: 'medicao',
    faixa: [0, 600], // 0 a 60.0 V
    unidade: 'V',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 48.0
  },
  40006: {
    endereco: 40006,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'AT-201',
    nome: 'Corrente Total DC do Reator (AT-201)',
    descricao: 'Transdutor de corrente Hall do barramento de dessalinização (A x 10, nominal 12.5 A).',
    classe: 'medicao',
    faixa: [0, 500], // 0 a 50.0 A
    unidade: 'A',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 12.5
  },
  40007: {
    endereco: 40007,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'LT-102',
    nome: 'Nível do Reservatório de Reúso T-102 (LT-102)',
    descricao: 'Sensor hidrostático de nível do tanque de concentrado e purga ZLD (% x 10).',
    classe: 'medicao',
    faixa: [0, 1000], // 0 a 100.0 %
    unidade: '%',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 82.5
  },
  40008: {
    endereco: 40008,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'AIT-101',
    nome: 'Fluoreto de Entrada Afluente (AIT-101)',
    descricao: 'Analisador potenciométrico de íon seletivo (ISE) de fluoreto na entrada bruta (ppm x 100).',
    classe: 'medicao',
    faixa: [0, 5000], // 0 a 50.00 ppm
    unidade: 'ppm',
    escala: 100,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 8.50
  },
  40009: {
    endereco: 40009,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'TT-101',
    nome: 'Temperatura do Processo (TT-101)',
    descricao: 'Termorresistência PT100 no plenum de entrada do reator CDI (°C x 10).',
    classe: 'medicao',
    faixa: [0, 1000], // 0 a 100.0 °C
    unidade: '°C',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 26.4
  },
  40010: {
    endereco: 40010,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'SP_VAZAO_PID',
    nome: 'Setpoint de Vazão da Bomba P-101 (SP-PID)',
    descricao: 'Referência de vazão enviada pelo SCADA para a malha PID executada no ladder do CLP (L/h).',
    classe: 'setpoint',
    faixa: [500, 1500], // 500 a 1500 L/h
    unidade: 'L/h',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: false,
    valorPadrao: 1125.0
  },
  40011: {
    endereco: 40011,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'CV_VFD_P101',
    nome: 'Saída Modulada do Inversor da Bomba P-101 (CV-VFD)',
    descricao: 'Espelho Read-Only da variável de controle (CV) calculada pelo PID no CLP (0 a 100%).',
    classe: 'status',
    faixa: [0, 100],
    unidade: '%',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 65.0
  },
  40012: {
    endereco: 40012,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'TT-102',
    nome: 'Temperatura da Célula CDI Piloto (TT-102)',
    descricao: 'Transmissor de temperatura superficial da célula multicamada (°C x 10).',
    classe: 'medicao',
    faixa: [0, 1000],
    unidade: '°C',
    escala: 10,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 28.1
  },
  40013: {
    endereco: 40013,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'AIT-102',
    nome: 'Fluoreto de Saída Efluente (AIT-102)',
    descricao: 'Analisador de fluoreto ISE na saída tratada para laudo regulatório (ppm x 100, máx 1.50 ppm).',
    classe: 'medicao',
    faixa: [0, 2000], // 0 a 20.00 ppm
    unidade: 'ppm',
    escala: 100,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 1.10
  },
  40014: {
    endereco: 40014,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'STATUS_INTERLOCKS_CLP',
    nome: 'Palavra de Status de Intertravamentos e Falhas',
    descricao: 'Mapa de bits (Bit 0: E-STOP, Bit 1: Sobrepressão, Bit 2: Nível Alto, Bit 3: Térmico P-101).',
    classe: 'status',
    faixa: [0, 65535],
    unidade: 'HEX',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 0
  },
  40015: {
    endereco: 40015,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'WATCHDOG_SCADA',
    nome: 'Contador de Watchdog SCADA -> CLP',
    descricao: 'Contador de batimento de coração incrementado ciclicamente a cada 1.000 ms pelo servidor SCADA.',
    classe: 'comando',
    faixa: [0, 65535],
    unidade: 'TICKS',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: false,
    valorPadrao: 1
  },
  40016: {
    endereco: 40016,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'CV_MANUAL_VFD',
    nome: 'Comando Manual de Velocidade da Bomba P-101',
    descricao: 'Escrita de porcentagem de velocidade quando o modo PID estiver em MANUAL (0 a 100%).',
    classe: 'setpoint',
    faixa: [0, 100],
    unidade: '%',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: false,
    valorPadrao: 50.0
  },
  40017: {
    endereco: 40017,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'VT-CELULA',
    nome: 'Tensão de Célula CDI Individual',
    descricao: 'Tensão analógica direta aplicada sobre a célula CDI selecionada (V x 100, 0 a 2.50 V).',
    classe: 'medicao',
    faixa: [0, 250], // 0 a 2.50 V
    unidade: 'V',
    escala: 100,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 1.40
  },
  40018: {
    endereco: 40018,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'STATUS_ISE_IN',
    nome: 'Status e Validade Analítica do Sensor ISE AIT-101',
    descricao: 'Qualidade da leitura: 1 = Válido/Confiável, 2 = Em Calibração, 3 = Falha de Eletrodo, 4 = Amostra Expirada.',
    classe: 'status',
    faixa: [1, 4],
    unidade: 'STATUS',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 1
  },
  40019: {
    endereco: 40019,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'STATUS_ISE_OUT',
    nome: 'Status e Validade Analítica do Sensor ISE AIT-102',
    descricao: 'Qualidade da leitura: 1 = Válido/Confiável, 2 = Em Calibração, 3 = Falha de Eletrodo, 4 = Amostra Expirada.',
    classe: 'status',
    faixa: [1, 4],
    unidade: 'STATUS',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: 1
  },
  40099: {
    endereco: 40099,
    tipoModbus: 'HOLDING_REGISTER',
    tag: 'MAP_VERSION',
    nome: 'Identificador de Versão do Mapa Modbus no CLP',
    descricao: 'Contrato de compatibilidade entre Ladder e SCADA. Valor esperado: 21 (v2.1). Código SCD-PLC-009 se incompatível.',
    classe: 'status',
    faixa: [1, 99],
    unidade: 'VER',
    escala: 1,
    tamanho: 16,
    sinal: 'unsigned',
    polaridade: 'NAO_APLICAVEL',
    somenteLeitura: true,
    valorPadrao: MAP_VERSION_ATUAL
  }
};

/**
 * -------------------------------------------------------------------------
 * MAPA MODBUS LEGADO (UTILIZADO EM TEMPO DE EXECUÇÃO NO PR-3a)
 * Garante 100% de paridade com PlcService.ts sem alterar comportamento.
 * -------------------------------------------------------------------------
 */
export const MAPA_MODBUS_LEGADO: Record<number, ModbusRegister> = {
  // Holding Registers
  40001: { endereco: 40001, tipo: 'HOLDING_REGISTER', nome: 'Pressão Entrada (PT-101)', valor: 2.15, unidade: 'bar', somenteLeitura: true, descricao: 'Transmissor de Pressão Piezoresistivo de Entrada' },
  40002: { endereco: 40002, tipo: 'HOLDING_REGISTER', nome: 'Vazão Alimentação (FT-101)', valor: 1450.0, unidade: 'L/h', somenteLeitura: true, descricao: 'Medidor Magnético de Vazão da Carga FTE-CDI' },
  40003: { endereco: 40003, tipo: 'HOLDING_REGISTER', nome: 'Condutividade Entrada (CT-101)', valor: 3850.0, unidade: 'µS/cm', somenteLeitura: true, descricao: 'Sensor Indutivo de Condutividade da Água Bruta' },
  40004: { endereco: 40004, tipo: 'HOLDING_REGISTER', nome: 'Condutividade Permeado (CT-102)', valor: 120.0, unidade: 'µS/cm', somenteLeitura: true, descricao: 'Sensor Indutivo de Condutividade da Água Tratada' },
  40005: { endereco: 40005, tipo: 'HOLDING_REGISTER', nome: 'Tensão Barramento DC (VT-201)', valor: 48.0, unidade: 'V', somenteLeitura: true, descricao: 'Tensão Contínua Aplicada à Matriz Células CDI' },
  40006: { endereco: 40006, tipo: 'HOLDING_REGISTER', nome: 'Corrente Total DC (AT-201)', valor: 12.5, unidade: 'A', somenteLeitura: true, descricao: 'Corrente Total de Dessalinização Electrocélulas' },
  40007: { endereco: 40007, tipo: 'HOLDING_REGISTER', nome: 'Nível Tanque Reúso T-102 (LT-102)', valor: 82.5, unidade: '%', somenteLeitura: true, descricao: 'Sensor Hidrostático de Nível do Reservatório ZLD' },
  40008: { endereco: 40008, tipo: 'HOLDING_REGISTER', nome: 'pH Tanque Ajuste (pHT-101)', valor: 7.2, unidade: 'pH', somenteLeitura: true, descricao: 'Eletrodo Combinado de pH do Efluente Desfluoretado' },
  40009: { endereco: 40009, tipo: 'HOLDING_REGISTER', nome: 'Temperatura Processo (TT-101)', valor: 26.4, unidade: '°C', somenteLeitura: true, descricao: 'Termorresistência PT100 do Plenum do Reator' },
  40010: { endereco: 40010, tipo: 'HOLDING_REGISTER', nome: 'Setpoint Pressão PID (SP-PID)', valor: 2.2, unidade: 'bar', somenteLeitura: false, descricao: 'Referência de Pressão para a Malha PID da Bomba' },

  // Coils
  1: { endereco: 1, tipo: 'COIL', nome: 'Bomba Principal (P-101)', valor: true, unidade: 'ON/OFF', somenteLeitura: false, descricao: 'Inversor / Contator da Bomba de Alimentação' },
  2: { endereco: 2, tipo: 'COIL', nome: 'Fonte DC Células (PW-201)', valor: true, unidade: 'ON/OFF', somenteLeitura: false, descricao: 'Relé da Fonte Chaveada de Dessalinização' },
  3: { endereco: 3, tipo: 'COIL', nome: 'Válvula Purga ZLD (XV-102)', valor: false, unidade: 'ABERTA/FECHADA', somenteLeitura: false, descricao: 'Solenoide de Purga de Salmoura/Concentrado' },
  4: { endereco: 4, tipo: 'COIL', nome: 'Válvula Reúso T-102 (XV-103)', valor: true, unidade: 'ABERTA/FECHADA', somenteLeitura: false, descricao: 'Solenoide de Recirculação para Reservatório Biosoônico' },
};

/**
 * Consulta a definição canônica de um ponto Modbus v2.1.
 */
export function obterDefinicaoPontoV21(endereco: number): PontoModbusMeta | undefined {
  return MAPA_MODBUS_V2_1[endereco];
}

/**
 * Validação de limites operacionais para escritas de setpoints e comandos.
 * Aplica clamping e rejeita escritas em pontos somente-leitura.
 */
export function validarEscritaModbusV21(endereco: number, valor: any): {
  valido: boolean;
  motivo?: string;
  valorSanitizado?: any;
} {
  const meta = MAPA_MODBUS_V2_1[endereco];
  if (!meta) {
    return { valido: false, motivo: `Ponto Modbus ${endereco} inexistente no catálogo v2.1.` };
  }

  if (meta.somenteLeitura) {
    return { valido: false, motivo: `Ponto ${endereco} (${meta.tag}) é estritamente somente-leitura (Read-Only).` };
  }

  if (meta.tipoModbus === 'COIL') {
    const valBool = Boolean(valor);
    return { valido: true, valorSanitizado: valBool };
  }

  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return { valido: false, motivo: `Valor para ${meta.tag} deve ser numérico finito.` };
  }

  const [min, max] = meta.faixa;
  if (valor < min || valor > max) {
    // Clamping com aviso de conformidade
    const clamped = Math.max(min, Math.min(max, valor));
    return {
      valido: true,
      valorSanitizado: clamped,
      motivo: `Valor ${valor} fora da faixa [${min}, ${max}]. Ajustado para ${clamped}.`
    };
  }

  return { valido: true, valorSanitizado: valor };
}

/**
 * Verificação de plausibilidade física de leituras recebidas do CLP.
 */
export function validarPlausibilidadeLeitura(endereco: number, valor: number): {
  plausivel: boolean;
  motivo?: string;
} {
  const meta = MAPA_MODBUS_V2_1[endereco];
  if (!meta) return { plausivel: true };

  const [min, max] = meta.faixa;
  // Margem de tolerância física de 10% além dos limites nominais
  const margem = (max - min) * 0.1;
  if (valor < min - margem || valor > max + margem) {
    return {
      plausivel: false,
      motivo: `Leitura de ${meta.tag} (${valor} ${meta.unidade}) excede limite físico plausível [${min}, ${max}].`
    };
  }

  return { plausivel: true };
}
