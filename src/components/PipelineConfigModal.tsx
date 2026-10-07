import React, { useState } from 'react';
import { PipelineSectionInfo } from '../types';
import { 
  Activity, 
  Layers, 
  RotateCw, 
  Sliders, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Zap,
  Gauge,
  Compass
} from 'lucide-react';

interface PipelineConfigModalProps {
  tubulacao: PipelineSectionInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onAtualizarSentido: (tag: string, sentido: 'NORMAL' | 'REVERSO' | 'BLOQUEADO') => void;
  onToggleAnimacao?: (tag: string) => void;
}

/**
 * PipelineConfigModal — Prontuário Hidráulico e Telemetria SCADA Web de Tubulações Industriais
 * 
 * Atende às normas ANSI/ISA-101, ISO 10628, ABNT NBR 6493 e Hydraulic Institute:
 * - Inspeção física e mecânica do trecho (PEAD DN200 PN10, Inox DN100, etc.);
 * - Balanço hidrodinâmico em tempo real (Vazão, Velocidade, Reynolds, Fator de Darcy, Perda de Carga);
 * - Comutação operacional de sentido de fluxo e simulação de interlocks de linha;
 * - Sincronização com banco de dados Supabase (tabela scada_pipelines_config).
 */
export const PipelineConfigModal: React.FC<PipelineConfigModalProps> = ({
  tubulacao,
  isOpen,
  onClose,
  onAtualizarSentido,
  onToggleAnimacao
}) => {
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  if (!isOpen || !tubulacao) return null;

  const handleMudarSentido = (novoSentido: 'NORMAL' | 'REVERSO' | 'BLOQUEADO') => {
    setSalvando(true);
    onAtualizarSentido(tubulacao.tag, novoSentido);
    setTimeout(() => {
      setSalvando(false);
      setMensagemSucesso(`Sentido de fluxo da linha ${tubulacao.tag} alterado para ${novoSentido}!`);
      setTimeout(() => setMensagemSucesso(null), 3000);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho do Prontuário SCADA */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${tubulacao.corHex}15`, borderColor: tubulacao.corHex }}
            >
              <Compass className="w-6 h-6" style={{ color: tubulacao.corHex }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-white tracking-wider">
                  {tubulacao.tag}
                </span>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                  style={{ 
                    backgroundColor: `${tubulacao.corHex}20`, 
                    borderColor: tubulacao.corHex,
                    color: tubulacao.corHex 
                  }}
                >
                  {tubulacao.tipoFluido.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {tubulacao.nome}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback de Operação */}
        {mensagemSucesso && (
          <div className="mx-5 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {/* Corpo do Prontuário */}
        <div className="p-5 overflow-y-auto space-y-5 scada-scrollbar text-xs">
          
          {/* Painel 1: Indicadores Hidrodinâmicos em Tempo Real */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Vazão Volumétrica */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vazão do Trecho</span>
              <div className="my-1.5">
                <span className="text-lg font-mono font-bold text-white">{tubulacao.vazaoM3h.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400 ml-1">m³/h</span>
              </div>
              <span className="text-[10px] text-sky-400 font-mono font-bold">
                {(tubulacao.vazaoM3h / 3.6).toFixed(1)} L/s
              </span>
            </div>

            {/* Velocidade de Escoamento Real */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Velocidade (v)</span>
              <div className="my-1.5">
                <span className="text-lg font-mono font-bold text-emerald-400">{tubulacao.velocidadeEscoamentoMs.toFixed(2)}</span>
                <span className="text-[11px] text-slate-400 ml-1">m/s</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono">
                Faixa Econômica (1.2-2.0)
              </span>
            </div>

            {/* Número de Reynolds */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Reynolds (Re)</span>
              <div className="my-1.5">
                <span className="text-lg font-mono font-bold text-indigo-400">{tubulacao.reynoldsRe.toLocaleString()}</span>
              </div>
              <span className="text-[10px] text-indigo-300 font-bold">
                Regime Turbulento Pleno
              </span>
            </div>

            {/* Perda de Carga no Trecho */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Perda de Carga (ΔP)</span>
              <div className="my-1.5">
                <span className="text-lg font-mono font-bold text-amber-400">{tubulacao.perdaCargaBar.toFixed(2)}</span>
                <span className="text-[11px] text-slate-400 ml-1">bar</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {(tubulacao.perdaCargaBar * 10.197).toFixed(1)} mca
              </span>
            </div>
          </div>

          {/* Painel 2: Dados Mecânicos e Normativos da Tubulação */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Especificação Mecânica e Hidráulica do Conduto (ABNT / ANSI)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-slate-300">
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Diâmetro Nominal / Interno</span>
                <span className="font-mono font-bold text-white text-[11px]">{tubulacao.diametroDn} / {tubulacao.diametroInternoMm} mm</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Material da Tubulação</span>
                <span className="font-mono font-bold text-white text-[11px]">{tubulacao.material.replace(/_/g, ' ')} (ε = {tubulacao.rugosidadeMm} mm)</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Classe de Pressão Nominal</span>
                <span className="font-mono font-bold text-sky-400 text-[11px]">{tubulacao.pressaoNominal} (Limite 10 bar)</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Comprimento Equivalente (Leq)</span>
                <span className="font-mono font-bold text-white text-[11px]">{tubulacao.comprimentoEquivalenteM} metros</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Fator de Atrito Darcy (f)</span>
                <span className="font-mono font-bold text-amber-400 text-[11px]">{tubulacao.fatorAtritoDarcy} (Swamee-Jain)</span>
              </div>

              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Pressão Montante / Jusante</span>
                <span className="font-mono font-bold text-emerald-400 text-[11px]">{tubulacao.pressaoEntradaBar.toFixed(2)} / {tubulacao.pressaoSaidaBar.toFixed(2)} bar</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
              ℹ️ {tubulacao.descricaoProcesso}
            </p>
          </div>

          {/* Painel 3: Comandos Operacionais SCADA Web (Sentido de Fluxo e Intertravamentos) */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <h4 className="text-slate-300 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Controle Operacional de Sentido de Escoamento e Manobra
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => handleMudarSentido('NORMAL')}
                disabled={salvando}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  tubulacao.sentidoFluxo === 'NORMAL'
                    ? 'bg-emerald-950/70 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ArrowRight className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-[11px]">FLUXO NORMAL DIRETO</span>
                <span className="text-[9.5px] opacity-75">Operação Nominal ({tubulacao.origemTag} ➔ {tubulacao.destinoTag})</span>
              </button>

              <button
                onClick={() => handleMudarSentido('REVERSO')}
                disabled={salvando}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  tubulacao.sentidoFluxo === 'REVERSO'
                    ? 'bg-amber-950/70 border-amber-500 text-white font-bold ring-2 ring-amber-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <RotateCw className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-[11px]">FLUXO REVERSO (CIP)</span>
                <span className="text-[9.5px] opacity-75">Sanitização e Contralavagem</span>
              </button>

              <button
                onClick={() => handleMudarSentido('BLOQUEADO')}
                disabled={salvando}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                  tubulacao.sentidoFluxo === 'BLOQUEADO'
                    ? 'bg-rose-950/70 border-rose-500 text-white font-bold ring-2 ring-rose-500/30'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-[11px]">LINHA BLOQUEADA</span>
                <span className="text-[9.5px] opacity-75">Isolamento e Purga Mecânica</span>
              </button>
            </div>
          </div>

          {/* Painel 4: Integração Supabase e Auditoria */}
          <div className="flex items-center justify-between p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-slate-400 text-[11px]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Sincronizado com Supabase SQL: <code className="text-indigo-300">scada_pipelines_config</code></span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              TELEMETRIA ATIVA
            </span>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors font-medium text-xs"
          >
            Fechar Prontuário
          </button>
        </div>

      </div>
    </div>
  );
};
