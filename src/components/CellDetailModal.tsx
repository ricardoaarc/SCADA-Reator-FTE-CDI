/**
 * Modal de Detalhe e Diagnóstico Individual da Célula FTE-CDI (Granularidade 1 de 16)
 * Exibe os 6 sensores em tempo real + gráfico de breakthrough dos últimos ciclos
 */

import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Gauge, 
  Lock, 
  RotateCcw, 
  Zap, 
  Clock, 
  Layers, 
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { CelulaInfo, Usuario } from '../types';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';
import { dbInstance } from '../services/database';

interface CellDetailModalProps {
  celula: CelulaInfo;
  usuarioAtual: Usuario;
  onFechar: () => void;
  onAbrirRearme: (celula: CelulaInfo) => void;
  onAtualizar: () => void;
}

export const CellDetailModal: React.FC<CellDetailModalProps> = ({
  celula,
  usuarioAtual,
  onFechar,
  onAbrirRearme,
  onAtualizar
}) => {
  const telemetriaHistorico = dbInstance.getHistoricoTelemetriaPorCelula(celula.id, 15);
  const [mensagemAcao, setMensagemAcao] = useState<string | null>(null);

  const handleTrocarFase = (novaFase: 'ADSORCAO' | 'REGENERACAO') => {
    controllerV2Instance.trocarFaseCelula(celula.id, novaFase, `Comando manual por ${usuarioAtual.nome}`);
    setMensagemAcao(`Fase alterada para ${novaFase} com sucesso.`);
    onAtualizar();
  };

  const reles = dbInstance.getRelesPorCelula(celula.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0e1626] border border-[#1e2e4a] rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Diagnóstico Granular: {celula.codigo}
                </h2>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-sky-950 text-sky-300 border border-sky-700">
                  Posição Rack {celula.posicao_rack} (Linha {celula.linhaRack}, Coluna {celula.colunaRack})
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                  146 Pares de Eletrodo (2000x1600x900 mm)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervisão de célula individual com interlock físico, histerese em 2,80 bar e máquina de breakthrough.
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {mensagemAcao && (
          <div className="p-3 bg-sky-950/60 border border-sky-500 text-sky-300 text-xs font-mono rounded-lg flex items-center justify-between">
            <span>{mensagemAcao}</span>
            <button onClick={() => setMensagemAcao(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Status e Interlock Bar */}
        {celula.interlockDisparado && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500 text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" />
                INTERLOCK FÍSICO DISPARADO (CORTE REAL EFETUADO)
              </div>
              <p className="text-xs mt-1 text-red-300">{celula.motivoInterlock}</p>
            </div>
            <button
              onClick={() => onAbrirRearme(celula)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg uppercase tracking-wider shadow-lg flex items-center gap-2 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Rearmar Manualmente
            </button>
          </div>
        )}

        {/* 6 Sensores em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Pressão Entrada</span>
            <span className={`text-base font-bold mt-1 block ${celula.pressaoBar >= 2.80 ? 'text-red-400' : celula.pressaoBar >= 2.50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {celula.pressaoBar.toFixed(2)} bar
            </span>
            <span className="text-[10px] text-slate-500">Corte: 2,80 bar</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Vazão Individual</span>
            <span className="text-base font-bold text-sky-400 mt-1 block">
              {(celula.vazaoLh / 1000).toFixed(2)} m³/h
            </span>
            <span className="text-[10px] text-slate-500">{celula.vazaoLh.toFixed(0)} L/h</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Fluoreto In / Out</span>
            <span className="text-base font-bold text-amber-300 mt-1 block">
              {(celula.fluoretoOutPPM ?? 0).toFixed(2)} mg/L
            </span>
            <span className="text-[10px] text-slate-500">In: {(celula.fluoretoInPPM ?? 0).toFixed(2)} mg/L</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Tensão / Corrente</span>
            <span className="text-base font-bold text-indigo-300 mt-1 block">
              {celula.tensaoV.toFixed(2)}V | {celula.correnteAmp.toFixed(1)}A
            </span>
            <span className="text-[10px] text-slate-500">Polaridade: {celula.polaridade}</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">pH & Temperatura</span>
            <span className="text-base font-bold text-slate-200 mt-1 block">
              pH {(celula.ph ?? 0).toFixed(1)} | {(celula.temperaturaC ?? 0).toFixed(1)}°C
            </span>
            <span className="text-[10px] text-slate-500">Compensação ativa</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] block uppercase">Razão Breakthrough</span>
            <span className={`text-base font-bold mt-1 block ${(celula.razaoBreakthrough ?? 0) >= 0.90 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {((celula.razaoBreakthrough ?? 0) * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] text-slate-500">Debounce: {celula.leiturasConsecutivasBreakthrough}/3</span>
          </div>
        </div>

        {/* Estado Físico dos Relés do Hardware */}
        <div className="p-4 rounded-xl bg-[#070c16] border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Estado Físico dos Relés Atuadores (IRelayDriver Hardware)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {reles.map(r => (
              <div key={r.id} className="p-3 bg-[#0c1220] rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">{r.tipo}</span>
                  <span className="text-[10px] text-slate-500 block">{r.motivo_ultimo_estado}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  r.estado === 'FECHADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                }`}>
                  RELÉ {r.estado}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico / Histórico de Breakthrough */}
        <div className="p-4 rounded-xl bg-[#070c16] border border-slate-800 space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold uppercase tracking-wider">
              Histórico de Saturação e Breakthrough (Últimos Scans)
            </span>
            <span className="text-slate-500 text-[11px]">Meta de Eletroadsorção: 1,40 V</span>
          </div>

          <div className="h-32 flex items-end justify-between gap-2 pt-3 px-2 border-b border-l border-slate-800">
            {telemetriaHistorico.map((t, idx) => {
              const razao = t.fluoreto_in_ppm > 0 ? t.fluoreto_out_ppm / t.fluoreto_in_ppm : 0;
              const alturaPct = Math.min(100, Math.round(razao * 100));
              const isCritico = razao >= 0.90;

              return (
                <div key={t.id || idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <span className="text-[9px] font-mono text-slate-400 group-hover:text-white">
                    {(razao * 100).toFixed(0)}%
                  </span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isCritico ? 'bg-amber-500 shadow-md shadow-amber-950' : 'bg-emerald-500'
                    }`}
                    style={{ height: `${alturaPct}%` }}
                  ></div>
                  <span className="text-[8px] font-mono text-slate-500">{t.timestamp.slice(14, 19)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 flex-wrap gap-2">
          <div className="text-xs font-mono text-slate-400">
            Operando em: <span className="font-bold text-white">{celula.status}</span> ({celula.tempoFaseAtualSegundos}s no ciclo atual)
          </div>

          <div className="flex items-center gap-2">
            {!celula.interlockDisparado && (
              <>
                <button
                  onClick={() => handleTrocarFase('ADSORCAO')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition"
                >
                  Forçar Adsorção (1,40V)
                </button>
                <button
                  onClick={() => handleTrocarFase('REGENERACAO')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded transition"
                >
                  Forçar Regeneração (0,00V)
                </button>
              </>
            )}
            <button
              onClick={onFechar}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
