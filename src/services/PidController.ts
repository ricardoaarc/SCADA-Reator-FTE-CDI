/**
 * Controlador PID em Malha Fechada de Vazão e Pressão
 * Reator FTE-CDI - Rack 10 Células
 * Inclui Proteção Anti-Windup e Override Crítico Anti-Ruptura da Base Plenum PEAD (2.70 bar)
 */

import { PidConfig, PidTelemetryPoint } from '../types';
import { authService } from './AuthService';
import { ScadaError } from './errorCatalog';

class PidControllerService {
  /** Saída do VFD (%) quando a pressão está inválida: mesma redução do limiar iminente de corte. */
  static readonly SAIDA_FALHA_SENSOR_PCT = 10.0;

  private config: PidConfig = {
    habilitado: true,
    modo: 'AUTO',
    setpointVazaoLh: 980, // Setpoint nominal de vazão (500 a 1500 L/h)
    kp: 0.12,
    ki: 0.04,
    kd: 0.015,
    saidaMinPct: 0,
    saidaMaxPct: 100,
    limitePressaoOverrideBar: 2.70, // Inicia limitação forçada antes dos 3.0 bar
    overridePressaoAtivo: false,
    saidaManualPct: 65,
    sinalVfdAtualPct: 65.4,
    termoP: 0,
    termoI: 45.0,
    termoD: 0,
    erroAtual: 0,
  };

  private integralAcumulada: number = 45.0;
  private erroAnterior: number = 0;
  private historicoPid: PidTelemetryPoint[] = [];
  private listeners: Array<(cfg: PidConfig, hist: PidTelemetryPoint[]) => void> = [];

