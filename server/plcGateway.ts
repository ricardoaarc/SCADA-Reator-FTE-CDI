/**
 * Gateway Modbus TCP: ponte entre o navegador e o CLP.
 *
 * O navegador não abre sockets TCP, então o SCADA web fala HTTP com este gateway e ele fala
 * Modbus TCP com o CLP.
 *
 * SEGURANÇA (falha fechada, por padrão tudo desligado):
 *  - Só funciona com PLC_GATEWAY_ENABLED=true e PLC_HOST definido.
 *  - O destino (IP/porta/unit id) vem SOMENTE do ambiente do servidor. O navegador nunca escolhe
 *    o alvo (evita SSRF: usar o servidor para varrer a rede interna).
 *  - Escrita exige PLC_GATEWAY_ALLOW_WRITE=true E PLC_GATEWAY_TOKEN definido, e só nos endereços de
 *    PLC_WRITE_ALLOWLIST (padrão: coils 1, 2 e 4).
 *  - Se houver token, ele é exigido (header x-gateway-token) em test/read/write.
 *  ATENÇÃO: o RBAC do SCADA hoje é só no navegador. Em produção, coloque este endpoint atrás de
 *  autenticação real (proxy reverso/SSO/VPN) e rede industrial segmentada (IEC 62443).
 *
 * Endereçamento (mesma convenção do mapa de registradores do SCADA):
 *   40001..49999 -> holding register (função 03), offset = endereço - 40001
 *   1..9999      -> coil (função 01/05),           offset = endereço - 1
 *
 * Códigos de erro: ver src/services/errorCatalog.ts (SCD-PLC-xxx).
 */

import { Router, Request, Response, json } from 'express';
import { timingSafeEqual } from 'node:crypto';
import ModbusRTU from 'modbus-serial';

export interface PlcGatewayConfig {
  habilitado: boolean;
  host: string;
  porta: number;
  unitId: number;
  timeoutMs: number;
  enderecoProva: number;
  token: string | null;
  permitirEscrita: boolean;
  listaEscrita: number[];
  /** Motivo pelo qual algo está desligado (para /status e logs). */
  avisos: string[];
}

export function lerConfigPlc(env: Record<string, string | undefined>): PlcGatewayConfig {
  const avisos: string[] = [];
  const num = (v: string | undefined, padrao: number) => {
    const n = Number(v);
    return v !== undefined && v !== '' && Number.isFinite(n) ? n : padrao;
  };

  const habilitadoEnv = env.PLC_GATEWAY_ENABLED === 'true';
  const host = (env.PLC_HOST || '').trim();
  let habilitado = habilitadoEnv;
  if (habilitadoEnv && !host) {
    habilitado = false;
    avisos.push('PLC_GATEWAY_ENABLED=true, mas PLC_HOST não foi definido: gateway desligado.');
  }
  if (!habilitadoEnv) avisos.push('Gateway desligado (defina PLC_GATEWAY_ENABLED=true).');

  const token = env.PLC_GATEWAY_TOKEN ? env.PLC_GATEWAY_TOKEN : null;
  let permitirEscrita = env.PLC_GATEWAY_ALLOW_WRITE === 'true';
  if (permitirEscrita && !token) {
    permitirEscrita = false;
    avisos.push('PLC_GATEWAY_ALLOW_WRITE=true exige PLC_GATEWAY_TOKEN: escrita desligada.');
  }

  const listaEscrita = (env.PLC_WRITE_ALLOWLIST ?? '1,2,4')
    .split(',')
    .map(s => Number(s.trim()))
    .filter(n => Number.isInteger(n) && n > 0);

  return {
    habilitado,
    host,
    porta: num(env.PLC_PORT, 502),
    unitId: num(env.PLC_UNIT_ID, 1),
    timeoutMs: num(env.PLC_TIMEOUT_MS, 2000),
    enderecoProva: num(env.PLC_PROBE_ADDRESS, 40001),
    token,
    permitirEscrita,
    listaEscrita,
    avisos,
  };
}

export class GatewayError extends Error {
  constructor(public status: number, public codigo: string, message: string) {
    super(message);
    this.name = 'GatewayError';
  }
}

export type EnderecoModbus = { tipo: 'HOLDING' | 'COIL'; offset: number };

export function enderecoParaModbus(endereco: unknown): EnderecoModbus {
  if (typeof endereco !== 'number' || !Number.isInteger(endereco)) {
    throw new GatewayError(400, 'SCD-PLC-003', `Endereço inválido: ${String(endereco)}.`);
  }
  if (endereco >= 40001 && endereco <= 49999) return { tipo: 'HOLDING', offset: endereco - 40001 };
  if (endereco >= 1 && endereco <= 9999) return { tipo: 'COIL', offset: endereco - 1 };
  throw new GatewayError(400, 'SCD-PLC-003', `Endereço ${endereco} fora das faixas suportadas (1..9999 coils, 40001..49999 holding).`);
}

