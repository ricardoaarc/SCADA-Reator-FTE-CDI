/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Beaker, 
  Pipette, 
  RefreshCw, 
  CheckCircle2, 
  Sliders, 
  Sparkles, 
  Droplets, 
  Flame, 
  AlertTriangle, 
  Clock, 
  Gauge, 
  Activity,
  Layers,
  Database
} from 'lucide-react';
import { PurifyWaveState } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { dbInstance } from '../services/database';

interface ConthecDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConthecDetailModal: React.FC<ConthecDetailModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const skid = pwState.skidConthec;

  const [dosagemA, setDosagemA] = useState(skid.componenteA.vazaoDosagemMLh);
  const [dosagemB, setDosagemB] = useState(skid.componenteB.vazaoDosagemMLh);
  const [dosagemC, setDosagemC] = useState(skid.componenteC.vazaoDosagemMLh);
  const [vazaoDiluicao, setVazaoDiluicao] = useState(skid.injetorDiluicao4.vazaoAguaDiluicaoLh);
  const [concentracaoAtiva, setConcentracaoAtiva] = useState(skid.injetorDiluicao4.concentracaoFinalPpm);
  const [sucessoSalvo, setSucessoSalvo] = useState(false);

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleAplicar = () => {
    purifyWaveService.ajustarDosadoraConthec('A', Number(dosagemA));
    purifyWaveService.ajustarDosadoraConthec('B', Number(dosagemB));
    purifyWaveService.ajustarDosadoraConthec('C', Number(dosagemC));
    purifyWaveService.ajustarInjetorDiluicao(Number(vazaoDiluicao), Number(concentracaoAtiva));
    
    dbInstance.inserirAlarme('INFO', `[Skid CONTHEC] Parâmetros de dosagem atualizados: A=${dosagemA}ml/h, B=${dosagemB}ml/h, C=${dosagemC}ml/h, Injetor=${concentracaoAtiva}ppm.`);
    setSucessoSalvo(true);
    setTimeout(() => setSucessoSalvo(false), 2500);
  };

  const handleReabastecer = () => {
    purifyWaveService.reabastecerFrascosConthec();
    setDosagemA(skid.componenteA.vazaoDosagemMLh);
    setDosagemB(skid.componenteB.vazaoDosagemMLh);
    setDosagemC(skid.componenteC.vazaoDosagemMLh);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header do Modal */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Beaker className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">
                  Skid Quádruplo CONTHEC — Dosagem, Mistura & Injeção
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono">
                  Proporção 500:220:220
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configuração individual das 3 bombas dosadoras, câmara de pré-mistura (*Blending Tank*) e 4º injetor de diluição em linha DN200.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReabastecer}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reabastecer Frascos
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Banner de Feedback de Salvamento */}
          {sucessoSalvo && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Parâmetros de dosagem do Skid CONTHEC aplicados e gravados com sucesso no barramento do Supabase!</span>
            </div>
          )}

          {/* 1. Grade dos 3 Frascos CONTHEC + Câmara de Mistura + 4º Injetor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Frasco A */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-mono">
                  CONTHEC A (500 ml)
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {skid.componenteA.volumeAtualML} / {skid.componenteA.capacidadeMaximaML} ml
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Reagente Oxidante Principal</h4>
                <p className="text-xs text-slate-400">Polióxido de Cloro e radicais ativados</p>
              </div>

              {/* Nível Visual */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${(skid.componenteA.volumeAtualML / skid.componenteA.capacidadeMaximaML) * 100}%` }}
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Vazão Dosadora 1:</span>
                  <span className="font-mono font-bold text-rose-300">{dosagemA} ml/h</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="1"
                  value={dosagemA}
                  onChange={(e) => setDosagemA(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10 ml/h</span>
                  <span>Proporção: 53.2%</span>
                  <span>120 ml/h</span>
                </div>
              </div>
            </div>

            {/* Frasco B */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 font-mono">
                  CONTHEC B (220 ml)
                </span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {skid.componenteB.volumeAtualML} / {skid.componenteB.capacidadeMaximaML} ml
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Estabilizador Silício Reativo</h4>
                <p className="text-xs text-slate-400">Passivação mineral e formação de SiF₆²⁻</p>
              </div>

              {/* Nível Visual */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${(skid.componenteB.volumeAtualML / skid.componenteB.capacidadeMaximaML) * 100}%` }}
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Vazão Dosadora 2:</span>
                  <span className="font-mono font-bold text-sky-300">{dosagemB} ml/h</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="0.5"
                  value={dosagemB}
                  onChange={(e) => setDosagemB(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 ml/h</span>
                  <span>Proporção: 23.4%</span>
                  <span>60 ml/h</span>
                </div>
              </div>
            </div>

            {/* Frasco C */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  CONTHEC C (220 ml)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {skid.componenteC.volumeAtualML} / {skid.componenteC.capacidadeMaximaML} ml
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Catalisador Ativador In-Situ</h4>
                <p className="text-xs text-slate-400">Cinética de clivagem molecular radicalar</p>
              </div>

              {/* Nível Visual */}
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${(skid.componenteC.volumeAtualML / skid.componenteC.capacidadeMaximaML) * 100}%` }}
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Vazão Dosadora 3:</span>
                  <span className="font-mono font-bold text-indigo-300">{dosagemC} ml/h</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="0.5"
                  value={dosagemC}
                  onChange={(e) => setDosagemC(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 ml/h</span>
                  <span>Proporção: 23.4%</span>
                  <span>60 ml/h</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Seção da Câmara de Pré-Mistura e 4º Injetor de Diluição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Bloco da Câmara de Pré-Mistura */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Câmara de Pré-Mistura In-Situ (Blending A+B+C)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  {skid.camaraMistura.statusReacao === 'PRONTO_PARA_INJECAO' ? '✓ Ativado' : 'Homogeneizando'}
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Os 3 componentes reagem na câmara de homogeneização gerando o complexo ativado com tempo de residência padrão de 240 segundos (3 a 5 min).
              </p>

              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Tempo Reação</div>
                  <div className="text-sky-300 font-bold mt-0.5">{skid.camaraMistura.tempoRestanteS}s / {skid.camaraMistura.tempoHomogeneizacaoS}s</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Temperatura</div>
                  <div className="text-indigo-300 font-bold mt-0.5">{skid.camaraMistura.temperaturaC}°C</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Autonomia</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{skid.autonomiaEstimadaHoras} horas</div>
                </div>
              </div>
            </div>

            {/* Bloco do 4º Injetor de Diluição */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  4º Injetor de Diluição & Aplicação em Linha DN200
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {skid.injetorDiluicao4.pressaoInjecaoBar} bar
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Vazão de Água de Arraste (L/h):</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    step="5"
                    value={vazaoDiluicao}
                    onChange={(e) => setVazaoDiluicao(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium">Concentração Ativa Final (ppm):</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.5"
                    value={concentracaoAtiva}
                    onChange={(e) => setConcentracaoAtiva(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 font-mono">
                • Potencial Redox Gerado: <span className="font-bold">+{pwState.orpOutMv} mV</span> | Desinfecção: <span className="font-bold">99,99%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer do Modal com Botão de Ação */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Proporção Nominal: 500 mL A (53,2%) : 220 mL B (23,4%) : 220 mL C (23,4%)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleAplicar}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar & Aplicar Parâmetros CONTHEC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
