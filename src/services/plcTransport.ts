/**
 * Camada de transporte do driver de CLP.
 *
 * O PlcService não fala Modbus/OPC UA diretamente: ele usa um PlcTransport. Assim dá para
 *  - simular o CLP (inclusive falhas injetadas, para testes e treinamento de operadores);
 *  - acusar com clareza (SCD-PLC-005) quando o modo CLP_REAL é ativado sem um driver real;
 *  - plugar depois um gateway real (ex.: endpoint no server.ts que fala Modbus TCP),
 *    sem mexer na lógica de erro, timeout e alarme.
 *
 * Observação: navegador não abre sockets TCP. Um transporte real precisa passar por um
 * backend/gateway (WebSocket ou HTTP).
 */

import type { ModbusRegister, PlcProtocol } from '../types';
import type { CodigoErro } from './errorCatalog';

export type CodigoPlc = Extract<
  CodigoErro,
  'SCD-PLC-001' | 'SCD-PLC-002' | 'SCD-PLC-003' | 'SCD-PLC-005' | 'SCD-PLC-006' | 'SCD-PLC-008' | 'SCD-AUT-001'
>;

/** Códigos que indicam problema de ENLACE (comunicação/gateway), ao contrário de recusas do comando. */
export const CODIGOS_DE_ENLACE: ReadonlySet<string> = new Set(['SCD-PLC-001', 'SCD-PLC-002', 'SCD-PLC-005', 'SCD-AUT-001']);

export class PlcTransportError extends Error {
  constructor(public readonly codigo: CodigoPlc, message: string) {
    super(message);
    this.name = 'PlcTransportError';
  }
}

export interface PlcEndpoint {
  ipAddress: string;
  porta: number;
  slaveId: number;
  protocolo?: PlcProtocol;
}

export interface PlcTransport {
  /** Verifica a comunicação com o CLP. Deve respeitar `signal` (abortar ao expirar o timeout). */
  testarConexao(ep: PlcEndpoint, signal: AbortSignal): Promise<{ latenciaMs: number }>;
  /** Escreve um registrador e só resolve após a confirmação do CLP. */
  escrever(ep: PlcEndpoint, reg: ModbusRegister, valor: number | boolean, signal: AbortSignal): Promise<void>;
  /** Lê vários registradores de uma vez (varredura). Opcional: sem ele só há teste de conexão. */
  ler?(ep: PlcEndpoint, enderecos: number[], signal: AbortSignal): Promise<Record<number, number | boolean>>;
}

export type FalhaSimulada = 'TIMEOUT' | 'RECUSADA' | 'RESPOSTA_INVALIDA';

function esperar(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new PlcTransportError('SCD-PLC-001', 'Operação abortada.'));
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new PlcTransportError('SCD-PLC-001', 'Operação abortada.')); }, { once: true });
  });
}

/** Bancada virtual: responde sempre bem, a menos que uma falha seja injetada. */
export class SimulatedPlcTransport implements PlcTransport {
  public falhaInjetada: FalhaSimulada | null = null;
  constructor(private atrasoMs = 350) {}

  private async aplicarFalha(signal: AbortSignal): Promise<void> {
    switch (this.falhaInjetada) {
      case 'TIMEOUT':
        // Nunca responde: só termina quando o timeout do serviço abortar
        await new Promise<void>((_, reject) =>
          signal.addEventListener('abort', () => reject(new PlcTransportError('SCD-PLC-001', 'Sem resposta do CLP.')), { once: true })
        );
        return;
      case 'RECUSADA':
        throw new PlcTransportError('SCD-PLC-002', 'Conexão recusada pelo CLP.');
      case 'RESPOSTA_INVALIDA':
        throw new PlcTransportError('SCD-PLC-002', 'Resposta inválida do CLP (CRC/exception Modbus).');
      default:
        return;
    }
  }

  async testarConexao(_ep: PlcEndpoint, signal: AbortSignal): Promise<{ latenciaMs: number }> {
    await esperar(this.atrasoMs, signal);
    await this.aplicarFalha(signal);
    return { latenciaMs: Math.floor(8 + Math.random() * 12) };
  }

  async escrever(_ep: PlcEndpoint, _reg: ModbusRegister, _valor: number | boolean, signal: AbortSignal): Promise<void> {
    await esperar(Math.min(this.atrasoMs, 100), signal);
    await this.aplicarFalha(signal);
  }
}

/** Padrão do modo CLP_REAL enquanto não houver gateway: falha de forma explícita, nunca finge sucesso. */
export class UnavailablePlcTransport implements PlcTransport {
  private erro() {
    return new PlcTransportError(
      'SCD-PLC-005',
      'Nenhum driver Modbus/OPC UA real está configurado neste ambiente (o navegador não abre sockets TCP).'
    );
  }
  async testarConexao(): Promise<{ latenciaMs: number }> { throw this.erro(); }
  async escrever(): Promise<void> { throw this.erro(); }
}

/** Executa `op` com timeout; ao expirar aborta o sinal e rejeita com SCD-PLC-001. */
export async function comTimeout<T>(op: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctrl.abort();
      reject(new PlcTransportError('SCD-PLC-001', `Sem resposta do CLP em ${timeoutMs} ms.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([op(ctrl.signal), limite]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
