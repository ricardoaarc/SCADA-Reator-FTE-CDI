/**
 * Permite alternar entre o Modo Simulação Física e a Leitura de Registradores do CLP Físico
 */

import { PlcConnectionConfig, DataSourceMode, PlcProtocol, ModbusRegister, LeituraPressao } from "../types";
import { authService } from "./AuthService";
import { ScadaError, Resultado, sucesso, falha, comCodigo, CodigoErro } from "./errorCatalog";
import { dbInstance } from "./database";
import {
  PlcTransport, PlcTransportError, SimulatedPlcTransport, UnavailablePlcTransport, comTimeout, CODIGOS_DE_ENLACE,
} from "./plcTransport";
import { HttpGatewayTransport } from "./httpGatewayTransport";

import {
  MAPA_MODBUS_V2_1_REGISTRADORES,
  MAP_VERSION_ATUAL,
  REGISTRADOR_MAP_VERSION,
  validarEscritaModbusV21,
  validarPlausibilidadeLeitura
} from "./mapaModbus";

// Coils que ENERGIZAM equipamento (bomba, fonte DC) e a coil de intertravamento/E-STOP
const COILS_ENERGIZACAO = [1, 2];
const COIL_INTERLOCK = 3;

const REGISTRADORES_INICIAIS: Record<number, ModbusRegister> = JSON.parse(JSON.stringify(MAPA_MODBUS_V2_1_REGISTRADORES));

export interface ResultadoPing {
  sucesso: boolean;
  latenciaMs: number;
  mensagem: string;
  codigo?: CodigoErro;
}

class PlcService {
  private config: PlcConnectionConfig = {
    modoFonteDados: "SIMULADOR", // Default seguro: Simulação física
    ipAddress: "192.168.1.100",
    porta: 502,
    slaveId: 1,
    protocolo: "MODBUS_TCP",
    status: "DESCONECTADO",
    latenciaMs: 12,
    pacotesEnviados: 1250,
    pacotesRecebidos: 1248,
    errosComunicacao: 0,
    intervaloScanMs: 1000,
    mapaRegistradores: REGISTRADORES_INICIAIS,
    ultimoScanTimestamp: new Date().toISOString()
  };

  private listeners: Array<(cfg: PlcConnectionConfig) => void> = [];

  // Transportes: o simulado serve ao modo SIMULADOR; o real é plugável (padrão: indisponível, falha explícita)
  public readonly transporteSimulado = new SimulatedPlcTransport();
  // CLP_REAL usa por padrão o gateway Modbus do servidor (/api/plc). Se ele estiver desligado, falha com SCD-PLC-005.
  private tokenGateway: string | null = null;
  private transporteReal: PlcTransport = new UnavailablePlcTransport();

  private timeoutMs = 3000;
  private falhasConsecutivas = 0;
  private ultimoCodigoFalha: CodigoErro | null = null;
  private verificacaoEmAndamento: Promise<ResultadoPing> | null = null;

  // Pressão do plenum para o interlock em software (PT-101, holding 40001 = bar x 100)
  private modoDesdeMs = Date.now();
  private ultimaLeituraPressaoMs: number | null = null;
  private idadeMaxLeituraMs = 10_000; // sem leitura nova há mais que isso: pressão RUIM
  private gracaAposAtivarMs = 10_000; // tempo para a 1ª leitura após ativar o modo CLP real
  /** Valores brutos que transmissores/CLPs usam para sinalizar falha (0xFFFF, 0x8000, 0x7FFF). */
  private static readonly RAW_FALHA = new Set([65535, 32768, 32767]);
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  /** PR-3b: Validação cíclica de compatibilidade de versão de mapa (40099) */
  private versaoMapaValida = true;

  constructor() {
    // Ciclo de heartbeat: no simulador só mantém os contadores; em CLP_REAL verifica a comunicação de verdade
    this.heartbeatTimer = setInterval(() => {
      if (this.config.modoFonteDados === "CLP_REAL") {
        this.verificarConexao().catch(err => console.error("[SCD-PLC-002] Erro inesperado na verificação periódica:", err));
      } else if (this.config.status === "CONECTADO") {
        this.config.pacotesRecebidos += 1;
        this.config.pacotesEnviados += 1;
        this.config.ultimoScanTimestamp = new Date().toISOString();
        this.notify();
      }
    }, 2000);
    (this.heartbeatTimer as any)?.unref?.();
  }

