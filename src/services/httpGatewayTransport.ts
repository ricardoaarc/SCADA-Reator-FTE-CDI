/**
 * Transporte do SCADA web para o gateway Modbus do servidor (server/plcGateway.ts).
 *
 * O IP/porta/unit id do CLP NÃO são enviados: o servidor usa a configuração do próprio ambiente
 * (PLC_HOST, PLC_PORT, PLC_UNIT_ID). O navegador só pede "teste", "leitura" e "escrita".
 */

import type { ModbusRegister } from '../types';
import { PlcEndpoint, PlcTransport, PlcTransportError, CodigoPlc } from './plcTransport';

const CODIGOS_ACEITOS: ReadonlySet<string> = new Set([
  'SCD-PLC-001', 'SCD-PLC-002', 'SCD-PLC-003', 'SCD-PLC-005', 'SCD-PLC-006', 'SCD-PLC-008', 'SCD-AUT-001',
]);

export interface HttpGatewayOpcoes {
  baseUrl?: string;
  getToken?: () => string | null;
  fetchFn?: typeof fetch;
}

export class HttpGatewayTransport implements PlcTransport {
  constructor(private opcoes: HttpGatewayOpcoes = {}) {}

  private async chamar(caminho: string, corpo: unknown, signal: AbortSignal): Promise<any> {
    const { baseUrl = '', getToken, fetchFn = fetch } = this.opcoes;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken?.();
    if (token) headers['x-gateway-token'] = token;

    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}/api/plc${caminho}`, { method: 'POST', headers, body: JSON.stringify(corpo ?? {}), signal });
    } catch (err) {
      if (signal.aborted) throw new PlcTransportError('SCD-PLC-001', 'Operação abortada por tempo esgotado.');
      throw new PlcTransportError('SCD-PLC-002', `Gateway Modbus inacessível: ${(err as Error)?.message ?? err}`);
    }

    let dados: any = null;
    try { dados = await res.json(); } catch { /* corpo inválido tratado abaixo */ }

    if (!res.ok || !dados || dados.sucesso !== true) {
      const codigo: CodigoPlc = CODIGOS_ACEITOS.has(dados?.codigo) ? dados.codigo : 'SCD-PLC-002';
      throw new PlcTransportError(codigo, dados?.erro || `Gateway respondeu HTTP ${res.status}.`);
    }
    return dados;
  }

  async testarConexao(_ep: PlcEndpoint, signal: AbortSignal): Promise<{ latenciaMs: number }> {
    const t0 = Date.now();
    const d = await this.chamar('/test', {}, signal);
    return { latenciaMs: typeof d.latenciaMs === 'number' ? d.latenciaMs : Date.now() - t0 };
  }

  async ler(_ep: PlcEndpoint, enderecos: number[], signal: AbortSignal): Promise<Record<number, number | boolean>> {
    const d = await this.chamar('/read', { enderecos }, signal);
    const saida: Record<number, number | boolean> = {};
    for (const [k, v] of Object.entries(d.valores ?? {})) {
      const end = Number(k);
      if (Number.isInteger(end) && (typeof v === 'number' || typeof v === 'boolean')) saida[end] = v;
    }
    return saida;
  }

  async escrever(_ep: PlcEndpoint, reg: ModbusRegister, valor: number | boolean, signal: AbortSignal): Promise<void> {
    await this.chamar('/write', { endereco: reg.endereco, valor }, signal);
  }
}
