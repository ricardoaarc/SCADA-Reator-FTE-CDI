/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Gauge, 
  Clock, 
  Sliders, 
  Zap, 
  Flame, 
  Droplets,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { PurifyWaveState, TopologiaTratamentoId, TopologiaInfo } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';

interface PipelineSwitcherPanelProps {
  onClose?: () => void;
}

export const PipelineSwitcherPanel: React.FC<PipelineSwitcherPanelProps> = ({ onClose }) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const topologias = purifyWaveService.obterTopologiasDisponiveis();

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });
    return unsub;
  }, []);

  const topologiaAtual = topologias.find((t: any) => t.id === pwState.topologiaAtiva) || topologias[0];

  const handleSelecionarTopologia = (id: TopologiaTratamentoId) => {
    purifyWaveService.selecionarTopologia(id);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Pipeline Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-indigo-400">
              <Share2 className="w-8 h-8 text-indigo-300 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white font-display">
                  SELETOR DE TOPOLOGIAS DINÂMICAS — 1-CLICK PIPELINE SWITCHER
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono">
                  {topologiaAtual.codigo}: {topologiaAtual.nome}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ● Válvulas Motorizadas Sincronizadas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Alterne instantaneamente a ordem física do tratamento entre Pré-Oxidação (POA ➔ FTE), Pós-Oxidação (FTE ➔ POA), Linhas Paralelas (Split 50/50) ou Bypass de Contingência.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Vazão Total: <span className="text-white font-bold">{pwState.vazaoAfluenteM3h} m³/h</span>
            </span>
          </div>
        </div>

        {/* 2. KPIs de Engenharia Hidráulica da Topologia Ativa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Perda de Carga Total (ΔP)</span>
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-indigo-300 font-mono">
              {topologiaAtual.perdaCargaEstimadaBar} <span className="text-xs text-indigo-400/70">bar</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Darcy-Weisbach DN200</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-sky-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Tempo Residência (TRH)</span>
              <Clock className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-sky-300 font-mono">
              {topologiaAtual.tempoResidenciaHidraulicoMin} <span className="text-xs text-sky-400/70">min</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Câmara POA + Reator FTE</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Remoção DQO Estimada</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {pwState.remocaoDqoPct}%
            </div>
            <div className="text-[10px] text-emerald-300 mt-1">{pwState.dqoInMgL} ➔ {pwState.dqoOutMgL} mg/L</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Bomba Biossônica BBS-100</span>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 font-mono mt-0.5">
              {pwState.biossonica.posicaoAtual.replace('POS_', 'SLOT ')}
            </div>
            <div className="text-[10px] text-purple-400 mt-1">{pwState.biossonica.rotacaoRpm} RPM | {pwState.biossonica.frequenciaUltrassonicaKhz} kHz</div>
          </div>
        </div>
      </div>

      {/* 3. Grade dos 4 Modos de Topologia Operacional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topologias.map((top: any) => {
          const isAtiva = top.id === pwState.topologiaAtiva;
          return (
            <div
              key={top.id}
              onClick={() => handleSelecionarTopologia(top.id)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isAtiva
                  ? 'bg-slate-900 border-indigo-500 shadow-2xl shadow-indigo-500/20 ring-2 ring-indigo-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              {isAtiva && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                    {top.codigo}
                  </span>
                  {isAtiva ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> TOPOLOGIA ATIVA NO P&ID
                    </span>
                  ) : (
                    <button className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                      Ativar Topologia
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-1.5 font-display">
                  {top.nome}
                </h3>
                <p className="text-xs text-indigo-300/90 font-mono mb-2">
                  {top.descricaoCurta}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {top.descricaoDetalhada}
                </p>

                {/* Diagrama de Fluxo Linear */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 mb-4 font-mono text-[11px] text-sky-300">
                  <div className="text-[10px] uppercase text-slate-500 mb-1 font-sans font-bold">Fluxo de Rota Hidráulica:</div>
                  <div>{top.fluxoDiagrama}</div>
                </div>
              </div>

              {/* Status das Válvulas Motorizadas e Indicação */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="text-sm">💡</span>
                  <span><strong className="text-emerald-300">Indicação:</strong> {top.indicacaoAplicacao}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-101 (Alimentação)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv101_EntradaPoco === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv101_EntradaPoco}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-201 (POA➔FTE)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv201_TransferenciaPoaParaFte === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv201_TransferenciaPoaParaFte}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-202 (Bypass POA)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv202_BypassPoaDireto === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv202_BypassPoaDireto}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-301 (Entrada FTE)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv301_EntradaFteCdi === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv301_EntradaFteCdi}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-302 (FTE➔POA)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv302_TransferenciaFteParaPoa === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv302_TransferenciaFteParaPoa}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-401 (Potável)</span>
                    <span className={`px-2 py-0.5 rounded text-center font-bold text-[10px] ${
                      top.statusValvulasMotorizadas.xv401_SaidaPotavelFinal === 'ABERTA' 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {top.statusValvulasMotorizadas.xv401_SaidaPotavelFinal}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-100 (Poço T-100)</span>
                    <span className="px-2 py-0.5 rounded text-center font-bold text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ABERTA
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-col justify-between gap-1 shadow-sm">
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-sans">XV-103 (ZLD Rejeito)</span>
                    <span className="px-2 py-0.5 rounded text-center font-bold text-[10px] bg-slate-800/80 text-amber-300 border border-amber-500/30">
                      DESSORÇÃO AUTO
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
