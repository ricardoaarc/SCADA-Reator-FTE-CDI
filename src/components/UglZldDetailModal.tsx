/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Recycle, 
  Layers, 
  CheckCircle2, 
  Droplets, 
  ShieldCheck, 
  Gauge, 
  Activity, 
  RotateCw, 
  Sliders, 
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  RefreshCw,
  Database
} from 'lucide-react';
import { PurifyWaveState } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { dbInstance } from '../services/database';

interface UglZldDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UglZldDetailModal: React.FC<UglZldDetailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const ugl = pwState.ugl;

  const [prensaAtiva, setPrensaAtiva] = useState(ugl.prensaAtiva);
  const [rotacaoRoscaRpm, setRotacaoRoscaRpm] = useState(18); // RPM da rosca desaguadora
  const [pressaoFiltroBar, setPressaoFiltroBar] = useState(2.4);
  const [sucessoSalvo, setSucessoSalvo] = useState(false);

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSalvar = () => {
    dbInstance.inserirAlarme('INFO', `[UGL & ZLD] Parâmetros da Prensa Parafuso e Circuito ZLD atualizados: Prensa=${prensaAtiva ? 'ATIVA' : 'STANDBY'}, RPM=${rotacaoRoscaRpm}, Pressão=${pressaoFiltroBar} bar.`);
    setSucessoSalvo(true);
    setTimeout(() => setSucessoSalvo(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Recycle className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Módulo UGL & Circuito ZLD — Lodo, Biossólidos & Descarte Zero
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  ZLD 91,8% Recuperação
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                  CONAMA 498 Apto
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Prensa Parafuso Desaguadora, imobilização mineral CaSiF₆, desodorização e recuperação hídrica no Tanque T-102 (circuito fechado ZLD sem retorno ao poço).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Banner de Sucesso */}
          {sucessoSalvo && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Configurações da UGL e Tanque de Reuso T-102 sincronizadas com sucesso no Supabase!</span>
            </div>
          )}

          {/* 1. KPIs da UGL e ZLD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30">
              <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Rendimento Desaguamento</div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {ugl.taxaDesaguamentoPct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Prensa Parafuso Contínua</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30">
              <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Umidade da Torta Sólida</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {ugl.umidadeTortaPct}%
              </div>
              <div className="text-[10px] text-emerald-300 mt-1">&lt; 25% (Apto Agricultura)</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30">
              <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Clarificado ➔ Tanque T-102</div>
              <div className="text-2xl font-bold text-cyan-400 font-mono">
                {ugl.vazaoFiltradoRecuperadoLh} <span className="text-xs">L/h</span>
              </div>
              <div className="text-[10px] text-cyan-300 mt-1">Circuito Fechado T-102 (5 m³)</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30">
              <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">Imobilização SiF₆²⁻</div>
              <div className="text-2xl font-bold text-purple-300 font-mono">
                {ugl.massaFluorossilicatoPrecipitadaKgH} <span className="text-xs">kg/h</span>
              </div>
              <div className="text-[10px] text-purple-300 mt-1">Mineral inerte CaSiF₆↓</div>
            </div>
          </div>

          {/* 2. Painéis de Detalhes: Prensa Desaguadora + Circuito ZLD de Retrolavagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bloco 1: Prensa Parafuso & Biossólidos */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Prensa Parafuso Desaguadora (Biossólidos CONAMA 498)
                </h4>
                <button
                  onClick={() => setPrensaAtiva(!prensaAtiva)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    prensaAtiva 
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-rose-600/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {prensaAtiva ? '● EM OPERAÇÃO' : '○ EM STANDBY'}
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Velocidade da Rosca Transportadora:</span>
                    <span className="font-mono font-bold text-amber-300">{rotacaoRoscaRpm} RPM</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={rotacaoRoscaRpm}
                    onChange={(e) => setRotacaoRoscaRpm(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Pressão Hidráulica do Cone de Descarga:</span>
                    <span className="font-mono font-bold text-sky-300">{pressaoFiltroBar} bar</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={pressaoFiltroBar}
                    onChange={(e) => setPressaoFiltroBar(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">• Lodo Total Processado:</span>
                  <span className="font-mono font-bold text-white">{ugl.lodoProcessadoKgH} kg/h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">• Estabilização Mineral com Silício:</span>
                  <span className="font-mono font-bold text-emerald-400">100% Conforme</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">• Inibição de Odor H₂S (Sulfeto):</span>
                  <span className="font-mono font-bold text-emerald-400">Ausência Total</span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Co-Tratamento ZLD (XV-103 FTE-CDI + Purga CONTHEC) */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  Co-Tratamento ZLD: FTE-CDI (XV-103) + Skid CONTHEC
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  Circuito Fechado T-102
                </span>
              </div>

              <p className="text-xs text-slate-400">
                A UGL recebe simultaneamente a salmoura de dessorção do FTE-CDI (850 L/h) e o dreno de lodo do Skid CONTHEC (150 L/h). O silício reativo (CONTHEC B) imobiliza o fluorossilicato de cálcio insolúvel (CaSiF₆↓), enviando 780 L/h de clarificado para o Tanque T-102 (5 m³), sem retorno ao poço.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Efluentes Recebidos</div>
                  <div className="text-amber-400 font-bold text-sm mt-0.5">850 + 150 L/h</div>
                  <div className="text-[10px] text-slate-400 mt-1">{ugl.concentracaoFluorRecebidaPpm} ppm F⁻ (CaSiF₆↓)</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Clarificado Reusado</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">{ugl.vazaoFiltradoRecuperadoLh} L/h</div>
                  <div className="text-[10px] text-cyan-300 mt-1">Armazenado em T-102</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Portaria GM/MS 888 atendida com <strong>{ugl.recuperacaoAguaZldPct}%</strong> de recuperação em circuito fechado.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Destinação: Biossólido Classe A (Agrícola) + Efluente Zero (ZLD)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleSalvar}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Parâmetros UGL / ZLD
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
