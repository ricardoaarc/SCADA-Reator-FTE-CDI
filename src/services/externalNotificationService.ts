/**
 * Serviço de Despacho de Alertas e Notificações Externas (Telegram Bot, Webhook & E-mail)
 * Paridade com o Notification Dispatcher do SCADA-LTS e Rapid SCADA v6
 */

import { ExternalNotificationSettings, NotificationDispatchLog, NivelSeveridadeAlarme } from '../types';

export class ExternalNotificationService {
  private static instance: ExternalNotificationService;
  
  /**
   * ATENÇÃO: este serviço é uma SIMULAÇÃO. Nenhum canal (Telegram, webhook, e-mail) é realmente acionado a partir daqui;
   * enviar do navegador exporia tokens e segredos. Notificação real de interlock está em NotificationService (webhook com
   * tentativas e alarme de falha). Para Telegram/e-mail reais, o envio precisa passar pelo servidor.
   * Padrões: tudo desabilitado e vazio (sem tokens, segredos, URLs ou destinatários de exemplo).
   */
  private settings: ExternalNotificationSettings = {
    telegramHabilitado: false,
    telegramBotToken: '',
    telegramChatId: '',
    webhookHabilitado: false,
    webhookUrl: '',
    webhookSecret: '',
    emailHabilitado: false,
    destinatariosEmail: [],
    nivelMinimoDisparo: 'ALERTA',
    intervaloMinimoReenvioMinutos: 5,
    notificarRecuperacao: true,
    ultimoDisparoTimestamp: undefined,
    totalNotificacoesEnviadas: 0, // só conta envios reais (hoje nenhum: este serviço só simula)
  };

  // Sem histórico de exemplo: logs falsos de envios que nunca aconteceram parecem registro real
  private logs: NotificationDispatchLog[] = [];

  public static getInstance(): ExternalNotificationService {
    if (!ExternalNotificationService.instance) {
      ExternalNotificationService.instance = new ExternalNotificationService();
    }
    return ExternalNotificationService.instance;
  }

  public getSettings(): ExternalNotificationSettings {
    return { ...this.settings };
  }

  public updateSettings(novasConfiguracoes: Partial<ExternalNotificationSettings>): ExternalNotificationSettings {
    this.settings = {
      ...this.settings,
      ...novasConfiguracoes
    };
    return this.settings;
  }

  public getLogs(): NotificationDispatchLog[] {
    return [...this.logs];
  }

  /**
   * Envia ou simula disparo imediato de notificação para os canais ativos
   */
  public async dispararNotificacaoManual(
    severidade: NivelSeveridadeAlarme,
    mensagem: string,
    canaisAlvo: ('TELEGRAM' | 'WEBHOOK' | 'EMAIL')[]
  ): Promise<NotificationDispatchLog[]> {
    const novosLogs: NotificationDispatchLog[] = [];
    const agora = new Date().toISOString();

    for (const canal of canaisAlvo) {
      const logId = `NOTIF-${String(this.logs.length + novosLogs.length + 1).padStart(3, '0')}`;
      let destinatario = '';
      let detalhes = '';

      if (canal === 'TELEGRAM') {
        destinatario = `Telegram Chat ${this.settings.telegramChatId || '(não configurado)'}`;
      } else if (canal === 'WEBHOOK') {
        destinatario = this.settings.webhookUrl || '(URL não configurada)';
      } else if (canal === 'EMAIL') {
        destinatario = this.settings.destinatariosEmail.join(', ') || '(sem destinatários)';
      }
      detalhes = `[SIMULAÇÃO] Nada foi enviado: este painel não possui integração real com ${canal}.`;

      const novoLog: NotificationDispatchLog = {
        id: logId,
        timestamp: agora,
        severidade,
        canal,
        destinatario,
        mensagem,
        status: 'SIMULADO',
        detalhesResposta: detalhes
      };

      novosLogs.push(novoLog);
    }

    this.logs = [...novosLogs, ...this.logs];
    this.settings.ultimoDisparoTimestamp = agora; // último disparo SIMULADO; o contador de envios reais não muda

    return novosLogs;
  }

  public limparLogs() {
    this.logs = [];
  }
}

export const externalNotificationServiceInstance = ExternalNotificationService.getInstance();
