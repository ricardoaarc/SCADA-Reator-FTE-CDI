import { dbInstance } from './database';
import { comCodigo } from './errorCatalog';
import { lerCampos, lerLista, gravarJson } from './storageSeguro';
import { camposNotificacao, esquemaAlerta } from './esquemasDados';

export interface NotificationConfig {
  emailHabilitado: boolean;
  destinatariosEmail: string[];
  pushHabilitado: boolean;
  somSireneHabilitado: boolean;
  webhookHabilitado: boolean;
  webhookUrl: string;
  cooldownSegundos: number;
}

/**
 * Destinatários padrão de alerta: definidos no build por VITE_ALERT_EMAIL_PADRAO (lista separada por vírgula).
 * Sem a variável, a lista começa vazia e o operador cadastra no painel (nenhum e-mail pessoal fica no código).
 */
function destinatariosPadrao(): string[] {
  const bruto = (import.meta as any).env?.VITE_ALERT_EMAIL_PADRAO;
  if (typeof bruto !== 'string') return [];
  return bruto
    .split(',')
    .map((e: string) => e.trim())
    .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export class NotificationService {
  private config: NotificationConfig = {
    emailHabilitado: true,
    destinatariosEmail: destinatariosPadrao(),
    pushHabilitado: true,
    somSireneHabilitado: true,
    webhookHabilitado: false,
    webhookUrl: "https://telemetria.planta-cdi.com/api/v1/interlocks",
    cooldownSegundos: 20
  };

  public historicoAlertas: any[] = [];
  private ultimoDisparoTimestamp = 0;
  private ultimoMotivo: string | null = null;
  public ultimoEmailMock: any = null;
  private webhookTentativas = 3;
  private webhookBackoffBaseMs = 1000;
  private webhookTimeoutMs = 5000;
  private listeners: Array<(...args: any[]) => void> = [];

  constructor() {
    this.carregarConfiguracoes();
    this.carregarHistorico();
    this.inicializarEmailMockPadrao();
  }

  public configurarEntregaWebhook(p: { tentativas?: number; backoffBaseMs?: number; timeoutMs?: number }): void {
    if (p.tentativas !== undefined) this.webhookTentativas = Math.max(1, p.tentativas);
    if (p.backoffBaseMs !== undefined) this.webhookBackoffBaseMs = Math.max(0, p.backoffBaseMs);
    if (p.timeoutMs !== undefined) this.webhookTimeoutMs = Math.max(1, p.timeoutMs);
  }

  private inicializarEmailMockPadrao(): void {
    const dataIso = new Date().toISOString();
    const emailFormatado = this.gerarConteudoEmail({
      motivo: "Sobrepressão na Base Plenum > 3.0 bar (Extrusão de O-rings)",
      pressaoBar: 3.25,
      vazaoLh: 0,
      tensaoV: 0,
      correnteA: 0,
      celulas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      isSobrepressao: true,
      timestamp: dataIso
    });

    this.ultimoEmailMock = {
      sucesso: true,
      messageId: `msg_${Date.now().toString(36).toUpperCase()}_01`,
      statusCode: 200,
      tempoRespostaMs: 185,
      provedor: "API Gateway SMTP (Resend / AWS SES Mock)",
      endpoint: "https://api.scada-remoto.ind.br/v1/notifications/email/send",
      timestamp: dataIso,
      dadosEnvio: {
        remetente: emailFormatado.remetente,
        destinatarios: [...this.config.destinatariosEmail],
        assunto: emailFormatado.assunto,
        corpoHtml: emailFormatado.corpoHtml,
        corpoTexto: emailFormatado.corpoTexto,
        headers: {
          "Content-Type": "application/json",
          "X-SCADA-Alert-Level": "CRITICAL",
          "X-Planta-ID": "FTE-CDI-RACK10-PARALELO",
          "X-PEAD-Plenum-Limit": "3.00bar",
          "X-Relay-Action": "PUMP_DISARMED"
        }
      }
    };
  }

  public getStatusPermissaoPush(): string {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "nao_suportado";
    }
    return (window as any).Notification.permission;
  }

  public async solicitarPermissaoPush(): Promise<string> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "nao_suportado";
    }
    try {
      const permissao = await (window as any).Notification.requestPermission();
      this.notificarListeners();
      return permissao;
    } catch (e) {
      console.warn("Erro ao solicitar permissão de Notificação:", e);
      return "denied";
    }
  }

  public tocarSireneManualmente(): void {
    this.tocarSireneAlerta();
  }

  public tocarSireneAlerta(): void {
    if (!this.config.somSireneHabilitado || typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.25);
      osc.frequency.linearRampToValueAtTime(850, now + 0.5);
      osc.frequency.linearRampToValueAtTime(1250, now + 0.75);
      osc.frequency.linearRampToValueAtTime(850, now + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    } catch (e) {
      console.warn("Web Audio indisponível:", e);
    }
  }

  public dispararAlertaInterlock(params: {
    motivo: string;
    pressaoBar: number;
    vazaoLh: number;
    tensaoV: number;
    correnteA: number;
    celulasComprometidas?: number[];
    isTeste?: boolean;
  }): any {
    const agora = Date.now();
    const diferencaSegundos = (agora - this.ultimoDisparoTimestamp) / 1000;
    if (!params.isTeste && this.ultimoMotivo === params.motivo && diferencaSegundos < this.config.cooldownSegundos) {
      return null;
    }

    this.ultimoDisparoTimestamp = agora;
    this.ultimoMotivo = params.motivo;
    const dataIso = new Date().toISOString();
    const alertaId = `ALERTA-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const canaisAtivos: string[] = [];
    const celulas = params.celulasComprometidas || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const isSobrepressao = params.pressaoBar >= 3;

    if (this.config.somSireneHabilitado) {
      canaisAtivos.push("SIREN");
      this.tocarSireneAlerta();
    }

    let statusEnvio = "ENVIADO";
    if (this.config.pushHabilitado) {
      canaisAtivos.push("PUSH");
      const pushStatus = this.enviarWebPush({
        titulo: "🚨 INTERLOCK CRÍTICO - FTE-CDI",
        corpo: `${params.motivo} | Pressão: ${params.pressaoBar.toFixed(2)} bar (Relé da Bomba Desarmado).`
      });
      if (pushStatus === "bloqueado") {
        statusEnvio = "BLOQUEADO_NAVEGADOR";
      }
    }

    if (this.config.emailHabilitado && this.config.destinatariosEmail.length > 0) {
      canaisAtivos.push("EMAIL");
    } else if (this.config.emailHabilitado) {
      // Interlock crítico sem ninguém para receber o e-mail: nunca silencioso (SCD-NOT-002)
      try {
        dbInstance.inserirAlarme(
          'CRITICO',
          comCodigo('SCD-NOT-002', 'Canal de e-mail habilitado, mas nenhum destinatário está configurado: o alerta deste interlock NÃO foi enviado por e-mail.'),
          null,
          'SCD-NOT-002'
        );
      } catch (e) {
        console.error('Não foi possível gravar o alarme SCD-NOT-002:', e);
      }
    }

    if (this.config.webhookHabilitado && this.config.webhookUrl) {
      canaisAtivos.push("WEBHOOK");
      this.despacharWebhook(alertaId, params).catch(err =>
        console.error("[SCD-NOT-001] Erro inesperado no despacho do webhook:", err)
      );
    }

    const emailFormatado = this.gerarConteudoEmail({
      motivo: params.motivo,
      pressaoBar: params.pressaoBar,
      vazaoLh: params.vazaoLh,
      tensaoV: params.tensaoV,
      correnteA: params.correnteA,
      celulas,
      isSobrepressao,
      timestamp: dataIso
    });

    const alerta = {
      id: alertaId,
      timestamp: dataIso,
      interlockMotivo: params.motivo,
      severidade: "CRITICO",
      canaisDisparados: canaisAtivos,
      destinatariosEmail: [...this.config.destinatariosEmail],
      statusEnvio: statusEnvio === "BLOQUEADO_NAVEGADOR" ? "BLOQUEADO_NAVEGADOR" : "ENTREGUE",
      pressaoBar: params.pressaoBar,
      vazaoLh: params.vazaoLh,
      tensaoV: params.tensaoV,
      correnteA: params.correnteA,
      detalhesTecnicos: {
        releBombaDesarmado: true,
        pressaoCriticaAtingida: isSobrepressao,
        celulasComprometidas: celulas,
        recomendacaoOperacional: isSobrepressao
          ? "ALÍVIO IMEDIATO DE LINHA NECESSÁRIO: A pressão no plenum PEAD ultrapassou 3.0 bar. Inspecione a tubulação de descarte e vedações de EPDM/O-rings antes de rearmar o relé."
          : "INSPEÇÃO OPERACIONAL: Relé desarmado preventivamente. Verifique estado das válvulas solenoides e integridade da malha de Ti (Ru-Ir)."
      },
      emailPreview: emailFormatado
    };

    this.ultimoEmailMock = {
      sucesso: true,
      messageId: `msg_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6)}`,
      statusCode: 200,
      tempoRespostaMs: Math.floor(130 + Math.random() * 80),
      provedor: "API Gateway SMTP (Resend / AWS SES Mock)",
      endpoint: "https://api.scada-remoto.ind.br/v1/notifications/email/send",
      timestamp: dataIso,
      dadosEnvio: {
        remetente: emailFormatado.remetente,
        destinatarios: [...this.config.destinatariosEmail],
        assunto: emailFormatado.assunto,
        corpoHtml: emailFormatado.corpoHtml,
        corpoTexto: emailFormatado.corpoTexto,
        headers: {
          "Content-Type": "application/json",
          "X-SCADA-Alert-Level": "CRITICAL",
          "X-Planta-ID": "FTE-CDI-RACK10-PARALELO",
          "X-PEAD-Plenum-Limit": "3.00bar",
          "X-Relay-Action": "PUMP_DISARMED"
        }
      }
    };

    this.historicoAlertas.unshift(alerta);
    if (this.historicoAlertas.length > 50) {
      this.historicoAlertas.pop();
    }

    this.salvarHistorico();
    this.notificarListeners();
    return alerta;
  }

  public async simularEnvioEmailApi(params?: any): Promise<any> {
    const latencia = Math.floor(140 + Math.random() * 110);
    await new Promise(resolve => setTimeout(resolve, latencia));

    const motivo = params?.motivo || "Sobrepressão Crítica > 3.0 bar na Base Plenum PEAD (Relé Desarmado)";
    const pressaoBar = params?.pressaoBar ?? 3.22;
    const vazaoLh = params?.vazaoLh ?? 0;
    const tensaoV = params?.tensaoV ?? 0;
    const correnteA = params?.correnteA ?? 0;
    const celulas = params?.celulasComprometidas || [1, 2, 4, 7];
    const destinatarios = params?.destinatarios && params.destinatarios.length > 0 ? params.destinatarios : [...this.config.destinatariosEmail];
    const timestamp = new Date().toISOString();
    const isSobrepressao = pressaoBar >= 3;

    const emailFormatado = this.gerarConteudoEmail({
      motivo,
      pressaoBar,
      vazaoLh,
      tensaoV,
      correnteA,
      celulas,
      isSobrepressao,
      timestamp
    });

    const mockResponse = {
      sucesso: true,
      messageId: `msg_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 7)}`,
      statusCode: 200,
      tempoRespostaMs: latencia,
      provedor: params?.provedor || "API Gateway SMTP (Resend / AWS SES Mock)",
      endpoint: "https://api.scada-remoto.ind.br/v1/notifications/email/send",
      timestamp,
      dadosEnvio: {
        remetente: emailFormatado.remetente,
        destinatarios,
        assunto: emailFormatado.assunto,
        corpoHtml: emailFormatado.corpoHtml,
        corpoTexto: emailFormatado.corpoTexto,
        headers: {
          "Content-Type": "application/json",
          "X-SCADA-Alert-Level": "CRITICAL",
          "X-Planta-ID": "FTE-CDI-RACK10-PARALELO",
          "X-PEAD-Plenum-Limit": "3.00bar",
          "X-Relay-Action": "PUMP_DISARMED",
          "X-Operator-Contact": destinatarios[0] ?? ""
        }
      }
    };

    this.ultimoEmailMock = mockResponse;
    const alerta = {
      id: `ALERTA-API-${Date.now().toString(36).toUpperCase()}`,
      timestamp,
      interlockMotivo: `[API MOCK] ${motivo}`,
      severidade: "CRITICO",
      canaisDisparados: ["EMAIL"],
      destinatariosEmail: destinatarios,
      statusEnvio: "ENTREGUE",
      pressaoBar,
      vazaoLh,
      tensaoV,
      correnteA,
      detalhesTecnicos: {
        releBombaDesarmado: true,
        pressaoCriticaAtingida: isSobrepressao,
        celulasComprometidas: celulas,
        recomendacaoOperacional: isSobrepressao
          ? "ALÍVIO IMEDIATO DE LINHA NECESSÁRIO: A pressão no plenum PEAD ultrapassou 3.0 bar. Inspecione a tubulação de descarte e vedações de EPDM/O-rings antes de rearmar o relé."
          : "INSPEÇÃO OPERACIONAL: Relé desarmado preventivamente."
      },
      emailPreview: emailFormatado
    };

    this.historicoAlertas.unshift(alerta);
    if (this.historicoAlertas.length > 50) {
      this.historicoAlertas.pop();
    }
    this.salvarHistorico();
    this.notificarListeners();
    return mockResponse;
  }

  public getUltimoEmailMock(): any {
    return this.ultimoEmailMock;
  }

  public dispararAlertaTeste(): any {
    return this.dispararAlertaInterlock({
      motivo: "TESTE DE MONITORAMENTO REMOTO: Simulação de Disparo de Interlock Físico",
      pressaoBar: 3.18,
      vazaoLh: 0,
      tensaoV: 0,
      correnteA: 0,
      celulasComprometidas: [1, 2, 5, 8],
      isTeste: true
    });
  }

  public enviarWebPush(dados: { titulo: string; corpo: string }): string {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "bloqueado";
    }
    if ((window as any).Notification.permission === "granted") {
      try {
        const notif = new (window as any).Notification(dados.titulo, {
          body: dados.corpo,
          icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444"><path d="M12 2L1 21h22L12 2zm0 3.5L20 19H4L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>',
          tag: "fte-cdi-interlock",
          requireInteraction: true
        });
        notif.onclick = () => {
          window.focus();
        };
        return "enviado";
      } catch (e) {
        console.warn("Erro ao instanciar Web Push Notification:", e);
        return "erro";
      }
    } else if ((window as any).Notification.permission === "default") {
      (window as any).Notification.requestPermission();
      return "bloqueado";
    }
    return "bloqueado";
  }

  public gerarConteudoEmail(info: {
    motivo: string;
    pressaoBar: number;
    vazaoLh: number;
    tensaoV: number;
    correnteA: number;
    celulas: number[];
    isSobrepressao: boolean;
    timestamp: string;
  }): any {
    const dataHoraFmt = new Date(info.timestamp).toLocaleString("pt-BR");
    const destinatariosStr = this.config.destinatariosEmail.join(", ");
    const assunto = `🚨 [SCADA CRÍTICO] INTERLOCK DISPARADO: Reator FTE-CDI (P=${info.pressaoBar.toFixed(2)} bar) - Relé Desarmado`;
    const corpoTexto = `