  constructor() {
    // Inicializa histórico com pontos
    const agora = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(agora - i * 1000).toLocaleTimeString('pt-BR');
      this.historicoPid.push({
        timestamp: t,
        spVazao: 980,
        pvVazao: 975 + Math.sin(i) * 15,
        mvVfdPct: 65 + Math.cos(i) * 3,
        pressaoBar: 1.85 + Math.sin(i * 0.5) * 0.08,
        overrideAtivo: false,
      });
    }
  }

  public getConfig(): PidConfig {
    return { ...this.config };
  }

  public getHistorico(): PidTelemetryPoint[] {
    return [...this.historicoPid];
  }

  /**
   * Executa um ciclo de cálculo do algoritmo PID
   * @param vazaoAtualLh PV de vazão medida pelo sensor
   * @param pressaoAtualBar PV de pressão medida no plenum PEAD
   * @param dtSegundos Intervalo de tempo (padrão 1.0 s)
   * @returns Sinal modulado de saída para o inversor de frequência (0 a 100%)
   */
  public calcular(vazaoAtualLh: number, pressaoAtualBar: number, dtSegundos: number = 1.0): number {
    if (!this.config.habilitado) {
      return 0;
    }

    // Entradas inválidas (NaN, Infinity, dt <= 0) NUNCA entram na conta: um NaN no integrador o envenena para sempre
    // (NaN > 80 e NaN < 0 são falsos, então o clamp não pega) e a saída do VFD vira NaN.
    if (!Number.isFinite(dtSegundos) || dtSegundos <= 0) dtSegundos = 1.0;

    if (!Number.isFinite(pressaoAtualBar)) {
      // Sem pressão confiável não há como proteger as placas: estado seguro = saída reduzida (10%), integrador intacto
      this.config.overridePressaoAtivo = true;
      this.config.sinalVfdAtualPct = PidControllerService.SAIDA_FALHA_SENSOR_PCT;
      this.notify();
      return this.config.sinalVfdAtualPct;
    }

    if (!Number.isFinite(vazaoAtualLh) && this.config.modo !== 'MANUAL') {
      // Vazão inválida: mantém a última saída, sem atualizar erro, integral nem derivada
      this.notify();
      return this.config.sinalVfdAtualPct;
    }

    // Modo Manual: operador dita a porcentagem do VFD diretamente
    if (this.config.modo === 'MANUAL') {
      let sinalManual = this.config.saidaManualPct;
      
      // Mesmo em manual, se a pressão ultrapassar 2.80 bar, o override de segurança atua
      if (pressaoAtualBar >= this.config.limitePressaoOverrideBar) {
        this.config.overridePressaoAtivo = true;
        sinalManual = Math.min(sinalManual, 25.0); // Reduz velocidade para evitar estourar 3.0 bar
      } else {
        this.config.overridePressaoAtivo = false;
      }

      this.config.sinalVfdAtualPct = sinalManual;
      this.registrarPontoHistorico(vazaoAtualLh, pressaoAtualBar, sinalManual, this.config.overridePressaoAtivo);
      this.notify();
      return sinalManual;
    }

    // Modo Automático (PID em malha fechada)
    const sp = this.config.setpointVazaoLh;
    const pv = vazaoAtualLh;
    const erro = sp - pv;
    this.config.erroAtual = erro;

    // Termo Proporcional
    const P = this.config.kp * erro;
    this.config.termoP = P;

    // Termo Integral com Anti-Windup Clamping (-30% a +80%)
    this.integralAcumulada += this.config.ki * erro * dtSegundos;
    if (this.integralAcumulada > 80.0) this.integralAcumulada = 80.0;
    if (this.integralAcumulada < 0.0) this.integralAcumulada = 0.0;
    this.config.termoI = this.integralAcumulada;

    // Termo Derivativo
    const dErro = (erro - this.erroAnterior) / dtSegundos;
    const D = this.config.kd * dErro;
    this.config.termoD = D;
    this.erroAnterior = erro;

    // Saída PID bruta (0 a 100%)
    let saidaCalculada = P + this.integralAcumulada + D;
    saidaCalculada = Math.max(this.config.saidaMinPct, Math.min(this.config.saidaMaxPct, saidaCalculada));

    // =========================================================================
    // OVERRIDE MECÂNICO CRÍTICO: Proteção das Placas Plenum de PEAD (Máx 3.0 bar)
    // Se a pressão ultrapassar 2.70 bar, o controle de sobrepressão sobrepõe a vazão
    // e estrangula a rotação da bomba proporcionalmente ao risco de ruptura!
    // =========================================================================
    if (pressaoAtualBar >= this.config.limitePressaoOverrideBar) {
      this.config.overridePressaoAtivo = true;
      // Fator de alívio: quanto mais perto de 3.0 bar, menor a saída do VFD
      const excedente = pressaoAtualBar - this.config.limitePressaoOverrideBar; // 0.0 a 0.30 bar
      const fatorReducao = Math.max(0.1, 1.0 - (excedente / 0.30));
      saidaCalculada = saidaCalculada * fatorReducao;
      
      // Se passar de 2.92 bar (limiar iminente do corte mecânico), reduz para 10%
      if (pressaoAtualBar >= 2.92) {
        saidaCalculada = 10.0;
      }
    } else {
      this.config.overridePressaoAtivo = false;
    }

    this.config.sinalVfdAtualPct = Number(saidaCalculada.toFixed(1));
    this.registrarPontoHistorico(vazaoAtualLh, pressaoAtualBar, this.config.sinalVfdAtualPct, this.config.overridePressaoAtivo);
    this.notify();
    return this.config.sinalVfdAtualPct;
  }

  private registrarPontoHistorico(vazao: number, pressao: number, mv: number, override: boolean): void {
    const ponto: PidTelemetryPoint = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      spVazao: this.config.setpointVazaoLh,
      pvVazao: Number(vazao.toFixed(1)),
      mvVfdPct: Number(mv.toFixed(1)),
      pressaoBar: Number(pressao.toFixed(2)),
      overrideAtivo: override,
    };

    this.historicoPid.push(ponto);
    if (this.historicoPid.length > 30) {
      this.historicoPid.shift();
    }
  }

  public setSetpointVazao(novoSp: number): boolean {
    if (typeof novoSp !== 'number' || !Number.isFinite(novoSp) || novoSp < 500 || novoSp > 1500) return false;
    
    const anterior = this.config.setpointVazaoLh;
    this.config.setpointVazaoLh = novoSp;

    authService.registrarAuditoria(
      `Alteração de Setpoint PID de Vazão: ${anterior} L/h -> ${novoSp} L/h`,
      'PROCESSO'
    );

    this.notify();
    return true;
  }

  public atualizarParametrosSintonia(kp: number, ki: number, kd: number): boolean {
    if (!authService.podeModificarPid()) {
      throw new ScadaError('SCD-AUT-001', 'Apenas Engenheiros de Processos ou Administradores podem alterar ganhos PID.');
    }

    // Ganho inválido (NaN, negativo, absurdo) envenenaria o integrador/derivada e a saída do VFD
    for (const [nome, v] of [['Kp', kp], ['Ki', ki], ['Kd', kd]] as const) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1000) {
        throw new Error(`${nome} inválido (${String(v)}): informe um número entre 0 e 1000.`);
      }
    }

    this.config.kp = kp;
    this.config.ki = ki;
    this.config.kd = kd;

    authService.registrarAuditoria(
      `Sintonia de ganhos PID: Kp=${kp}, Ki=${ki}, Kd=${kd}`,
      'PROCESSO'
    );

    this.notify();
    return true;
  }

  public setParametrosSintonia(kp: number, ki: number, kd: number): boolean {
    return this.atualizarParametrosSintonia(kp, ki, kd);
  }

  public alternarModo(modo: 'AUTO' | 'MANUAL'): void {
    this.config.modo = modo;
    authService.registrarAuditoria(
      `Comutação de modo do PID: ${modo}`,
      'PROCESSO'
    );
    this.notify();
  }

  public setModo(modo: 'AUTO' | 'MANUAL'): void {
    this.alternarModo(modo);
  }

  public setSaidaManualPct(pct: number): void {
    if (typeof pct !== 'number' || !Number.isFinite(pct)) return; // NaN viraria a saída do VFD
    this.config.saidaManualPct = Math.max(0, Math.min(100, pct));
    this.notify();
  }

  public setSaidaManual(pct: number): void {
    this.setSaidaManualPct(pct);
  }

  public subscribe(cb: (cfg: PidConfig, hist: PidTelemetryPoint[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getConfig(), this.getHistorico());
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify(): void {
    const cfg = this.getConfig();
    const hist = this.getHistorico();
    this.listeners.forEach(cb => cb(cfg, hist));
  }
}

export const pidService = new PidControllerService();
