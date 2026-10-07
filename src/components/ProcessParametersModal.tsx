/**
 * Modal de Configuração de Parâmetros de Processo FTE-CDI
 * Restrito estritamente a usuários com credencial ENGENHEIRO.
 * Protege os limites estruturais do rack de 16 células (180 m³/h).
 */

import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Lock, 
  Zap, 
  Flame, 
  Info,
  Scale
} from 'lucide-react';
import { ParametrosProcesso, Usuario } from '../types';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';

interface ProcessParametersModalProps {
  usuarioAtual: Usuario;
  onFechar: () => void;
  onAtualizar: () => void;
}

export const ProcessParametersModal: React.FC<ProcessParametersModalProps> = ({
  usuarioAtual,
  onFechar,
  onAtualizar
}) => {
  const [params, setParams] = useState<ParametrosProcesso>({ ...controllerV2Instance.parametros });
  const [mensagem, setMensagem] = useState<{ tipo: 'SUCESSO' | 'ERRO'; texto: string } | null>(null);

  const isEngenheiro = usuarioAtual.nivel_acesso === 'ENGENHEIRO';

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem(null);

    if (!isEngenheiro) {
      setMensagem({
        tipo: 'ERRO',
        texto: 'ACESSO NEGADO: Apenas usuários de nível ENGENHEIRO possuem privilégio para alterar parâmetros de engenharia.'
      });
      return;
    }

    if ((params.corteInterlockPressaoBar ?? 0) > 2.80) {
      setMensagem({
        tipo: 'ERRO',
        texto: 'LIMITE DE SEGURANÇA VIOLADO: O corte de interlock deve ser no máximo 2,80 bar para manter histerese de segurança abaixo do limite estrutural de 3,00 bar do PEAD.'
      });
      return;
    }

    const res = controllerV2Instance.atualizarParametrosProcesso(params, usuarioAtual);
    if (res.sucesso) {
      setMensagem({ tipo: 'SUCESSO', texto: res.mensagem });
      onAtualizar();
      setTimeout(() => onFechar(), 1200);
    } else {
      setMensagem({ tipo: 'ERRO', texto: res.mensagem });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-sky-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Parâmetros de Processo & Segurança (Engenharia)
              </h2>
              <p className="text-xs text-slate-400">
                Configuração global do Rack de 16 Células (180 m³/h - 50 L/s). Acesso restrito a ENGENHEIRO.
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {mensagem && (
          <div className={`p-3 rounded-lg text-xs font-mono border flex items-center justify-between ${
            mensagem.tipo === 'SUCESSO' 
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
              : 'bg-red-950/80 border-red-500 text-red-300'
          }`}>
            <span>{mensagem.texto}</span>
            <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {!isEngenheiro && (
          <div className="p-3 bg-amber-950/60 border border-amber-500 rounded-lg text-xs font-mono text-amber-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Você está logado como <strong>{usuarioAtual.nome}</strong> ({usuarioAtual.nivel_acesso}). Campos em modo apenas leitura.</span>
          </div>
        )}

        <form onSubmit={handleSalvar} className="space-y-4">
          {/* Seção 1: Pressão e Histerese Real */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Segurança Estrutural e Histerese de Pressão (PEAD)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Limite de Corte Físico Interlock (bar):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="2.80"
                  disabled={!isEngenheiro}
                  value={params.corteInterlockPressaoBar}
                  onChange={(e) => setParams({ ...params, corteInterlockPressaoBar: parseFloat(e.target.value) || 2.80 })}
                  className="w-full bg-[#101726] border border-slate-700 rounded-lg p-2.5 text-white focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500">Máximo permitido: 2,80 bar (Limite estrutural: 3,00 bar)</span>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Alerta Amarelo de Sobrepressão (bar):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="2.70"
                  disabled={!isEngenheiro}
                  value={params.alertaPressaoAltaBar}
                  onChange={(e) => setParams({ ...params, alertaPressaoAltaBar: parseFloat(e.target.value) || 2.50 })}
                  className="w-full bg-[#101726] border border-slate-700 rounded-lg p-2.5 text-white focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500">Aviso prévio antes do disparo</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Breakthrough e Ciclos Eletroquímicos */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Máquina de Estados de Breakthrough e Eletroadsorção
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Razão Breakthrough (F_out / F_in):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.50"
                  max="0.99"
                  disabled={!isEngenheiro}
                  value={params.razaoBreakthroughLimite}
                  onChange={(e) => setParams({ ...params, razaoBreakthroughLimite: parseFloat(e.target.value) || 0.90 })}
                  className="w-full bg-[#101726] border border-slate-700 rounded-lg p-2.5 text-white focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500">Padrão: 0,90 (90%)</span>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Debounce de Leituras Consecutivas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  disabled={!isEngenheiro}
                  value={params.debounceLeiturasConsecutivas}
                  onChange={(e) => setParams({ ...params, debounceLeiturasConsecutivas: parseInt(e.target.value) || 3 })}
                  className="w-full bg-[#101726] border border-slate-700 rounded-lg p-2.5 text-white focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500">Padrão: 3 scans</span>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Timeout Adsorção (min):
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  disabled={!isEngenheiro}
                  value={params.timeoutAdsorcaoMinutos}
                  onChange={(e) => setParams({ ...params, timeoutAdsorcaoMinutos: parseInt(e.target.value) || 30 })}
                  className="w-full bg-[#101726] border border-slate-700 rounded-lg p-2.5 text-white focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500">Critério de segurança: 30 min</span>
              </div>
            </div>
          </div>

          {/* Seção 3: Reversão de Polaridade Periódica com Aviso de Bancada Ru-Ir */}
          <div className="p-4 rounded-xl bg-[#0a0f1d] border border-purple-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-purple-400" />
                Reversão Periódica de Polaridade (Opcional)
              </span>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isEngenheiro}
                  checked={params.reversaoPolaridadeHabilitada}
                  onChange={(e) => setParams({ ...params, reversaoPolaridadeHabilitada: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-lg text-xs font-mono text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>AVISO MANDATÓRIO DE ENGENHARIA:</strong> O cátodo é fabricado em malha de Titânio Grau 2 com revestimento catalítico de Ru-Ir. A reversão de polaridade coloca o revestimento sob potencial oxidante. <strong>Manter desabilitado</strong> até validação conclusiva em bancada.
              </p>
            </div>
          </div>

          {/* Footer com Botões */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">
              Engenheiro responsável: <strong className="text-white">{usuarioAtual.nome}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onFechar}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
              >
                Fechar
              </button>

              {isEngenheiro && (
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition"
                >
                  <Save className="w-4 h-4" />
                  Salvar Parâmetros
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