========================================================================
ALERTA DE SEGURANÇA OPERACIONAL - SCADA REATOR FTE-CDI
========================================================================
Data/Hora: ${dataHoraFmt}
Status do Sistema: INTERLOCK CRÍTICO ATIVADO (RELÉ DA BOMBA DESARMADO)
Motivo do Disparo: ${info.motivo}

PARÂMETROS DE TELEMETRIA NO INSTANTE DO DISPARO:
- Pressão no Plenum PEAD: ${info.pressaoBar.toFixed(2)} bar (Limite Seguro: < 3.00 bar)
- Vazão Total de Alimentação: ${info.vazaoLh.toFixed(1)} L/h
- Potencial Eletroquímico: ${info.tensaoV.toFixed(2)} V
- Corrente Elétrica do Skid: ${info.correnteA.toFixed(1)} A
- Rack: Skid 10 Células em Paralelo (500x165x40 mm)
- Células sob Inspeção: ${info.celulas.join(", ")}

AÇÃO AUTOMÁTICA DO CONTROLADOR SCADA:
1. Corte imediato da bobina do contator/relé da bomba de recalque.
2. Desenergização da fonte DC chaveada (tensão zerada a 0.00 V).
3. Travamento de segurança contra rearme não supervisionado.

PROCEDIMENTO OPERACIONAL OBRIGATÓRIO:
${
  info.isSobrepressao
    ? "- Risco eminente de ruptura mecânica ou extrusão das vedações do plenum de PEAD.\n- NÃO force o rearme manual do relé sem antes despressurizar o skid para P < 3.0 bar.\n- Efetue purga do circuito hidráulico e verifique obstruções na malha de titânio (Ru-Ir)."
    : "- Inspecione as linhas hidráulicas e os eletrodos de feltro de grafite antes do reestabelecimento."
}

