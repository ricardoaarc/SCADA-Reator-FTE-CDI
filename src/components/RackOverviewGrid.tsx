/**
 * Visão Geral do Rack Industrial (16 Células FTE-CDI em Paralelo - 180 m³/h / 50 L/s)
 * Filosofia de Design: ISA-101 (Usabilidade IHM) e ISA-18.2 (Cores de Alarme)
 * Grid 4x4 com granularidade por célula, telemetria em tempo real e sinalização de interlock.
 */

import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Gauge, 
  Layers, 
  Lock, 
  RotateCcw, 
  ShieldAlert, 
  Sliders, 
  Sparkles, 
  Zap,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { CelulaInfo, RackResumoGlobal } from '../types';

interface RackOverviewGridProps {
  celulas: CelulaInfo[];
  resumoGlobal: RackResumoGlobal;
  onSelecionarCelula: (celula: CelulaInfo) => void;
  onAbrirRearmeManual: (celula: CelulaInfo) => void;
  onAbrirProvisionador?: () => void;
}

export const RackOverviewGrid: React.FC<RackOverviewGridProps> = ({
  celulas,
  resumoGlobal,
  onSelecionarCelula,
  onAbrirRearmeManual,
  onAbrirProvisionador
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Header do Rack Industrial (180 m³/h) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0c1220] via-[#111a2f] to-[#0c1322] border border-[#1e2e4a] shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1e2e4a]/80">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Rack Industrial FTE-CDI ({celulas.length} Células Modulares)
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-sky-950 text-sky-300 border border-sky-700 font-bold">
                  Vazão: {(resumoGlobal.vazaoTotalLh / 1000).toFixed(1)} m³/h ({(resumoGlobal.vazaoTotalLh / 3600).toFixed(1)} L/s)
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                  Tubulação Principal PEAD DN200 (8") PN10
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {celulas.reduce((a, b) => a + (b.ativa ? b.pares_eletrodo : 0), 0)} pares de eletrodos (dimensões 2000x1600x900 mm). Interlocks físicos independentes (corte em 2,80 bar).
              </p>
            </div>
          </div>

          {/* Botões de Ação e Status de Segurança */}
          <div className="flex items-center gap-2 flex-wrap">
            {onAbrirProvisionador && (
              <button
                onClick={onAbrirProvisionador}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-lg border border-purple-400 shadow-md flex items-center gap-1.5 transition"
                title="Adicionar ou configurar novas células no rack com 1 clique"
              >
                <Sliders className="w-3.5 h-3.5" />
                + Provisionar Células
              </button>
            )}
            {resumoGlobal.statusGeralSeguranca === 'NORMAL' && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                RACK OPERACIONAL (16 CÉLULAS ATIVAS)
              </div>
            )}
            {resumoGlobal.statusGeralSeguranca === 'INTERLOCK_PARCIAL' && (
              <div className="px-3 py-1.5 rounded-lg bg-red-950/90 border border-red-600 text-red-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                INTERLOCK PARCIAL ({resumoGlobal.celulasIntertravadas} CÉLULAS BLOQUEADAS)
              </div>
            )}
            {resumoGlobal.statusGeralSeguranca === 'ALERTA' && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-600 text-amber-300 text-xs font-mono font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                ALERTA DE PROCESSO ({resumoGlobal.celulasEmAlerta} CÉLULAS)
              </div>
            )}
          </div>
        </div>

        {/* 2. KPI Bar de Telemetria Consolidada */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs font-mono">
          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Vazão do Manifold</span>
            <div className="text-base font-bold text-sky-400 mt-0.5">
              {(resumoGlobal.vazaoTotalLh / 1000).toFixed(1)} <span className="text-xs text-slate-400 font-normal">m³/h</span>
            </div>
            <span className="text-[10px] text-slate-500">{(resumoGlobal.vazaoTotalLh / 3600).toFixed(1)} L/s (Meta: 50 L/s)</span>
          </div>

          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Pressão Média Rack</span>
            <div className={`text-base font-bold mt-0.5 ${resumoGlobal.pressaoMediaBar >= 2.50 ? 'text-amber-400' : 'text-slate-200'}`}>
              {resumoGlobal.pressaoMediaBar.toFixed(2)} <span className="text-xs text-slate-400 font-normal">bar</span>
            </div>
            <span className="text-[10px] text-slate-500">Corte Interlock: 2,80 bar</span>
          </div>

          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Fluoreto Efluente</span>
            <div className={`text-base font-bold mt-0.5 ${resumoGlobal.fluoretoOutMedioPPM > 1.50 ? 'text-red-400' : 'text-emerald-400'}`}>
              {resumoGlobal.fluoretoOutMedioPPM.toFixed(2)} <span className="text-xs text-slate-400 font-normal">mg/L</span>
            </div>
            <span className="text-[10px] text-slate-500">Portaria 888: &le; 1,50 mg/L</span>
          </div>

          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Eficiência Média</span>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {resumoGlobal.eficienciaMediaPct.toFixed(1)} <span className="text-xs text-slate-400 font-normal">%</span>
            </div>
            <span className="text-[10px] text-slate-500">Entrada: {resumoGlobal.fluoretoInMedioPPM.toFixed(2)} mg/L</span>
          </div>

          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Potência Elétrica DC</span>
            <div className="text-base font-bold text-indigo-300 mt-0.5">
              {resumoGlobal.potenciaTotalKw.toFixed(1)} <span className="text-xs text-slate-400 font-normal">kW</span>
            </div>
            <span className="text-[10px] text-slate-500">{resumoGlobal.correnteTotalAmp.toFixed(0)} A @ 1,40 V</span>
          </div>

          <div className="bg-[#0a0f1d] p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-[10px] uppercase block">Distribuição de Células</span>
            <div className="text-xs font-bold text-slate-200 mt-1 flex items-center justify-between">
              <span className="text-emerald-400">{resumoGlobal.celulasEmAdsorcao} Ads</span>
              <span className="text-sky-400">{resumoGlobal.celulasEmRegeneracao} Reg</span>
              <span className="text-red-400">{resumoGlobal.celulasIntertravadas} Lock</span>
            </div>
            <span className="text-[10px] text-slate-500">Total: 16 células</span>
          </div>
        </div>
      </div>

      {/* 3. Grid 4x4 de Células (Granularidade Real de 16 Células) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            Matriz de Supervisão do Rack (Linhas 1-4 / Colunas 1-4)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Clique em qualquer célula para inspecionar os 6 sensores ou acionar rearme
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {celulas.map((celula) => {
            const isInterlock = celula.interlockDisparado;
            const isAlerta = celula.status === 'ALERTA';
            const isRegen = celula.status === 'REGENERACAO';
            const isAdsorcao = celula.status === 'ADSORCAO';

            return (
              <div
                key={celula.id}
                onClick={() => onSelecionarCelula(celula)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                  isInterlock
                    ? 'bg-[#200b0f] border-red-500/80 shadow-lg shadow-red-950/60 ring-2 ring-red-500 animate-pulse'
                    : isAlerta
                    ? 'bg-[#221708] border-amber-500/80 shadow-md shadow-amber-950/50'
                    : isRegen
                    ? 'bg-[#0b162c] border-sky-500/50 hover:border-sky-400'
                    : 'bg-[#0d1624] border-slate-800 hover:border-emerald-500/60 hover:bg-[#101c2e]'
                }`}
              >
                {/* Header do Card da Célula */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold text-white tracking-wider">
                        {celula.codigo}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        (Pos {celula.posicao_rack} - L{celula.linhaRack}C{celula.colunaRack})
                      </span>
                    </div>

                    {/* Badge de Status */}
                    <div>
                      {isInterlock ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-600 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> INTERTRAVADA
                        </span>
                      ) : isRegen ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-600 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" /> REGENERAÇÃO
                        </span>
                      ) : isAlerta ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> ALERTA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ADSORÇÃO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telemetria Rápida da Célula */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
                    <div className="bg-[#060a12]/80 p-2 rounded border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">VAZÃO CELULAR</span>
                      <span className="font-bold text-white">{(celula.vazaoLh / 1000).toFixed(2)} m³/h</span>
                      <span className="text-[9px] text-slate-400 block">{celula.vazaoLh.toFixed(0)} L/h</span>
                    </div>

                    <div className="bg-[#060a12]/80 p-2 rounded border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">PRESSÃO (MAX 2.8B)</span>
                      <span className={`font-bold ${celula.pressaoBar >= 2.80 ? 'text-red-400' : celula.pressaoBar >= 2.50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {celula.pressaoBar.toFixed(2)} bar
                      </span>
                      <span className="text-[9px] text-slate-400 block">Histerese: 2,80 bar</span>
                    </div>

                    <div className="bg-[#060a12]/80 p-2 rounded border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">F⁻ OUT (VMP 1.5)</span>
                      <span className={`font-bold ${(celula.fluoretoOutPPM ?? 0) > 1.50 ? 'text-red-400' : 'text-sky-300'}`}>
                        {(celula.fluoretoOutPPM ?? 0).toFixed(2)} mg/L
                      </span>
                      <span className="text-[9px] text-slate-400 block">In: {(celula.fluoretoInPPM ?? 0).toFixed(2)}</span>
                    </div>

                    <div className="bg-[#060a12]/80 p-2 rounded border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block">BREAKTHROUGH</span>
                      <span className={`font-bold ${(celula.razaoBreakthrough ?? 0) >= 0.90 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {((celula.razaoBreakthrough ?? 0) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[9px] text-slate-400 block">Limite: 90%</span>
                    </div>
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{celula.tensaoV.toFixed(2)}V | {celula.correnteAmp.toFixed(1)}A</span>
                  </div>

                  {isInterlock ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAbrirRearmeManual(celula);
                      }}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] flex items-center gap-1 transition shadow"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rearmar
                    </button>
                  ) : (
                    <span className="text-slate-400 hover:text-sky-300 flex items-center gap-0.5 text-[11px]">
                      Detalhes <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