/** Agrupa endereços em leituras contíguas (menos requisições ao CLP). */
export function agruparLeituras(enderecos: number[], maxPorLeitura = 100): Array<{ tipo: 'HOLDING' | 'COIL'; inicio: number; fim: number }> {
  const porTipo: Record<'HOLDING' | 'COIL', number[]> = { HOLDING: [], COIL: [] };
  for (const e of new Set(enderecos)) {
    const m = enderecoParaModbus(e);
    porTipo[m.tipo].push(e);
  }
  const grupos: Array<{ tipo: 'HOLDING' | 'COIL'; inicio: number; fim: number }> = [];
  (['HOLDING', 'COIL'] as const).forEach(tipo => {
    const lista = porTipo[tipo].sort((a, b) => a - b);
    let g: { tipo: 'HOLDING' | 'COIL'; inicio: number; fim: number } | null = null;
    for (const e of lista) {
      if (g && e === g.fim + 1 && e - g.inicio + 1 <= maxPorLeitura) g.fim = e;
      else { g = { tipo, inicio: e, fim: e }; grupos.push(g); }
    }
  });
  return grupos;
}

type ModbusClient = InstanceType<typeof ModbusRTU>;

export class ModbusGateway {
  private client: ModbusClient | null = null;
  private fila: Promise<unknown> = Promise.resolve();

  constructor(private cfg: PlcGatewayConfig, private fabrica: () => ModbusClient = () => new ModbusRTU()) {}

  /** Serializa as operações: um socket Modbus atende uma requisição por vez. */
  private executar<T>(op: () => Promise<T>): Promise<T> {
    const proxima = this.fila.then(op, op);
    this.fila = proxima.catch(() => undefined);
    return proxima;
  }

  private descartarConexao(): void {
    const c = this.client;
    this.client = null;
    try { c?.close(() => undefined); } catch { /* já fechado */ }
  }

  private async conectar(): Promise<ModbusClient> {
    if (this.client?.isOpen) return this.client;
    this.descartarConexao();

    const c = this.fabrica();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        c.connectTCP(this.cfg.host, { port: this.cfg.porta }),
        new Promise<never>((_, rej) => {
          timer = setTimeout(() => rej(new GatewayError(504, 'SCD-PLC-001', `Sem resposta ao conectar em ${this.cfg.host}:${this.cfg.porta} (${this.cfg.timeoutMs} ms).`)), this.cfg.timeoutMs);
        }),
      ]);
    } catch (err) {
      try { c.close(() => undefined); } catch { /* ignora */ }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
    c.setID(this.cfg.unitId);
    c.setTimeout(this.cfg.timeoutMs);
    this.client = c;
    return c;
  }

  /** Traduz qualquer erro de rede/Modbus para (status HTTP, código SCD) e reinicia a conexão quando preciso. */
  private traduzir(err: unknown): GatewayError {
    if (err instanceof GatewayError) {
      if (err.codigo === 'SCD-PLC-001') this.descartarConexao();
      return err;
    }
    const e = err as any;
    if (typeof e?.modbusCode === 'number') {
      return new GatewayError(502, 'SCD-PLC-002', `O CLP respondeu com exceção Modbus ${e.modbusCode} (${e.message}).`);
    }
    this.descartarConexao();
    const msg = String(e?.message ?? e);
    if (/time(d)? ?out|ETIMEDOUT/i.test(msg) || e?.errno === 'ETIMEDOUT') {
      return new GatewayError(504, 'SCD-PLC-001', `Sem resposta do CLP em ${this.cfg.timeoutMs} ms.`);
    }
    return new GatewayError(502, 'SCD-PLC-002', `Falha de comunicação com o CLP: ${msg}`);
  }

  /** Testa a comunicação lendo 1 registrador. Exceção Modbus conta como "link ativo" (o CLP respondeu). */
  testar(): Promise<{ latenciaMs: number; observacao?: string }> {
    return this.executar(async () => {
      const t0 = Date.now();
      try {
        const c = await this.conectar();
        const m = enderecoParaModbus(this.cfg.enderecoProva);
        if (m.tipo === 'HOLDING') await c.readHoldingRegisters(m.offset, 1);
        else await c.readCoils(m.offset, 1);
        return { latenciaMs: Date.now() - t0 };
      } catch (err) {
        const e = err as any;
        if (typeof e?.modbusCode === 'number') {
          return { latenciaMs: Date.now() - t0, observacao: `CLP respondeu com exceção Modbus ${e.modbusCode} no endereço de prova (link ativo).` };
        }
        throw this.traduzir(err);
      }
    });
  }

  ler(enderecos: number[]): Promise<Record<number, number | boolean>> {
    return this.executar(async () => {
      const grupos = agruparLeituras(enderecos);
      const out: Record<number, number | boolean> = {};
      try {
        const c = await this.conectar();
        for (const g of grupos) {
          const len = g.fim - g.inicio + 1;
          if (g.tipo === 'HOLDING') {
            const r = await c.readHoldingRegisters(g.inicio - 40001, len);
            r.data.forEach((v, i) => { out[g.inicio + i] = v; });
          } else {
            const r = await c.readCoils(g.inicio - 1, len);
            for (let i = 0; i < len; i++) out[g.inicio + i] = Boolean(r.data[i]);
          }
        }
        return out;
      } catch (err) {
        throw this.traduzir(err);
      }
    });
  }

  escrever(endereco: number, valor: number | boolean): Promise<void> {
    return this.executar(async () => {
      const m = enderecoParaModbus(endereco);
      try {
        const c = await this.conectar();
        if (m.tipo === 'COIL') await c.writeCoil(m.offset, Boolean(valor));
        else await c.writeRegister(m.offset, valor as number);
        // Releitura: só afirma sucesso se o CLP confirma o valor gravado
        if (m.tipo === 'COIL') {
          const r = await c.readCoils(m.offset, 1);
          if (Boolean(r.data[0]) !== Boolean(valor)) {
            throw new GatewayError(502, 'SCD-PLC-002', `Escrita no endereço ${endereco} não confirmada na releitura.`);
          }
        } else {
          const r = await c.readHoldingRegisters(m.offset, 1);
          if (r.data[0] !== valor) {
            throw new GatewayError(502, 'SCD-PLC-002', `Escrita no endereço ${endereco} não confirmada na releitura.`);
          }
        }
      } catch (err) {
        throw this.traduzir(err);
      }
    });
  }

  fechar(): void {
    this.descartarConexao();
  }
}

