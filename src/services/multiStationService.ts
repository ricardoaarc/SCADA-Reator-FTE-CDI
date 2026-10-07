/**
 * Integração Relacional com Supabase PostgreSQL e Fallback LocalStorage (Padrão ISA-95 Nível 3)
 */

import { lerLista, gravarJson } from './storageSeguro';
import { esquemaEstacao, esquemaInstrumento } from './esquemasDados';

export interface StationConfig {
  id: string;
  codigoEstacao: string;
  nome: string;
  tipo: 'ETA' | 'ETE' | 'POCO_ADUTORA' | 'RESERVATORIO' | 'REBOOT_PUMP';
  latitude: number;
  longitude: number;
  ipGateway: string;
  protocolo: 'MQTT_TLS' | 'MODBUS_TCP' | 'OPC_UA' | 'REST_API';
  frequenciaPingS: number;
  statusConexao: 'ONLINE' | 'OFFLINE' | 'ALERTA';
  criadoEm: string;
  atualizadoEm: string;
}

export interface StationInstrument {
  id: string;
  stationId: string;
  tagEquipamento: string;
  nomeAmigavel: string;
  tipoEquipamento: 'BOMBA' | 'VALVULA' | 'FIT_VAZAO' | 'ANALISADOR_F' | 'PHMETRO' | 'TURBIDIMETRO' | 'SENS_PRESSAO';
  enderecoModbus: string;
  unidadeMedida: string;
  limiteAlertaMin?: number;
  limiteAlertaMax?: number;
  statusOperacional: 'OK' | 'ALERTA' | 'FALHA';
}

const STORAGE_STATIONS_KEY = 'purifywave_scada_stations_v2';
const STORAGE_INSTRUMENTS_KEY = 'purifywave_scada_instruments_v2';

export class MultiStationService {
  private estacoes: StationConfig[] = [];
  private instrumentos: StationInstrument[] = [];

  constructor() {
    this.carregarDados();
  }

  private carregarDados(): void {
    const estacoesPadrao: StationConfig[] = [
      {
        id: 'EST-01',
        codigoEstacao: 'ETA-CENTRAL-01',
        nome: 'Estação Central FTE-CDI (180 m³/h)',
        tipo: 'ETA',
        latitude: -23.5505,
        longitude: -46.6333,
        ipGateway: '192.168.1.120',
        protocolo: 'MODBUS_TCP',
        frequenciaPingS: 2,
        statusConexao: 'ONLINE',
        criadoEm: '2026-03-01T08:00:00.000Z',
        atualizadoEm: '2026-03-01T08:00:00.000Z',
      },
      {
        id: 'EST-02',
        codigoEstacao: 'POCO-PROF-04',
        nome: 'Poço Tubular P-101 (Aquífero Subterrâneo)',
        tipo: 'POCO_ADUTORA',
        latitude: -23.5580,
        longitude: -46.6400,
        ipGateway: '192.168.1.125',
        protocolo: 'MODBUS_TCP',
        frequenciaPingS: 5,
        statusConexao: 'ONLINE',
        criadoEm: '2026-03-01T08:00:00.000Z',
        atualizadoEm: '2026-03-01T08:00:00.000Z',
      }
    ];

    const instrumentosPadrao: StationInstrument[] = [
      {
        id: 'INST-01',
        stationId: 'EST-01',
        tagEquipamento: 'PT-101',
        nomeAmigavel: 'Transmissor de Pressão Entrada Plenum',
        tipoEquipamento: 'SENS_PRESSAO',
        enderecoModbus: '40001',
        unidadeMedida: 'bar',
        limiteAlertaMin: 0.5,
        limiteAlertaMax: 2.8,
        statusOperacional: 'OK',
      },
      {
        id: 'INST-02',
        stationId: 'EST-01',
        tagEquipamento: 'FIT-101',
        nomeAmigavel: 'Medidor de Vazão Eletromagnético Alimentação',
        tipoEquipamento: 'FIT_VAZAO',
        enderecoModbus: '40003',
        unidadeMedida: 'm³/h',
        limiteAlertaMin: 50,
        limiteAlertaMax: 200,
        statusOperacional: 'OK',
      },
      {
        id: 'INST-03',
        stationId: 'EST-01',
        tagEquipamento: 'AIT-F-OUT',
        nomeAmigavel: 'Analisador de Fluoreto Água Tratada',
        tipoEquipamento: 'ANALISADOR_F',
        enderecoModbus: '40005',
        unidadeMedida: 'mg/L',
        limiteAlertaMax: 1.5,
        statusOperacional: 'OK',
      }
    ];

    // Dados salvos são validados; itens inválidos são descartados com aviso (SCD-DAT-001)
    this.estacoes = lerLista<StationConfig>(STORAGE_STATIONS_KEY, esquemaEstacao, () => estacoesPadrao, 'Estações de tratamento');
    this.instrumentos = lerLista<StationInstrument>(STORAGE_INSTRUMENTS_KEY, esquemaInstrumento, () => instrumentosPadrao, 'Instrumentos das estações');

    this.persistir();
  }

