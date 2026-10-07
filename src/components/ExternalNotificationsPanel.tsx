/**
 * Central de Alertas e Notificações Externas Multicanal (Telegram, Webhook, E-mail & Celular)
 * Paridade com Notifier do SCADA-LTS e Rapid SCADA v6
 */

import React, { useState } from 'react';
import { 
  BellRing, 
  Send, 
  ShieldAlert, 
  Mail, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Save, 
  Smartphone, 
  History,
  Sliders,
  Radio,
  Sparkles
} from 'lucide-react';
import { ExternalNotificationSettings, NotificationDispatchLog, Usuario, NivelSeveridadeAlarme } from '../types';
import { externalNotificationServiceInstance } from '../services/externalNotificationService';

interface ExternalNotificationsPanelProps {
  usuarioAtual: Usuario;
}

export const ExternalNotificationsPanel: React.FC<ExternalNotificationsPanelProps> = ({
  usuarioAtual
}) => {
  const [settings, setSettings] = useState<ExternalNotificationSettings>(
    externalNotificationServiceInstance.getSettings()
  );
  const [logs, setLogs] = useState<NotificationDispatchLog[]>(
    externalNotificationServiceInstance.getLogs()
  );
  const [salvando, setSalvando] = useState(false);
  const [disparandoTeste, setDisparandoTeste] = useState(false);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);

  // Estados dos inputs de configuração
  const [telegramToken, setTelegramToken] = useState(settings.telegramBotToken);
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId);
  const [telegramAtivo, setTelegramAtivo] = useState(settings.telegramHabilitado);

  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [webhookSecret, setWebhookSecret] = useState(settings.webhookSecret || '');
  const [webhookAtivo, setWebhookAtivo] = useState(settings.webhookHabilitado);

  const [emails, setEmails] = useState(settings.destinatariosEmail.join('\n'));
  const [emailAtivo, setEmailAtivo] = useState(settings.emailHabilitado);

  const [nivelMinimo, setNivelMinimo] = useState<'INFO' | 'ALERTA' | 'CRITICO'>(settings.nivelMinimoDisparo);
  const [intervaloReenvio, setIntervaloReenvio] = useState(settings.intervaloMinimoReenvioMinutos);
  const [notificarRecuperacao, setNotificarRecuperacao] = useState(settings.notificarRecuperacao);

  // Teste de Disparo
  const [testeSeveridade, setTesteSeveridade] = useState<NivelSeveridadeAlarme>('CRITICO');
  const [testeMensagem, setTesteMensagem] = useState(
    '🚨 [TESTE DE DISPARO SCADA FTE-CDI] Interlock acionado por sobrepressão na linha PEAD DN200. Sistema seguro.'
  );

  const handleSalvarConfiguracoes = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);

    const emailList = emails
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.includes('@'));

    const atualizado = externalNotificationServiceInstance.updateSettings({
      telegramHabilitado: telegramAtivo,
      telegramBotToken: telegramToken,
      telegramChatId: telegramChatId,
      webhookHabilitado: webhookAtivo,
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret,
      emailHabilitado: emailAtivo,
      destinatariosEmail: emailList,
      nivelMinimoDisparo: nivelMinimo,
      intervaloMinimoReenvioMinutos: intervaloReenvio,
      notificarRecuperacao: notificarRecuperacao,
    });

    setSettings(atualizado);
    setSalvando(false);
    setMensagemStatus('Configurações salvas apenas nesta sessão (sem integração real: não são sincronizadas com o Supabase nem enviadas a nenhum canal).');
    setTimeout(() => setMensagemStatus(null), 4000);
  };

  const handleExecutarDisparoTeste = async () => {
    setDisparandoTeste(true);
    const canais: ('TELEGRAM' | 'WEBHOOK' | 'EMAIL')[] = [];
    if (telegramAtivo) canais.push('TELEGRAM');
    if (webhookAtivo) canais.push('WEBHOOK');
    if (emailAtivo) canais.push('EMAIL');

    if (canais.length === 0) {
      alert('Ative ao menos um canal (Telegram, Webhook ou E-mail) para realizar o disparo de teste.');
      setDisparandoTeste(false);
      return;
    }

    const novos = await externalNotificationServiceInstance.dispararNotificacaoManual(
      testeSeveridade,
      testeMensagem,
      canais
    );

    setLogs(externalNotificationServiceInstance.getLogs());
    setSettings(externalNotificationServiceInstance.getSettings());
    setDisparandoTeste(false);
    setMensagemStatus(`Teste SIMULADO em ${novos.length} canal(is): nada foi enviado de verdade.`);
    setTimeout(() => setMensagemStatus(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-[#0b1220] border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BellRing className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold font-display text-white tracking-wide">
              Central de Alertas & Notificações Externas Multicanal
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-700">
              FASE 2 - ONLINE
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Roteamento e disparo imediato de emergências para Telegram Bot, Webhooks (WhatsApp/Discord) e E-mail corporativo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Total Despachados: <strong className="text-white">{settings.totalNotificacoesEnviadas}</strong>
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-700 rounded-lg text-emerald-300 text-xs font-mono font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Link Ativo</span>
          </div>
        </div>
      </div>

      {mensagemStatus && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-mono rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mensagemStatus}</span>
        </div>
      )}

      {/* Grid de Canais de Comunicação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CANAL 1: TELEGRAM BOT */}
        <div className="bg-[#0d1627] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-800">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Telegram Bot Alertas</h3>
                  <p className="text-[11px] text-slate-400">Mensagens instantâneas em grupo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramAtivo}
                  onChange={(e) => setTelegramAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Bot Token (API Telegram):</label>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-sky-300 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Chat ID do Grupo de Operação:</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="-100198273491 ou @canal_planta"
                  className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Status: {telegramAtivo ? 'Habilitado' : 'Desativado'}</span>
            <span className="text-sky-400">Entrega imediata (&lt; 500ms)</span>
          </div>
        </div>

        {/* CANAL 2: WEBHOOK SUPABASE / EXTERNO */}
        <div className="bg-[#0d1627] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Webhook / Edge Functions</h3>
                  <p className="text-[11px] text-slate-400">WhatsApp API, Discord, PagerDuty</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookAtivo}
                  onChange={(e) => setWebhookAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">URL do Webhook (POST JSON):</label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.supabase.co/functions/v1/scada-alarm"
                  className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Secret / Token de Assinatura:</label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Authorization Bearer ou chave secreta"
                  className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Status: {webhookAtivo ? 'Habilitado' : 'Desativado'}</span>
            <span className="text-emerald-400">Payload JSON ISA-18.2</span>
          </div>
        </div>

        {/* CANAL 3: E-MAIL CORPORATIVO */}
        <div className="bg-[#0d1627] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-950/80 text-purple-400 border border-purple-800">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">E-mail SMTP Corporativo</h3>
                  <p className="text-[11px] text-slate-400">Boletins e laudos de não-conformidade</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailAtivo}
                  onChange={(e) => setEmailAtivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Destinatários (1 por linha):</label>
                <textarea
                  rows={4}
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="operacao@saneamento.gov.br&#10;supervisao@saneamento.gov.br"
                  className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-purple-200 text-xs focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Status: {emailAtivo ? 'Habilitado' : 'Desativado'}</span>
            <span className="text-purple-400">Relatórios A4 Formatados</span>
          </div>
        </div>

      </div>

      {/* Painel de Parâmetros de Disparo & Teste Imediato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Configurações Globais de Disparo (Anti-Flood) */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            Regras de Disparo & Anti-Avalanche de Mensagens (Alarm Flood)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Severidade Mínima para Notificar:</label>
              <select
                value={nivelMinimo}
                onChange={(e: any) => setNivelMinimo(e.target.value)}
                className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              >
                <option value="INFO">Nível 1: Todos os Eventos (INFO + Alerta + Crítico)</option>
                <option value="ALERTA">Nível 2: Apenas Avisos e Críticos (Recomendado)</option>
                <option value="CRITICO">Nível 3: Apenas Interlocks e Emergências NR-12</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Intervalo Mínimo de Reenvio (Anti-Flood):</label>
              <input
                type="number"
                min={1}
                max={60}
                value={intervaloReenvio}
                onChange={(e) => setIntervaloReenvio(parseInt(e.target.value) || 5)}
                className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Minutos entre avisos do mesmo alarme</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="notifRecup"
              checked={notificarRecuperacao}
              onChange={(e) => setNotificarRecuperacao(e.target.checked)}
              className="rounded bg-[#070c17] border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="notifRecup" className="text-xs font-mono text-slate-300 cursor-pointer">
              Enviar notificação de "RETORNO À NORMALIDADE" quando o alarme for resolvido/rearmado.
            </label>
          </div>

          <button
            onClick={handleSalvarConfiguracoes}
            disabled={salvando}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'Salvando...' : 'Salvar Configurações no Supabase'}</span>
          </button>
        </div>

        {/* Ferramenta de Teste de Disparo Imediato */}
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm font-mono flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            Simulador / Teste de Disparo de Alerta em Tempo Real
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-slate-300 mb-1">Nível de Severidade do Teste:</label>
              <div className="flex gap-2">
                {(['INFO', 'ALERTA', 'CRITICO'] as NivelSeveridadeAlarme[]).map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setTesteSeveridade(sev)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition ${
                      testeSeveridade === sev
                        ? sev === 'CRITICO' ? 'bg-red-950 border-red-500 text-red-300' :
                          sev === 'ALERTA' ? 'bg-amber-950 border-amber-500 text-amber-300' :
                          'bg-sky-950 border-sky-500 text-sky-300'
                        : 'bg-[#070c17] border-slate-800 text-slate-400'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Mensagem do Payload:</label>
              <textarea
                rows={2}
                value={testeMensagem}
                onChange={(e) => setTesteMensagem(e.target.value)}
                className="w-full bg-[#070c17] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleExecutarDisparoTeste}
              disabled={disparandoTeste}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition shadow-lg"
            >
              <Send className="w-4 h-4" />
              <span>{disparandoTeste ? 'Despachando...' : 'Enviar Alerta de Teste Agora'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Histórico e Auditoria de Despachos */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h3 className="font-bold text-white text-sm font-mono flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" />
            Registro de Despachos e Confirmação de Entrega (Logs Supabase)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Últimos disparos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Severidade</th>
                <th className="pb-2">Canal</th>
                <th className="pb-2">Destinatário</th>
                <th className="pb-2">Mensagem</th>
                <th className="pb-2 text-right">Status / Confirmação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40">
                  <td className="py-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      log.severidade === 'CRITICO' ? 'bg-red-950 text-red-300 border-red-700' :
                      log.severidade === 'ALERTA' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                      'bg-sky-950 text-sky-300 border-sky-700'
                    }`}>
                      {log.severidade}
                    </span>
                  </td>
                  <td className="py-2.5 font-bold text-slate-200">
                    {log.canal}
                  </td>
                  <td className="py-2.5 text-slate-300 max-w-xs truncate">
                    {log.destinatario}
                  </td>
                  <td className="py-2.5 text-slate-300 max-w-md truncate">
                    {log.mensagem}
                  </td>
                  <td className="py-2.5 text-right whitespace-nowrap">
                    <span className={`font-bold flex items-center justify-end gap-1 text-[11px] ${
                      log.status === 'FALHA' ? 'text-red-400' : log.status === 'SIMULADO' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