Supervisório FTE-CDI v2.4 | Central de Engenharia de Processos
========================================================================
`;
    const corpoHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; padding: 24px; border-radius: 8px; max-width: 620px; border: 1px solid #1e293b;">
  <div style="background: #7f1d1d; border-left: 6px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #ffffff; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">
      🚨 Interlock Crítico Disparado - Reator FTE-CDI
    </h2>
    <p style="margin: 6px 0 0; color: #fca5a5; font-size: 13px;">
      Relé da Bomba de Alimentação Desarmado Imediatamente
    </p>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Horário do Evento:</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #f1f5f9; font-weight: bold;">${dataHoraFmt}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Causa do Interlock:</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #ef4444; font-weight: bold;">${info.motivo}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Pressão Registrada:</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: ${info.isSobrepressao ? "#ef4444" : "#f59e0b"}; font-weight: bold;">
        ${info.pressaoBar.toFixed(2)} bar (Máx. Estrutural: 3.00 bar)
      </td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Vazão Operacional:</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #f1f5f9;">${info.vazaoLh.toFixed(1)} L/h</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Estado do Relé:</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #ef4444; font-weight: bold;">ABERTO / DESARMADO</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #94a3b8;">Fonte DC (10 Células):</td>
      <td style="padding: 8px; border-bottom: 1px solid #1e293b; color: #38bdf8;">0.00 V (Eletrodos Desenergizados)</td>
    </tr>
  </table>

  <div style="background-color: #172554; border: 1px solid #1e40af; padding: 14px; border-radius: 6px; font-size: 12px; color: #bfdbfe; line-height: 1.5; margin-bottom: 20px;">
    <strong style="color: #60a5fa; display: block; margin-bottom: 4px;">Instrução Técnica Obrigatória:</strong>
    O CLP do SCADA bloqueou o rearme manual do relé até que a pressão hidráulica na base plenum de PEAD retorne aos níveis nominais (&lt; 3.0 bar). Inspecione as conexões flangeadas e vedações de EPDM.
  </div>

  <div style="font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px; text-align: center;">
    SCADA FTE-CDI v2.4 • Notificação Remota de Engenharia • Destinatário: ${destinatariosStr}
  </div>
</div>
`;
    return {
      remetente: "scada.alertas@cdi-remoto.ind.br",
      destinatarios: this.config.destinatariosEmail,
      assunto,
      corpoTexto,
      corpoHtml
    };
  }

  public async despacharWebhook(alertaId: string, params: any): Promise<boolean> {
    const url = this.config.webhookUrl;
    if (!url) return false;
    const corpo = JSON.stringify({
      evento: "INTERLOCK_CRITICO_FTE_CDI",
      alertaId,
      timestamp: new Date().toISOString(),
      dados: params
    });

    let ultimoErro = "erro desconhecido";
    for (let tentativa = 1; tentativa <= this.webhookTentativas; tentativa++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.webhookTimeoutMs);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: corpo,
          signal: ctrl.signal
        });
        if (res.ok) return true;
        ultimoErro = `HTTP ${res.status}`;
      } catch (err) {
        ultimoErro = ctrl.signal.aborted
          ? `tempo esgotado (${this.webhookTimeoutMs} ms)`
          : err instanceof Error
          ? err.message
          : String(err);
      } finally {
        clearTimeout(timer);
      }
      console.warn(`[SCD-NOT-001] Webhook: tentativa ${tentativa}/${this.webhookTentativas} falhou (${ultimoErro}).`);
      if (tentativa < this.webhookTentativas) {
        await new Promise(resolve => setTimeout(resolve, this.webhookBackoffBaseMs * 2 ** (tentativa - 1)));
      }
    }
    this.registrarFalhaEntrega(alertaId, `Webhook ${url} não entregue após ${this.webhookTentativas} tentativa(s): ${ultimoErro}.`);
    return false;
  }

  private registrarFalhaEntrega(alertaId: string, detalhe: string): void {
    console.error(`[SCD-NOT-001] ${detalhe}`);
    const alerta = this.historicoAlertas.find(a => a.id === alertaId);
    if (alerta) {
      alerta.statusEnvio = "FALHA";
      alerta.falhaEntrega = comCodigo("SCD-NOT-001", detalhe);
      this.salvarHistorico();
      this.notificarListeners();
    }
    try {
      dbInstance.inserirAlarme(
        "CRITICO",
        comCodigo("SCD-NOT-001", `Falha ao entregar notificação do interlock: ${detalhe}`),
        null,
        "SCD-NOT-001"
      );
    } catch (e) {
      console.error("Não foi possível gravar o alarme SCD-NOT-001:", e);
    }
  }

  public getConfig(): NotificationConfig {
    return { ...this.config, destinatariosEmail: [...this.config.destinatariosEmail] };
  }

  public atualizarConfig(parcial: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...parcial };
    this.salvarConfiguracoes();
    this.notificarListeners();
  }

  public adicionarDestinatarioEmail(email: string): boolean {
    const limpo = email.trim().toLowerCase();
    if (!limpo || !limpo.includes("@") || this.config.destinatariosEmail.includes(limpo)) {
      return false;
    }
    this.config.destinatariosEmail.push(limpo);
    this.salvarConfiguracoes();
    this.notificarListeners();
    return true;
  }

  public removerDestinatarioEmail(email: string): void {
    this.config.destinatariosEmail = this.config.destinatariosEmail.filter(e => e !== email);
    this.salvarConfiguracoes();
    this.notificarListeners();
  }

  public getHistoricoAlertas(): any[] {
    return [...this.historicoAlertas];
  }

  public limparHistorico(): void {
    this.historicoAlertas = [];
    this.salvarHistorico();
    this.notificarListeners();
  }

  private salvarConfiguracoes(): void {
    gravarJson("scada_notification_config", this.config, "Configuração de notificações");
  }

  private carregarConfiguracoes(): void {
    const lido = lerCampos("scada_notification_config", camposNotificacao, this.config as any, "Configuração de notificações") as any;
    this.config = {
      ...lido,
      destinatariosEmail: (lido.destinatariosEmail && lido.destinatariosEmail.length > 0) ? lido.destinatariosEmail : destinatariosPadrao()
    };
  }

  private salvarHistorico(): void {
    gravarJson("scada_notification_history", this.historicoAlertas.slice(0, 30), "Histórico de notificações");
  }

  private carregarHistorico(): void {
    this.historicoAlertas = lerLista("scada_notification_history", esquemaAlerta, () => this.historicoAlertas, "Histórico de notificações");
  }

  public subscribe(fn: (...args: any[]) => void): () => void {
    this.listeners.push(fn);
    fn(this.getHistoricoAlertas(), this.getConfig(), this.getUltimoEmailMock());
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notificarListeners(): void {
    const historico = this.getHistoricoAlertas();
    const config = this.getConfig();
    const emailMock = this.getUltimoEmailMock();
    this.listeners.forEach(fn => fn(historico, config, emailMock));
  }
}

export const notificationService = new NotificationService();