  /** Encerra o heartbeat (testes, troca de driver, desmontagem). */
  public parar(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  /** Token do gateway (apenas em memória; não é gravado no navegador). */
  public definirTokenGateway(token: string | null): void {
    this.tokenGateway = token && token.trim() !== "" ? token.trim() : null;
  }

  /** Aponta o gateway padrão para outra origem (ex.: API em outro domínio/porta). Vazio = mesma origem. */
  public definirUrlGateway(baseUrl: string): void {
    this.transporteReal = new HttpGatewayTransport({ baseUrl, getToken: () => this.tokenGateway });
  }

  /** Ajusta a tolerância de dados velhos e o período de graça (padrão 10 s cada). */
  public definirParametrosLeituraPressao(p: { idadeMaxMs?: number; gracaMs?: number }): void {
    if (p.idadeMaxMs !== undefined) this.idadeMaxLeituraMs = Math.max(1, p.idadeMaxMs);
    if (p.gracaMs !== undefined) this.gracaAposAtivarMs = Math.max(0, p.gracaMs);
  }

  /**
   * Pressão do plenum lida do CLP, com qualidade, para o interlock em software.
   * Só é BOA se a leitura é recente (idade <= idadeMax) e o valor não é um código de falha do transmissor.
   * Uma falha isolada de varredura não derruba a qualidade na hora: vale a idade do último dado bom.
   */
  public getLeituraPressaoPlenum(): LeituraPressao {
    if (this.config.modoFonteDados !== "CLP_REAL") {
      return { pressaoBar: null, qualidade: "RUIM", motivo: "modo simulador (pressão do CLP não utilizada)" };
    }
    const agora = Date.now();
    if (this.ultimaLeituraPressaoMs === null) {
      return agora - this.modoDesdeMs <= this.gracaAposAtivarMs
        ? { pressaoBar: null, qualidade: "AGUARDANDO", motivo: "aguardando a primeira leitura do CLP" }
        : { pressaoBar: null, qualidade: "RUIM", motivo: "nenhuma leitura de pressão recebida do CLP" };
    }
    const idadeMs = agora - this.ultimaLeituraPressaoMs;
    if (idadeMs > this.idadeMaxLeituraMs) {
      return { pressaoBar: null, qualidade: "RUIM", idadeMs, motivo: `pressão sem atualização há ${(idadeMs / 1000).toFixed(1)} s (limite ${(this.idadeMaxLeituraMs / 1000).toFixed(0)} s)` };
    }
    const bruto = this.config.mapaRegistradores[40001]?.valor;
    if (typeof bruto !== "number" || !Number.isFinite(bruto)) {
      return { pressaoBar: null, qualidade: "RUIM", idadeMs, motivo: "registrador de pressão sem valor numérico" };
    }
    if (PlcService.RAW_FALHA.has(bruto)) {
      return { pressaoBar: null, qualidade: "RUIM", idadeMs, motivo: `valor de falha do transmissor (bruto ${bruto})` };
    }
    const assinado = bruto > 32767 ? bruto - 65536 : bruto; // int16: pequenos negativos do transmissor
    return { pressaoBar: assinado / 100, qualidade: "BOA", idadeMs };
  }

  /** Trocar o transporte real (testes, outro gateway). */
  public definirTransporteReal(t: PlcTransport): void {
    this.transporteReal = t;
  }

  public definirTimeoutMs(ms: number): void {
    this.timeoutMs = ms;
  }

  public getConfig(): PlcConnectionConfig {
    return {
      ...this.config,
      mapaRegistradores: { ...this.config.mapaRegistradores }
    };
  }

  /** RUIM = modo CLP real sem comunicação confirmada: os valores exibidos não vêm do campo. */
  public getQualidadeDados(): "BOA" | "RUIM" {
    return this.config.modoFonteDados === "CLP_REAL" && this.config.status !== "CONECTADO" ? "RUIM" : "BOA";
  }

  public setModoFonteDados(modo: DataSourceMode): void {
    if (!authService.podeComutarModoClp()) {
      throw new ScadaError("SCD-AUT-001", "Apenas Engenheiros de Processo ou Administradores podem alternar a fonte de dados.");
    }

    const anterior = this.config.modoFonteDados;
    this.config.modoFonteDados = modo;
    this.modoDesdeMs = Date.now();
    this.ultimaLeituraPressaoMs = null;
    this.falhasConsecutivas = 0;
    this.ultimoCodigoFalha = null;

    if (modo === "SIMULADOR") {
      this.config.status = "CONECTADO";
      authService.registrarAuditoria("Fonte de dados alterada para MODOS SIMULADO (Simulador Físico Local)", "SISTEMA");
    } else {
      this.config.status = "VERIFICANDO";
      authService.registrarAuditoria(
        `Fonte de dados alterada para CLP_REAL (${this.config.protocolo} ${this.config.ipAddress}:${this.config.porta}) - verificando enlace...`,
        "SISTEMA"
      );
      this.verificarConexao().catch(err => console.error("[SCD-PLC-002] Erro na verificação inicial de conexão:", err));
    }
    this.notify();
  }

  public atualizarRegistradoresComTelemetria(dados: any, estado?: any): void {
    if (this.config.modoFonteDados === 'CLP_REAL') return;
    const regs = this.config.mapaRegistradores;
    if (!regs) return;

    const gravar = (endereco: number, valor: unknown, fator: number) => {
      const reg = regs[endereco];
      if (!reg) return;
      if (typeof valor !== 'number' || !Number.isFinite(valor)) return;
      reg.valor = Math.round(valor * fator);
    };

    gravar(40001, dados.pressaoBar, 100);
    gravar(40002, dados.vazaoLitrosHora, 1);
    // 40003/40004: apenas se o campo estiver presente (sem inventar valor padrão)
    if (dados.condutividadeInUsCm !== undefined) gravar(40003, dados.condutividadeInUsCm, 1);
    else if (dados.tensaoV !== undefined)        gravar(40003, dados.tensaoV, 1);
    if (dados.condutividadeOutUsCm !== undefined) gravar(40004, dados.condutividadeOutUsCm, 1);
    else if (dados.correnteAmp !== undefined)    gravar(40004, dados.correnteAmp, 1);
    // 40005: tensão DC ou pH com centésimos (somente se presente — nunca valor inventado 48.0)
    if (dados.tensaoBarramentoDC !== undefined)      gravar(40005, dados.tensaoBarramentoDC, 10);
    else if (dados.ph !== undefined)                 gravar(40005, dados.ph, 100);
    // 40006: corrente (somente se presente)
    if (dados.correnteAmp !== undefined)             gravar(40006, dados.correnteAmp, 10);
    // 40007/40008: somente se presentes
    if (dados.nivelTanqueReusoPct !== undefined)     gravar(40007, dados.nivelTanqueReusoPct, 10);
    if (dados.fluoretoInPPM !== undefined)           gravar(40008, dados.fluoretoInPPM, 100);

    // 40009: fluoretoOut tem precedência; temperaturaC serve de fallback — ambos só se presentes
    if (dados.fluoretoOutPPM !== undefined) {
      gravar(40009, dados.fluoretoOutPPM, 100);
    } else if (dados.temperaturaC !== undefined) {
      gravar(40009, dados.temperaturaC, 10);
    }

    // PR-1: Contenção Mínima — Não sobrescrever Setpoint 40010 (SP-PID) com telemetria de processo
    if (regs[40010] && regs[40010].somenteLeitura) {
      gravar(40010, dados.temperaturaC, 10);
    }

    // PR-3b: Novos registradores do mapa v2.1 — apenas quando o campo estiver presente
    if (dados.saidaInversorVfdPct !== undefined) gravar(40011, dados.saidaInversorVfdPct, 1);
    if (dados.temperaturaCelulaC  !== undefined) gravar(40012, dados.temperaturaCelulaC,  10);
    if (dados.fluoretoOutPPM      !== undefined) gravar(40013, dados.fluoretoOutPPM,       100);
    if (dados.tensaoCelulaV       !== undefined) gravar(40017, dados.tensaoCelulaV,        100);
    gravar(40099, MAP_VERSION_ATUAL, 1);

    if (estado) {
      if (regs[1]) regs[1].valor = Boolean(estado.bombaAlimentacaoAtiva);
      if (regs[2]) regs[2].valor = Boolean(estado.fonteDcAtiva);
      if (regs[3] && estado.valvulaPurgaAtiva !== undefined) regs[3].valor = Boolean(estado.valvulaPurgaAtiva);
      if (regs[4] && estado.valvulaReusoAtiva !== undefined) regs[4].valor = Boolean(estado.valvulaReusoAtiva);
      if (regs[5] && estado.bombaPocoAtiva !== undefined) regs[5].valor = Boolean(estado.bombaPocoAtiva);
      if (regs[6] && estado.modoPidAuto !== undefined) regs[6].valor = Boolean(estado.modoPidAuto);
      // PR-3b: Discrete Inputs com polaridade NF (1 = Seguro/OK, 0 = Falha/Atuado)
      if (regs[10001]) regs[10001].valor = !Boolean(estado.interlockDisparado);
      if (regs[10002]) regs[10002].valor = dados.pressaoBar !== undefined ? dados.pressaoBar <= 2.80 : true;
    }

    this.notify();
  }

  public setConnectionConfig(novasConfigs: Partial<PlcConnectionConfig>): void {
    if (!authService.podeComutarModoClp()) {
      throw new ScadaError("SCD-AUT-001", "Permissão negada. Apenas perfis autorizados podem alterar dados de rede do CLP.");
    }

    this.config = { ...this.config, ...novasConfigs };
    authService.registrarAuditoria(
      `Configurações do CLP alteradas: IP=${this.config.ipAddress}, Porta=${this.config.porta}, SlaveID=${this.config.slaveId}`,
      "SISTEMA"
    );
    this.notify();
  }

  private transporteAtivo(): PlcTransport {
    return this.config.modoFonteDados === "SIMULADOR" ? this.transporteSimulado : this.transporteReal;
  }

  private endpoint() {
    return { ipAddress: this.config.ipAddress, porta: this.config.porta, slaveId: this.config.slaveId };
  }

  private codigoDe(err: unknown): CodigoErro {
    if (err instanceof PlcTransportError) return err.codigo;
    if (err instanceof ScadaError) return err.codigo;
    return "SCD-PLC-002";
  }

  private registrarFalhaComunicacao(err: unknown): { codigo: CodigoErro; detalhe: string } {
    const codigo = this.codigoDe(err);
    const detalhe = err instanceof Error ? err.message : String(err);

    this.config.errosComunicacao += 1;
    this.falhasConsecutivas += 1;
    this.config.status = codigo === 'SCD-PLC-001' ? 'ERRO_TIMEOUT' : 'DESCONECTADO';

    if (this.config.modoFonteDados === 'CLP_REAL' && this.ultimoCodigoFalha !== codigo) {
      try {
        dbInstance.inserirAlarme(
          'CRITICO',
          comCodigo(codigo, `Comunicação com o CLP (gateway Modbus do servidor) falhou: ${detalhe} Dados do campo indisponíveis (qualidade RUIM).`),
          null,
          codigo
        );
      } catch (e) {
        console.error('Não foi possível gravar o alarme de comunicação do CLP:', e);
      }
    }
    this.ultimoCodigoFalha = codigo;
    console.error(`[${codigo}] ${detalhe} (falhas consecutivas: ${this.falhasConsecutivas})`);
    return { codigo, detalhe };
  }

  private registrarSucessoComunicacao(latenciaMs: number): void {
    const recuperou = this.ultimoCodigoFalha !== null && this.config.modoFonteDados === "CLP_REAL";
    this.config.latenciaMs = latenciaMs;
    this.config.status = "CONECTADO";
    this.config.pacotesRecebidos += 1;
    this.config.pacotesEnviados += 1;
    this.config.ultimoScanTimestamp = new Date().toISOString();
    this.falhasConsecutivas = 0;
    this.ultimoCodigoFalha = null;
    if (recuperou) {
      try {
        dbInstance.inserirAlarme("ALERTA", "Comunicação com o CLP (gateway Modbus do servidor) restabelecida.", null, "SCD-PLC-001");
      } catch (e) {
        console.error("Não foi possível gravar o alarme de recuperação do CLP:", e);
      }
    }
  }

  /** Grava no mapa os valores lidos do CLP, ignorando tipos inesperados. Retorna quantos foram aplicados. */
  private aplicarLeituras(valores: Record<number, number | boolean>): number {
    let aplicados = 0;
    const p = valores[40001];
    if (typeof p === "number" && Number.isFinite(p)) this.ultimaLeituraPressaoMs = Date.now();

    // PR-3b: Verificação cíclica de compatibilidade de versão de mapa (40099)
    if (valores[REGISTRADOR_MAP_VERSION] !== undefined) {
      const versaoLida = Number(valores[REGISTRADOR_MAP_VERSION]);
      if (versaoLida !== MAP_VERSION_ATUAL) {
        if (this.versaoMapaValida) {
          try {
            dbInstance.inserirAlarme(
              'CRITICO',
              comCodigo('SCD-PLC-009', `Incompatibilidade de Versão de Mapa Modbus (MAP_VERSION): esperado ${MAP_VERSION_ATUAL} (v2.1), lido ${versaoLida}. Escritas bloqueadas.`),
              null,
              'SCD-PLC-009'
            );
          } catch (e) {
            console.error('Erro ao emitir alarme SCD-PLC-009:', e);
          }
        }
        this.versaoMapaValida = false;
      } else {
        this.versaoMapaValida = true;
      }
    }

    for (const [k, v] of Object.entries(valores)) {
      const reg = this.config.mapaRegistradores[Number(k)];
      if (!reg) continue;
      const tipoOk = (reg.tipo === "COIL" || reg.tipo === "DISCRETE_INPUT")
        ? typeof v === "boolean"
        : typeof v === "number" && Number.isFinite(v);
      if (!tipoOk) continue;
      this.config.mapaRegistradores[Number(k)] = { ...reg, valor: v };
      aplicados++;
    }
    return aplicados;
  }

  /** Verifica a comunicação de verdade (com timeout). Chamadas simultâneas compartilham a mesma verificação. */
  public verificarConexao(): Promise<ResultadoPing> {
    if (this.verificacaoEmAndamento) return this.verificacaoEmAndamento;

    const real = this.config.modoFonteDados === "CLP_REAL";
    const alvo = real
      ? "gateway Modbus do servidor"
      : `${this.config.ipAddress}:${this.config.porta} (Slave ID ${this.config.slaveId})`;

    this.verificacaoEmAndamento = (async (): Promise<ResultadoPing> => {
      try {
        const transporte = this.transporteAtivo();
        let latenciaMs: number;
        let lidos = 0;

        if (real && transporte.ler) {
          // Varredura real: ler todos os registradores mapeados é, ao mesmo tempo, teste de conexão e atualização de dados
          const enderecos = Object.keys(this.config.mapaRegistradores).map(Number);
          const t0 = Date.now();
          const valores = await comTimeout(sig => transporte.ler!(this.endpoint(), enderecos, sig), this.timeoutMs);
          latenciaMs = Date.now() - t0;
          lidos = this.aplicarLeituras(valores);
        } else {
          ({ latenciaMs } = await comTimeout(sig => transporte.testarConexao(this.endpoint(), sig), this.timeoutMs));
        }

        this.registrarSucessoComunicacao(latenciaMs);
        return {
          sucesso: true,
          latenciaMs,
          mensagem: real
            ? `CLP respondeu via ${alvo}. ${lidos > 0 ? `${lidos} registradores lidos. ` : ""}` + `Tempo de resposta: ${latenciaMs} ms.`
            : `Simulador físico respondeu (sem CLP físico conectado). Endereço configurado: ${alvo}. Tempo simulado: ${latenciaMs} ms.`
        };
      } catch (err) {
        const { codigo, detalhe } = this.registrarFalhaComunicacao(err);
        return { sucesso: false, latenciaMs: 0, codigo, mensagem: comCodigo(codigo, `${detalhe} Alvo: ${alvo}.`) };
      } finally {
        this.verificacaoEmAndamento = null;
        this.notify();
      }
    })();
    return this.verificacaoEmAndamento;
  }

  /** Mantido por compatibilidade com o painel: agora testa de verdade e informa o código em caso de falha. */
  public testarPingConexao(): Promise<ResultadoPing> {
    return this.verificarConexao();
  }

  /**
   * Escreve um registrador e informa o MOTIVO de qualquer falha.
   * Em CLP real, o valor local só muda depois da confirmação do CLP.
   */
  public async escreverRegistrador(endereco: number, novoValor: number | boolean): Promise<Resultado<void>> {
    // PR-3b: Bloqueio imediato se o mapa Modbus no CLP for incompatível
    if (!this.versaoMapaValida) {
      return falha("SCD-PLC-009", "Escrita bloqueada por segurança: Incompatibilidade de versão de mapa Modbus no CLP (SCD-PLC-009).");
    }

    const reg = this.config.mapaRegistradores[endereco];
    if (!reg) return falha("SCD-PLC-003", `Registrador #${endereco} não existe no mapa.`);
    if (reg.somenteLeitura) return falha("SCD-PLC-004", `Registrador ${reg.nome} (#${endereco}) é somente leitura.`);

    // PR-3b: Validação de limites operacionais e clamping
    const validacao = validarEscritaModbusV21(endereco, novoValor);
    if (!validacao.valido) {
      const cod = reg.somenteLeitura ? "SCD-PLC-004" : "SCD-PLC-006";
      return falha(cod, validacao.motivo ?? `Escrita inválida no registrador ${reg.nome} (#${endereco}).`);
    }
    if (validacao.valorSanitizado !== undefined) {
      novoValor = validacao.valorSanitizado;
    }

    const tipoOk = reg.tipo === "COIL"
      ? typeof novoValor === "boolean"
      : typeof novoValor === "number" && Number.isFinite(novoValor);
    if (!tipoOk) {
      return falha("SCD-PLC-006", `Valor ${String(novoValor)} inválido para ${reg.nome} (${reg.tipo === "COIL" ? "booleano" : "número finito"} esperado).`);
    }

    if (this.config.modoFonteDados === "CLP_REAL") {
      // Segurança: só energiza bomba/fonte com enlace confirmado e sem intertravamento/E-STOP ativo.
      // (Desenergizar, isto é, escrever false, é sempre permitido.)
      if (novoValor === true && COILS_ENERGIZACAO.includes(endereco)) {
        const estopAtivo = this.config.mapaRegistradores[10001]?.valor === false;
        const sobrepressaoAtiva = this.config.mapaRegistradores[10002]?.valor === false;
        const coilInterlockAtivo = this.config.mapaRegistradores[COIL_INTERLOCK]?.valor !== false;
        const interlockAtivo = estopAtivo || sobrepressaoAtiva || coilInterlockAtivo;

        if (this.config.status !== "CONECTADO" || interlockAtivo) {
          const motivo = this.config.status !== "CONECTADO"
            ? "estado do CLP desconhecido (sem comunicação confirmada)"
            : "intertravamento/E-STOP ativo";
          authService.registrarAuditoria(`Energização de ${reg.nome} (#${endereco}) BLOQUEADA: ${motivo}.`, "PROCESSO");
          return falha("SCD-PLC-007", `Energização de ${reg.nome} bloqueada: ${motivo}.`);
        }
      }

      try {
        await comTimeout(sig => this.transporteReal.escrever(this.endpoint(), reg, novoValor, sig), this.timeoutMs);
      } catch (err) {
        const codigoErro = this.codigoDe(err);
        if (!CODIGOS_DE_ENLACE.has(codigoErro)) {
          // Comando recusado (ex.: SCD-PLC-008): o enlace está bom, não mexe em status nem em contadores de falha
          const detalheRecusa = err instanceof Error ? err.message : String(err);
          authService.registrarAuditoria(`Escrita em ${reg.nome} (#${endereco}) -> ${novoValor} RECUSADA: [${codigoErro}] ${detalheRecusa}`, "PROCESSO");
          return falha(codigoErro, detalheRecusa);
        }
        const { codigo, detalhe } = this.registrarFalhaComunicacao(err);
        authService.registrarAuditoria(
          `FALHA na escrita Modbus em ${reg.nome} (#${endereco}) -> ${novoValor}: [${codigo}] ${detalhe}`,
          "PROCESSO"
        );
        this.notify();
        return falha(codigo, `Escrita em ${reg.nome} não confirmada pelo CLP: ${detalhe}`);
      }
    }

    const anterior = reg.valor;
    this.config.mapaRegistradores[endereco] = { ...reg, valor: novoValor };
    authService.registrarAuditoria(
      `Escrita Modbus no registrador ${reg.nome} (#${endereco}): ${anterior} -> ${novoValor}`,
      "PROCESSO"
    );
    this.notify();
    return sucesso(undefined);
  }

  public subscribe(cb: (cfg: PlcConnectionConfig) => void): () => void {
    this.listeners.push(cb);
    try {
      cb(this.getConfig());
    } catch (err) {
      console.error("Erro no callback inicial de inscrição do PlcService:", err);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /** Um listener com defeito não pode impedir os demais de receberem o estado do CLP. */
  private notify(): void {
    const cfg = this.getConfig();
    this.listeners.forEach(cb => {
      try {
        cb(cfg);
      } catch (err) {
        console.error("Erro em listener do PlcService:", err);
      }
    });
  }
}

export const plcService = new PlcService();
