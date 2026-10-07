/**
 * Ligação entre o interlock em software (fte_cdi_controller_v2) e o CLP real.
 *
 *  - FontePressaoPlc: entrega a pressão do plenum lida do CLP (com qualidade) quando o modo é CLP_REAL.
 *  - PlcRelayDriver: corta/religa a FONTE DC e a bomba ESCREVENDO nas coils do CLP (via gateway Modbus).
 *  - RelayDriverHibrido: usa o driver simulado no modo simulador e o PlcRelayDriver no modo CLP real.
 *
 * Mapa do CLP (PlcService.REGISTRADORES_INICIAIS):  coil 1 = RL-101 (relé da bomba), coil 2 = ENABLE_FONTE_DC.
 *   FONTE_DC             -> coil 2        VALVULA_ALIMENTACAO e BOMBA_FEED -> coil 1 (parar a alimentação = parar a bomba)
 * O CLP tem UMA fonte DC e UMA bomba para o rack, não uma por célula. Logo, cortar uma célula corta o rack inteiro e
 * religar (rearme) de qualquer célula energiza o rack. A pressão também é única (plenum), então todas as células
 * intertravam juntas. Rearme todas as células intertravadas.
 */

import type { FontePressao, IRelayDriver, LeituraPressao } from '../types';
import { plcService } from './PlcService';
import { dbInstance } from './database';

export class FontePressaoPlc implements FontePressao {
  ativa(): boolean {
    return plcService.getConfig().modoFonteDados === 'CLP_REAL';
  }
  ler(): LeituraPressao {
    return plcService.getLeituraPressaoPlenum();
  }
}

type TipoRele = 'FONTE_DC' | 'VALVULA_ALIMENTACAO' | 'BOMBA_FEED';

const COIL_POR_TIPO: Record<TipoRele, number> = {
  FONTE_DC: 2,
  VALVULA_ALIMENTACAO: 1,
  BOMBA_FEED: 1,
};

export class PlcRelayDriver implements IRelayDriver {
  /** Escritas simultâneas na mesma coil (ex.: 16 células intertravando no mesmo ciclo) compartilham UMA escrita. */
  private emAndamento = new Map<string, Promise<boolean>>();

  private escrever(coil: number, valor: boolean): Promise<boolean> {
    const chave = `${coil}:${valor}`;
    const ativa = this.emAndamento.get(chave);
    if (ativa) return ativa;
    const p = plcService
      .escreverRegistrador(coil, valor)
      .then(r => {
        if (!r.ok) console.warn(`[PLC RELAY] Escrita na coil ${coil} -> ${valor} falhou: ${r.mensagem}`);
        return r.ok;
      })
      .catch(err => {
        console.error(`[PLC RELAY] Erro inesperado ao escrever na coil ${coil}:`, err);
        return false;
      })
      .finally(() => this.emAndamento.delete(chave));
    this.emAndamento.set(chave, p);
    return p;
  }

  async cortarReleFisico(celulaId: number, tipo: TipoRele, motivo: string): Promise<boolean> {
    // Desenergizar (false) é sempre permitido pelo PlcService; o gateway confirma por releitura
    const ok = await this.escrever(COIL_POR_TIPO[tipo], false);
    if (ok) {
      dbInstance.atualizarEstadoRele(celulaId, tipo, 'ABERTO', `[CLP] ${motivo}`, true);
      console.warn(`[PLC RELAY] CORTE NO CLP CONFIRMADO: célula ${celulaId} | ${tipo} -> ABERTO | ${motivo}`);
    }
    return ok;
  }

  async rearmarReleFisico(celulaId: number, tipo: TipoRele, usuarioId: number, observacao: string): Promise<boolean> {
    // Energizar passa pela regra de segurança do PlcService (enlace confirmado e E-STOP/intertravamento do CLP desativado)
    const ok = await this.escrever(COIL_POR_TIPO[tipo], true);
    if (ok) {
      dbInstance.atualizarEstadoRele(celulaId, tipo, 'FECHADO', `[CLP] Rearmado por usuário #${usuarioId}: ${observacao}`, false);
    }
    return ok;
  }

  /** Estado conhecido da coil (confirmado na última escrita/varredura). false = relé aberto (desenergizado). */
  async obterEstadoRele(_celulaId: number, tipo: string): Promise<'FECHADO' | 'ABERTO'> {
    const coil = COIL_POR_TIPO[tipo as TipoRele];
    const valor = coil ? plcService.getConfig().mapaRegistradores[coil]?.valor : undefined;
    return valor === false ? 'ABERTO' : 'FECHADO';
  }
}

export class RelayDriverHibrido implements IRelayDriver {
  constructor(
    private simulado: IRelayDriver,
    private plc: IRelayDriver = new PlcRelayDriver(),
    private usarPlc: () => boolean = () => plcService.getConfig().modoFonteDados === 'CLP_REAL'
  ) {}

  private atual(): IRelayDriver {
    return this.usarPlc() ? this.plc : this.simulado;
  }
  cortarReleFisico(celulaId: number, tipo: TipoRele, motivo: string) { return this.atual().cortarReleFisico(celulaId, tipo, motivo); }
  rearmarReleFisico(celulaId: number, tipo: TipoRele, usuarioId: number, observacao: string) { return this.atual().rearmarReleFisico(celulaId, tipo, usuarioId, observacao); }
  obterEstadoRele(celulaId: number, tipo: string) { return this.atual().obterEstadoRele(celulaId, tipo); }
}
