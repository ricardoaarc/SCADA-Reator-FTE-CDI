/**
 * Painel de Monitoramento Remoto e Serviço de Notificações (Push e E-mail)
 * Reator FTE-CDI - Rack 10 Células
 * Inclui Painel de Preview de Envio de E-mails via Mock API
 */

import React, { useState } from 'react';
import { 
  Bell, 
  Mail, 
  Send, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Clock, 
  Radio, 
  Trash2, 
  FileText, 
  Check, 
  X,
  ShieldAlert,
  Copy,
  Code,
  Eye,
  Server,
  Zap,
  Loader2,
  Terminal
} from 'lucide-react';
import { AlertaNotificacao, NotificationConfig, EmailApiMockResponse } from '../types';
import { notificationService } from '../services/NotificationService';

interface NotificationPanelProps {
  historicoAlertas: AlertaNotificacao[];
  config: NotificationConfig;
  ultimoEmailMock?: EmailApiMockResponse | null;
  onAtualizarConfig: (parcial: Partial<NotificationConfig>) => void;
  onAdicionarEmail: (email: string) => boolean;
  onRemoverEmail: (email: string) => void;
  onLimparHistorico: () => void;
  onDispararTeste: () => void;
  onSimularEnvioEmailApi?: (params?: {
    motivo?: string;
    pressaoBar?: number;
    vazaoLh?: number;
    tensaoV?: number;
    correnteA?: number;
    celulasComprometidas?: number[];
    destinatarios?: string[];
    provedor?: string;
  }) => Promise<EmailApiMockResponse>;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  historicoAlertas,
  config,
  ultimoEmailMock,
  onAtualizarConfig,
  onAdicionarEmail,
  onRemoverEmail,
  onLimparHistorico,
  onDispararTeste,
  onSimularEnvioEmailApi,
}) => {
  const [novoEmailInput, setNovoEmailInput] = useState('');
  const [emailErro, setEmailErro] = useState<string | null>(null);
  const [alertaSelecionado, setAlertaSelecionado] = useState<AlertaNotificacao | null>(null);
  const [testeSucesso, setTesteSucesso] = useState<boolean>(false);
  const [activePreviewFormat, setActivePreviewFormat] = useState<'HTML' | 'TEXT' | 'JSON'>('HTML');
  const [isSimulandoApi, setIsSimulandoApi] = useState<boolean>(false);
  const [copiadoFeedback, setCopiadoFeedback] = useState<boolean>(false);
  const [mockSucessoMsg, setMockSucessoMsg] = useState<string | null>(null);

  const mockAtual: EmailApiMockResponse | null = ultimoEmailMock || notificationService.getUltimoEmailMock();
  const permissaoPush = notificationService.getStatusPermissaoPush();

  const handleSolicitarPush = async () => {
    const res = await notificationService.solicitarPermissaoPush();
    if (res === 'granted') {
      onAtualizarConfig({ pushHabilitado: true });
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoEmailInput.trim()) return;

    const ok = onAdicionarEmail(novoEmailInput);
    if (ok) {
      setNovoEmailInput('');
      setEmailErro(null);
    } else {
      setEmailErro('E-mail inválido ou já cadastrado na lista.');
    }
  };

  const handleExecutarTeste = () => {
    onDispararTeste();
    setTesteSucesso(true);
    setTimeout(() => setTesteSucesso(false), 4000);
  };

  const handleDispararMockApi = async (cenario: 'SOBREPRESSAO' | 'FOULING' | 'ESTOP') => {
    setIsSimulandoApi(true);
    setMockSucessoMsg(null);

    let params: {
      motivo: string;
      pressaoBar: number;
      vazaoLh: number;
      tensaoV: number;
      correnteA: number;
      celulasComprometidas: number[];
      provedor: string;
    };

    if (cenario === 'SOBREPRESSAO') {
      params = {
        motivo: 'Sobrepressão Crítica > 3.0 bar na Base Plenum PEAD (Alívio Imediato Obrigatório)',
        pressaoBar: 3.28,
        vazaoLh: 0,
        tensaoV: 0,
        correnteA: 0,
        celulasComprometidas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        provedor: 'API Gateway SMTP (Resend / AWS SES Mock)',
      };
    } else if (cenario === 'FOULING') {
      params = {
        motivo: 'Bloqueio Hidráulico / Fouling Severo em Feltro de Grafite e Malha Ru-Ir (Vazão < 500 L/h)',
        pressaoBar: 2.85,
        vazaoLh: 360,
        tensaoV: 1.2,
        correnteA: 19.4,
        celulasComprometidas: [2, 5, 8],
        provedor: 'API Gateway SMTP (SendGrid / Mandrill Mock)',
      };
    } else {
      params = {
        motivo: 'Parada de Emergência (E-STOP) Acionada na Botoeira Física da IHM',
        pressaoBar: 1.10,
        vazaoLh: 0,
        tensaoV: 0,
        correnteA: 0,
        celulasComprometidas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        provedor: 'API Gateway SMTP (Resend Mock)',
      };
    }

    try {
      if (onSimularEnvioEmailApi) {
        await onSimularEnvioEmailApi(params);
      } else {
        await notificationService.simularEnvioEmailApi(params);
      }
      setMockSucessoMsg(`E-mail despachado via API com sucesso! Código HTTP 200 retornado pelo provedor mock.`);
      setTimeout(() => setMockSucessoMsg(null), 5000);
    } finally {
      setIsSimulandoApi(false);
    }
  };

  const handleCopiarConteudo = (texto: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(texto);
      setCopiadoFeedback(true);
      setTimeout(() => setCopiadoFeedback(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Monitoramento Ativo */}
      <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white font-display">
                Serviço de Notificação & Monitoramento Remoto
              </h2>
              <span className="text-xs font-mono uppercase bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded">
                Tempo Real (CLP Integrado)
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] max-w-2xl leading-relaxed">
              Dispara alertas automáticos instantâneos via <strong>Notificação Push no Navegador</strong> e{' '}
              <strong>E-mail Técnico</strong> no momento exato em que qualquer interlock crítico (sobrepressão &gt; 3.0 bar, fouling severo ou E-stop) desarmar o relé da bomba de alimentação.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="btn-testar-notificacao"
              onClick={handleExecutarTeste}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              Disparar Alerta Geral de Teste
            </button>
          </div>
        </div>

        {testeSucesso && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-lg text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Alerta Remoto Disparado com Sucesso!</strong> Notificação Push enviada ao navegador e mensagem de e-mail registrada no log de auditoria.
              </span>
            </div>
            <button
              onClick={() => setTesteSucesso(false)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* NOVO PAINEL DE PREVIEW: Disparo de E-mails via API (Mock) */}
      <div id="painel-preview-email-api" className="bg-[#151b2b] border-2 border-sky-500/30 rounded-xl p-5 shadow-xl relative">
        {/* Cabeçalho do Painel de Preview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-600/40 text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Painel de Preview: Disparo de E-mails via API (Mock)
                </h3>
                {mockAtual && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    HTTP {mockAtual.statusCode} OK
                  </span>
                )}
              </div>
              <span className="text-xs text-[#94a3b8]">
                Simulação de envio transacional HTTP via API externa com exibição da mensagem técnica formatada.
              </span>
            </div>
          </div>

          {/* Seletor de Formato do Preview (HTML Renderizado / Texto Puro / JSON Payload) */}
          <div className="flex items-center gap-1 bg-[#0a0e17] p-1 rounded-lg border border-[#1e293b] self-start md:self-auto">
            <button
              onClick={() => setActivePreviewFormat('HTML')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                activePreviewFormat === 'HTML'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              E-mail Renderizado (HTML)
            </button>
            <button
              onClick={() => setActivePreviewFormat('TEXT')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                activePreviewFormat === 'TEXT'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Texto Puro (ASCII)
            </button>
            <button
              onClick={() => setActivePreviewFormat('JSON')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
                activePreviewFormat === 'JSON'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Payload API (JSON)
            </button>
          </div>
        </div>

        {/* Barra de Ações Rápidas de Simulação de Disparo via API */}
        <div className="bg-[#0f1422] border border-[#1e293b] rounded-lg p-3 mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-xs text-slate-300 font-semibold">
              Simular Disparo via API:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-mock-sobrepressao"
                disabled={isSimulandoApi}
                onClick={() => handleDispararMockApi('SOBREPRESSAO')}
                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 text-xs font-medium rounded flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Sobrepressão &gt; 3.0 bar
              </button>
              <button
                id="btn-mock-fouling"
                disabled={isSimulandoApi}
                onClick={() => handleDispararMockApi('FOULING')}
                className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-medium rounded flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Fouling Hidráulico
              </button>
              <button
                id="btn-mock-estop"
                disabled={isSimulandoApi}
                onClick={() => handleDispararMockApi('ESTOP')}
                className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-medium rounded flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                E-Stop Manual
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSimulandoApi && (
              <span className="text-xs text-sky-300 flex items-center gap-1.5 font-mono animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Despachando payload para endpoint SMTP...
              </span>
            )}
            {mockAtual && (
              <button
                onClick={() => handleCopiarConteudo(
                  activePreviewFormat === 'HTML'
                    ? mockAtual.dadosEnvio.corpoHtml
                    : activePreviewFormat === 'TEXT'
                    ? mockAtual.dadosEnvio.corpoTexto
                    : JSON.stringify(mockAtual, null, 2)
                )}
                className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs rounded border border-[#334155] flex items-center gap-1 transition"
                title="Copiar conteúdo exibido"
              >
                {copiadoFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoFeedback ? 'Copiado!' : 'Copiar Conteúdo'}
              </button>
            )}
          </div>
        </div>

        {mockSucessoMsg && (
          <div className="mb-4 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mockSucessoMsg}</span>
          </div>
        )}

        {/* Metadados Técnicos do Mock da API (Endpoint, Message-ID, Headers) */}
        {mockAtual && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-2.5 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-xs font-mono text-[#94a3b8]">
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase">Message-ID (API):</span>
              <span className="text-sky-300 font-bold truncate block">{mockAtual.messageId}</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase">Provedor / Gateway:</span>
              <span className="text-slate-200 truncate block">{mockAtual.provedor}</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase">Latência de Envio:</span>
              <span className="text-emerald-400 font-bold block">{mockAtual.tempoRespostaMs} ms</span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] uppercase">Data / Carimbo:</span>
              <span className="text-slate-300 truncate block">
                {new Date(mockAtual.timestamp).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Quadro Central do Conteúdo da Mensagem Formatada */}
        <div className="bg-[#0a0e17] border border-[#1e293b] rounded-lg overflow-hidden">
          {/* Cabeçalho do Cliente de E-mail */}
          {mockAtual && (
            <div className="bg-[#0f1422] p-3 border-b border-[#1e293b] text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#64748b]">Remetente:</span>{' '}
                  <span className="text-slate-200">{mockAtual.dadosEnvio.remetente}</span>
                </div>
                <span className="text-[10px] text-sky-400 font-sans px-2 py-0.5 bg-sky-950/60 rounded border border-sky-800/40">
                  SMTP Mock Transport
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Para:</span>{' '}
                <span className="text-emerald-400 font-bold">
                  {mockAtual.dadosEnvio.destinatarios.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Assunto:</span>{' '}
                <span className="text-red-400 font-bold">{mockAtual.dadosEnvio.assunto}</span>
              </div>
            </div>
          )}

          {/* Exibição em Abas do Formato Selecionado */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {mockAtual ? (
              <>
                {/* 1. Modo HTML Renderizado */}
                {activePreviewFormat === 'HTML' && (
                  <div
                    className="prose prose-invert max-w-none text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: mockAtual.dadosEnvio.corpoHtml }}
                  />
                )}

                {/* 2. Modo Texto Puro (ASCII) */}
                {activePreviewFormat === 'TEXT' && (
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed select-text bg-[#0a0e17] p-3 rounded border border-[#1e293b]">
                    {mockAtual.dadosEnvio.corpoTexto}
                  </pre>
                )}

                {/* 3. Modo JSON do Payload da API */}
                {activePreviewFormat === 'JSON' && (
                  <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap leading-normal bg-[#0a0e17] p-3 rounded border border-[#1e293b] overflow-x-auto">
                    {JSON.stringify({
                      request: {
                        method: 'POST',
                        url: mockAtual.endpoint,
                        headers: mockAtual.dadosEnvio.headers,
                        body: {
                          from: mockAtual.dadosEnvio.remetente,
                          to: mockAtual.dadosEnvio.destinatarios,
                          subject: mockAtual.dadosEnvio.assunto,
                          html: '[HTML_STRING_CONTENT]',
                          text: mockAtual.dadosEnvio.corpoTexto.substring(0, 160) + '...',
                        },
                      },
                      response: {
                        status: mockAtual.statusCode,
                        messageId: mockAtual.messageId,
                        latencyMs: mockAtual.tempoRespostaMs,
                        provider: mockAtual.provedor,
                        timestamp: mockAtual.timestamp,
                      },
                    }, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-xs text-[#64748b]">
                Nenhum e-mail formatado disponível no momento. Clique nos botões acima para simular um disparo via API.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Configuração dos Canais Remotos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canal 1: Notificações Push (Web Push) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-950/70 border border-sky-800/40 text-sky-400">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Notificações Push</h3>
                  <span className="text-[11px] text-[#94a3b8]">Web Push / Desktop & Celular</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.pushHabilitado}
                  onChange={(e) => onAtualizarConfig({ pushHabilitado: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            <p className="text-xs text-[#94a3b8] mb-3 leading-normal">
              Exibe banner do sistema operacional e do navegador mesmo com a aba em segundo plano quando ocorrer corte de segurança.
            </p>

            <div className="p-2.5 rounded-lg bg-[#0a0e17] border border-[#1e293b] text-xs space-y-1.5 font-mono mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Permissão SO:</span>
                <span className={`font-semibold ${
                  permissaoPush === 'granted' ? 'text-emerald-400' :
                  permissaoPush === 'denied' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {permissaoPush === 'granted' ? 'CONCEDIDA' : permissaoPush === 'denied' ? 'BLOQUEADA' : 'PENDENTE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">API Suportada:</span>
                <span className="text-emerald-400">Sim (Notification API)</span>
              </div>
            </div>
          </div>

          {permissaoPush !== 'granted' && (
            <button
              onClick={handleSolicitarPush}
              className="w-full mt-2 py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-700/60 text-sky-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Bell className="w-3.5 h-3.5" />
              Habilitar Notificações no Navegador
            </button>
          )}
        </div>

        {/* Canal 2: Alertas de E-mail */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/40 text-emerald-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Alertas por E-mail</h3>
                  <span className="text-[11px] text-[#94a3b8]">Relatório Técnico Automático</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.emailHabilitado}
                  onChange={(e) => onAtualizarConfig({ emailHabilitado: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <p className="text-xs text-[#94a3b8] mb-3 leading-normal">
              Envia e-mail formatado contendo telemetria da pressão, vazão, estado do relé e ações corretivas.
            </p>

            {/* Lista de Destinatários Configurados */}
            <div className="space-y-1.5 max-h-28 overflow-y-auto mb-3">
              {config.destinatariosEmail.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-2.5 py-1 rounded bg-[#0a0e17] border border-[#1e293b] text-xs font-mono"
                >
                  <span className="text-slate-200 truncate">{email}</span>
                  {config.destinatariosEmail.length > 1 && (
                    <button
                      onClick={() => onRemoverEmail(email)}
                      className="text-[#64748b] hover:text-red-400 ml-2"
                      title="Remover destinatário"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar Novo E-mail */}
          <form onSubmit={handleAddEmail} className="mt-2">
            <div className="flex gap-1.5">
              <input
                type="email"
                placeholder="novo.engenheiro@planta.com"
                value={novoEmailInput}
                onChange={(e) => setNovoEmailInput(e.target.value)}
                className="flex-1 bg-[#0a0e17] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded text-xs font-semibold"
              >
                +
              </button>
            </div>
            {emailErro && <p className="text-[10px] text-red-400 mt-1">{emailErro}</p>}
          </form>
        </div>

        {/* Canal 3: Sirene SCADA & Webhook */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-800/40 text-amber-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Sirene Sonora & Webhook</h3>
                  <span className="text-[11px] text-[#94a3b8]">Alarme Acústico e Integração</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.somSireneHabilitado}
                  onChange={(e) => onAtualizarConfig({ somSireneHabilitado: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            <p className="text-xs text-[#94a3b8] mb-3 leading-normal">
              Sirene acústica industrial sintetizada via Web Audio API durante eventos críticos na sala de controle e integração externa.
            </p>

            <div className="p-2.5 rounded-lg bg-[#0a0e17] border border-[#1e293b] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Sirene Sala de Controle:</span>
                <span className={config.somSireneHabilitado ? 'text-amber-400 font-semibold' : 'text-[#64748b]'}>
                  {config.somSireneHabilitado ? 'ATIVA (850-1250 Hz)' : 'DESATIVADA'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Anti-Flood Cooldown:</span>
                <span className="font-mono text-slate-300">{config.cooldownSegundos}s</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[#1e293b]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#94a3b8] flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Endpoint Webhook Remoto
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">REST JSON</span>
            </div>
            <input
              type="text"
              value={config.webhookUrl}
              onChange={(e) => onAtualizarConfig({ webhookUrl: e.target.value })}
              className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2 py-1 text-[11px] font-mono text-slate-300"
              placeholder="https://sua-planta.com/api/alerta"
            />
          </div>
        </div>
      </div>

      {/* Histórico e Auditoria dos Envios de Alerta */}
      <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1e293b]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Auditoria de Despachos Remotos ({historicoAlertas.length} registros)
            </h3>
          </div>
          {historicoAlertas.length > 0 && (
            <button
              onClick={onLimparHistorico}
              className="text-xs text-[#94a3b8] hover:text-red-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Histórico
            </button>
          )}
        </div>

        {historicoAlertas.length === 0 ? (
          <div className="text-center py-10 text-[#64748b] text-xs">
            Nenhum alerta remoto disparado até o momento. Utilize os botões do{' '}
            <strong className="text-sky-400">"Painel de Preview"</strong> acima ou simule uma sobrepressão de 3.25 bar na bancada de testes.
          </div>
        ) : (
          <div className="space-y-3">
            {historicoAlertas.map((alerta) => {
              const dataFmt = new Date(alerta.timestamp).toLocaleString('pt-BR');
              const isSobrepressao = alerta.pressaoBar >= 3.0;

              return (
                <div
                  key={alerta.id}
                  className={`p-3.5 rounded-lg border transition ${
                    isSobrepressao
                      ? 'bg-red-950/20 border-red-500/40 hover:border-red-500/80'
                      : 'bg-[#0f1422] border-[#1e293b] hover:border-sky-500/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span className="text-xs font-mono font-bold text-red-300">
                        {alerta.id}
                      </span>
                      <span className="text-[11px] text-[#64748b] font-mono">
                        {dataFmt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {alerta.canaisDisparados.map((canal) => (
                        <span
                          key={canal}
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#1e293b] text-sky-300 border border-[#334155]"
                        >
                          {canal === 'PUSH' ? '📱 Web Push' : canal === 'EMAIL' ? '✉️ E-mail' : canal === 'SIREN' ? '🔊 Sirene' : '🌐 Webhook'}
                        </span>
                      ))}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        alerta.statusEnvio === 'FALHA'
                          ? 'bg-red-950 text-red-300 border-red-700'
                          : alerta.statusEnvio === 'BLOQUEADO_NAVEGADOR'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      }`}>
                        {alerta.statusEnvio}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-200 font-semibold mb-2">
                    {alerta.interlockMotivo}
                  </div>
                  {alerta.falhaEntrega && (
                    <div className="text-[11px] text-red-300 font-mono mb-2">{alerta.falhaEntrega}</div>
                  )}

                  {/* Telemetria do Instante da Falha */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 rounded bg-[#0a0e17] border border-[#1e293b] text-[11px] font-mono text-[#94a3b8] mb-3">
                    <div>
                      <span>Pressão no Corte:</span>
                      <strong className={`block ${alerta.pressaoBar >= 3.0 ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                        {alerta.pressaoBar.toFixed(2)} bar
                      </strong>
                    </div>
                    <div>
                      <span>Vazão:</span>
                      <strong className="block text-slate-200">{alerta.vazaoLh.toFixed(1)} L/h</strong>
                    </div>
                    <div>
                      <span>Tensão:</span>
                      <strong className="block text-slate-200">{alerta.tensaoV.toFixed(2)} V</strong>
                    </div>
                    <div>
                      <span>Relé da Bomba:</span>
                      <strong className="block text-red-400 font-bold">DESARMADO</strong>
                    </div>
                  </div>

                  {/* Destinatários e Ações */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-2 border-t border-[#1e293b]">
                    <div className="text-[11px] text-[#94a3b8]">
                      <span>Enviado para: </span>
                      <strong className="text-slate-200 font-mono">
                        {alerta.destinatariosEmail.join(', ')}
                      </strong>
                    </div>

                    <button
                      onClick={() => setAlertaSelecionado(alerta)}
                      className="px-3 py-1 bg-sky-950/70 hover:bg-sky-900 border border-sky-700/50 text-sky-200 rounded text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Visualizar E-mail Enviado
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Pré-visualização do E-mail Enviado da Auditoria */}
      {alertaSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#151b2b] border border-[#334155] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header do Modal */}
            <div className="p-4 bg-[#0a0e17] border-b border-[#1e293b] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cópia Autêntica do E-mail Despachado
                </h3>
              </div>
              <button
                onClick={() => setAlertaSelecionado(null)}
                className="text-[#94a3b8] hover:text-white p-1 rounded hover:bg-[#1e293b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadados SMTP */}
            <div className="p-4 border-b border-[#1e293b] bg-[#0f1422] text-xs font-mono space-y-1.5 text-[#94a3b8]">
              <div>
                <span className="text-[#64748b]">De:</span>{' '}
                <span className="text-slate-200">{alertaSelecionado.emailPreview.remetente}</span>
              </div>
              <div>
                <span className="text-[#64748b]">Para:</span>{' '}
                <span className="text-emerald-400 font-bold">
                  {alertaSelecionado.destinatariosEmail.join(', ')}
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Assunto:</span>{' '}
                <span className="text-red-400 font-bold">
                  {alertaSelecionado.emailPreview.assunto}
                </span>
              </div>
              <div>
                <span className="text-[#64748b]">Data/Hora Envio:</span>{' '}
                <span className="text-slate-300">
                  {new Date(alertaSelecionado.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Conteúdo HTML do E-mail Renderizado */}
            <div className="p-4 overflow-y-auto flex-1 bg-[#0a0e17]">
              <div
                className="prose prose-invert max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: alertaSelecionado.emailPreview.corpoHtml }}
              />
            </div>

            {/* Rodapé do Modal */}
            <div className="p-3 bg-[#0f1422] border-t border-[#1e293b] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#64748b] font-mono">
                Log ID: {alertaSelecionado.id}
              </span>
              <button
                onClick={() => setAlertaSelecionado(null)}
                className="px-4 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs font-semibold"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