  private persistir(): void {
    gravarJson(STORAGE_STATIONS_KEY, this.estacoes, 'Estações de tratamento');
    gravarJson(STORAGE_INSTRUMENTS_KEY, this.instrumentos, 'Instrumentos das estações');
  }

  public getEstacoes(): StationConfig[] {
    return this.estacoes;
  }

  public salvarEstacao(dados: Partial<StationConfig> & { nome: string }): StationConfig {
    const agora = new Date().toISOString();
    let salva: StationConfig;
    if (dados.id) {
      const idx = this.estacoes.findIndex(e => e.id === dados.id);
      if (idx >= 0) {
        salva = { ...this.estacoes[idx], ...dados, atualizadoEm: agora };
        this.estacoes[idx] = salva;
      } else {
        salva = {
          id: dados.id,
          codigoEstacao: dados.codigoEstacao || `EST-${this.estacoes.length + 1}`,
          nome: dados.nome,
          tipo: dados.tipo || 'ETA',
          latitude: dados.latitude ?? -23.55,
          longitude: dados.longitude ?? -46.63,
          ipGateway: dados.ipGateway || '192.168.1.100',
          protocolo: dados.protocolo || 'MODBUS_TCP',
          frequenciaPingS: dados.frequenciaPingS ?? 2,
          statusConexao: dados.statusConexao || 'ONLINE',
          criadoEm: agora,
          atualizadoEm: agora,
        };
        this.estacoes.push(salva);
      }
    } else {
      salva = {
        id: `EST-${String(this.estacoes.length + 1).padStart(2, '0')}`,
        codigoEstacao: dados.codigoEstacao || `EST-${this.estacoes.length + 1}`,
        nome: dados.nome,
        tipo: dados.tipo || 'ETA',
        latitude: dados.latitude ?? -23.55,
        longitude: dados.longitude ?? -46.63,
        ipGateway: dados.ipGateway || '192.168.1.100',
        protocolo: dados.protocolo || 'MODBUS_TCP',
        frequenciaPingS: dados.frequenciaPingS ?? 2,
        statusConexao: dados.statusConexao || 'ONLINE',
        criadoEm: agora,
        atualizadoEm: agora,
      };
      this.estacoes.push(salva);
    }
    this.persistir();
    return salva;
  }

  public excluirEstacao(id: string): boolean {
    const lenAntes = this.estacoes.length;
    this.estacoes = this.estacoes.filter(e => e.id !== id);
    this.instrumentos = this.instrumentos.filter(i => i.stationId !== id);
    if (this.estacoes.length !== lenAntes) {
      this.persistir();
      return true;
    }
    return false;
  }

  public getInstrumentos(): StationInstrument[] {
    return this.instrumentos;
  }

  public getInstrumentosPorEstacao(stationId: string): StationInstrument[] {
    return this.instrumentos.filter(i => i.stationId === stationId);
  }

  public salvarInstrumento(dados: Partial<StationInstrument> & { tagEquipamento: string; stationId: string }): StationInstrument {
    let salvo: StationInstrument;
    if (dados.id) {
      const idx = this.instrumentos.findIndex(i => i.id === dados.id);
      if (idx >= 0) {
        salvo = { ...this.instrumentos[idx], ...dados };
        this.instrumentos[idx] = salvo;
      } else {
        salvo = {
          id: dados.id,
          stationId: dados.stationId,
          tagEquipamento: dados.tagEquipamento,
          nomeAmigavel: dados.nomeAmigavel || dados.tagEquipamento,
          tipoEquipamento: dados.tipoEquipamento || 'SENS_PRESSAO',
          enderecoModbus: dados.enderecoModbus || '40001',
          unidadeMedida: dados.unidadeMedida || '-',
          limiteAlertaMin: dados.limiteAlertaMin,
          limiteAlertaMax: dados.limiteAlertaMax,
          statusOperacional: dados.statusOperacional || 'OK',
        };
        this.instrumentos.push(salvo);
      }
    } else {
      salvo = {
        id: `INST-${String(this.instrumentos.length + 1).padStart(2, '0')}`,
        stationId: dados.stationId,
        tagEquipamento: dados.tagEquipamento,
        nomeAmigavel: dados.nomeAmigavel || dados.tagEquipamento,
        tipoEquipamento: dados.tipoEquipamento || 'SENS_PRESSAO',
        enderecoModbus: dados.enderecoModbus || '40001',
        unidadeMedida: dados.unidadeMedida || '-',
        limiteAlertaMin: dados.limiteAlertaMin,
        limiteAlertaMax: dados.limiteAlertaMax,
        statusOperacional: dados.statusOperacional || 'OK',
      };
      this.instrumentos.push(salvo);
    }
    this.persistir();
    return salvo;
  }

  public excluirInstrumento(id: string): boolean {
    const lenAntes = this.instrumentos.length;
    this.instrumentos = this.instrumentos.filter(i => i.id !== id);
    if (this.instrumentos.length !== lenAntes) {
      this.persistir();
      return true;
    }
    return false;
  }
}

export const multiStationServiceInstance = new MultiStationService();
export const multiStationService = multiStationServiceInstance;