function tokenValido(esperado: string, recebido: unknown): boolean {
  if (typeof recebido !== 'string') return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

function responderErro(res: Response, err: unknown): void {
  const g = err instanceof GatewayError ? err : new GatewayError(500, 'SCD-PLC-002', `Erro interno do gateway: ${(err as Error)?.message ?? err}`);
  res.status(g.status).json({ sucesso: false, codigo: g.codigo, erro: g.message });
}

export function criarRotasPlc(cfg: PlcGatewayConfig, gateway: ModbusGateway = new ModbusGateway(cfg)): Router {
  const router = Router();
  router.use(json({ limit: '10kb' }));

  router.get('/status', (_req, res) => {
    res.json({
      sucesso: true,
      habilitado: cfg.habilitado,
      escritaHabilitada: cfg.habilitado && cfg.permitirEscrita,
      exigeToken: cfg.token !== null,
      avisos: cfg.avisos,
    });
  });

  // Todas as demais rotas: gateway ligado + token (se configurado)
  router.use((req: Request, res: Response, next) => {
    if (!cfg.habilitado) {
      return responderErro(res, new GatewayError(503, 'SCD-PLC-005', `Gateway Modbus desligado no servidor. ${cfg.avisos.join(' ')}`.trim()));
    }
    if (cfg.token && !tokenValido(cfg.token, req.header('x-gateway-token'))) {
      return responderErro(res, new GatewayError(401, 'SCD-AUT-001', 'Token do gateway ausente ou inválido.'));
    }
    next();
  });

  router.post('/test', async (_req, res) => {
    try {
      const r = await gateway.testar();
      res.json({ sucesso: true, ...r });
    } catch (err) { responderErro(res, err); }
  });

  router.post('/read', async (req, res) => {
    try {
      const enderecos = req.body?.enderecos;
      if (!Array.isArray(enderecos) || enderecos.length === 0 || enderecos.length > 64) {
        throw new GatewayError(400, 'SCD-PLC-003', 'Informe de 1 a 64 endereços em "enderecos".');
      }
      enderecos.forEach(enderecoParaModbus); // valida todos antes de falar com o CLP
      const valores = await gateway.ler(enderecos);
      res.json({ sucesso: true, valores });
    } catch (err) { responderErro(res, err); }
  });

  router.post('/write', async (req, res) => {
    const { endereco, valor } = req.body ?? {};
    const origem = req.ip;
    try {
      if (!cfg.permitirEscrita) {
        throw new GatewayError(403, 'SCD-PLC-008', 'Escrita desabilitada no gateway (PLC_GATEWAY_ALLOW_WRITE + PLC_GATEWAY_TOKEN).');
      }
      const m = enderecoParaModbus(endereco);
      if (!cfg.listaEscrita.includes(endereco)) {
        throw new GatewayError(403, 'SCD-PLC-008', `Endereço ${endereco} não está na lista de escrita permitida.`);
      }
      if (m.tipo === 'COIL' && typeof valor !== 'boolean') {
        throw new GatewayError(400, 'SCD-PLC-006', 'Coil exige valor booleano.');
      }
      if (m.tipo === 'HOLDING' && !(typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 65535)) {
        throw new GatewayError(400, 'SCD-PLC-006', 'Holding register exige inteiro entre 0 e 65535.');
      }
      await gateway.escrever(endereco, valor);
      console.log(`[PLC-GATEWAY] ${new Date().toISOString()} ESCRITA OK origem=${origem} endereco=${endereco} valor=${valor}`);
      res.json({ sucesso: true });
    } catch (err) {
      const g = err instanceof GatewayError ? err : null;
      console.warn(`[PLC-GATEWAY] ${new Date().toISOString()} ESCRITA NEGADA/FALHOU origem=${origem} endereco=${endereco} valor=${valor} codigo=${g?.codigo ?? 'desconhecido'} motivo=${(err as Error)?.message}`);
      responderErro(res, err);
    }
  });

  return router;
}
