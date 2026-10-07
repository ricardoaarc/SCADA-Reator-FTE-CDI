/**
 * Painel de Controle PID em Malha Fechada de Vazão e Proteção de Pressão
 * Reator FTE-CDI - Rack 10 Células
 * Inclui Proteção Anti-Windup e Override Crítico Anti-Ruptura de Base Plenum PEAD (2.70 bar)
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  Activity, 
  ShieldAlert, 
  Zap, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Gauge, 
  ArrowRight,
  Lock,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { PidConfig, PidTelemetryPoint, OperatorProfile } from '../types';
import { pidService } from '../services/PidController';
import { authService } from '../services/AuthService';

interface PidControlPanelProps {
  pidConfig: PidConfig;
  historicoPid: PidTelemetryPoint[];
  pressaoAtualBar: number;
  vazaoAtualLh: number;
  operadorAtual: OperatorProfile;
  onAtualizarSetpoint: (novoSp: number) => void;
  onAtualizarSintonia: (kp: number, ki: number, kd: number) => void;
  onAlternarModo: (modo: 'AUTO' | 'MANUAL') => void;
  onSetSaidaManual: (pct: number) => void;
}

export const PidControlPanel: React.FC<PidControlPanelProps> = ({
  pidConfig,
  historicoPid,
  pressaoAtualBar,
  vazaoAtualLh,
  operadorAtual,
  onAtualizarSetpoint,
  onAtualizarSintonia,
  onAlternarModo,
  onSetSaidaManual,
}) => {
  const [spInput, setSpInput] = useState<number>(pidConfig.setpointVazaoLh);
  const [kpInput, setKpInput] = useState<number>(pidConfig.kp);
  const [kiInput, setKiInput] = useState<number>(pidConfig.ki);
  const [kdInput, setKdInput] = useState<number>(pidConfig.kd);
  const [manualOutputInput, setManualOutputInput] = useState<number>(pidConfig.saidaManualPct);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const podeEditarGanhos = operadorAtual.role === 'ENGENHEIRO' || operadorAtual.role === 'ADMIN';

  const handleAplicarSp = (e: React.FormEvent) => {
    e.preventDefault();
    if (spInput < 500 || spInput > 1500) return;
    onAtualizarSetpoint(spInput);
    setFeedbackMsg(`Setpoint de vazão alterado para ${spInput} L/h`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSalvarSintonia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditarGanhos) return;
    onAtualizarSintonia(Number(kpInput), Number(kiInput), Number(kdInput));
    setFeedbackMsg(`Ganhos PID atualizados: Kp=${kpInput}, Ki=${kiInput}, Kd=${kdInput}`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const erroAtual = pidConfig.setpointVazaoLh - vazaoAtualLh;
  const isOverride = pidConfig.overridePressaoAtivo || pressaoAtualBar >= 2.70;

  return (
    <div className="space-y-6">
      {/* Banner Principal com Indicador de Override de Segurança */}
      <div className={`p-5 rounded-xl border shadow-xl relative overflow-hidden transition-all duration-300 ${
        isOverride
          ? 'bg-amber-950/30 border-amber-500/80 shadow-amber-900/20'
          : 'bg-[#151b2b] border-[#1e293b]'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className={`p-2 rounded-lg ${isOverride ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                Controle PID de Vazão & Proteção Mecânica Anti-Ruptura
              </h2>
              <span className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded font-bold border ${
                pidConfig.modo === 'AUTO' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                MODO: {pidConfig.modo}
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] max-w-3xl leading-relaxed">
              Algoritmo em malha fechada que modula o inversor de frequência (VFD) da bomba alimentadora para manter a vazão constante entre <strong>500 L/h e 1500 L/h</strong>, integrando <strong>Override de Sobrepressão (2.70 bar)</strong> para evitar o corte abrupto do interlock em 3.0 bar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOverride && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500 text-amber-200 text-xs font-bold animate-pulse">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>OVERRIDE MECÂNICO ATIVO (&gt; 2.70 bar)</span>
              </div>
            )}

            <div className="flex bg-[#0a0e17] p-1 rounded-lg border border-[#1e293b]">
              <button
                onClick={() => onAlternarModo('AUTO')}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  pidConfig.modo === 'AUTO' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Automático (PID)
              </button>
              <button
                onClick={() => onAlternarModo('MANUAL')}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  pidConfig.modo === 'MANUAL' ? 'bg-amber-600 text-white shadow-sm' : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Manual (VFD %)
              </button>
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas do Laço de Controle */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Setpoint (SP) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Setpoint (SP)</span>
            <span className="text-[10px] text-sky-400 font-mono">Vazão Alvo</span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono text-sky-400 tracking-tight">
              {pidConfig.setpointVazaoLh} <span className="text-sm font-normal text-[#94a3b8]">L/h</span>
            </div>
            <span className="text-[11px] text-[#64748b]">Faixa: 500 a 1500 L/h</span>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e293b] flex gap-1">
            {[750, 980, 1200, 1400].map(v => (
              <button
                key={v}
                onClick={() => {
                  setSpInput(v);
                  onAtualizarSetpoint(v);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                  pidConfig.setpointVazaoLh === v
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-[#0a0e17] text-[#94a3b8] hover:text-white border border-[#1e293b]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Variável de Processo (PV) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Variável Proc. (PV)</span>
            <span className="text-[10px] text-emerald-400 font-mono">FT-101</span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              {vazaoAtualLh.toFixed(1)} <span className="text-sm font-normal text-[#94a3b8]">L/h</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
              <span className="text-[#64748b]">Erro e(t):</span>
              <span className={Math.abs(erroAtual) < 30 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {erroAtual > 0 ? `+${erroAtual.toFixed(1)}` : erroAtual.toFixed(1)} L/h
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e293b] text-[11px] text-[#94a3b8] flex justify-between">
            <span>Desvio relativo:</span>
            <strong className="text-slate-200">{((erroAtual / pidConfig.setpointVazaoLh) * 100).toFixed(1)}%</strong>
          </div>
        </div>

        {/* Variável Manipulada (MV - Sinal VFD) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Saída VFD (MV)</span>
            <span className="text-[10px] text-purple-400 font-mono">Inversor 0-100%</span>
          </div>
          <div>
            <div className="text-3xl font-bold font-mono text-purple-400 tracking-tight">
              {pidConfig.sinalVfdAtualPct.toFixed(1)} <span className="text-sm font-normal text-[#94a3b8]">%</span>
            </div>
            <div className="w-full bg-[#0a0e17] rounded-full h-2 mt-2 border border-[#1e293b] overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, pidConfig.sinalVfdAtualPct))}%` }}
              ></div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e293b] text-[10px] font-mono text-[#64748b] flex justify-between">
            <span>P: {pidConfig.termoP.toFixed(1)}%</span>
            <span>I: {pidConfig.termoI.toFixed(1)}%</span>
            <span>D: {pidConfig.termoD.toFixed(1)}%</span>
          </div>
        </div>

        {/* Pressão de Processo e Override */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#94a3b8] font-bold uppercase tracking-wider">Pressão Plenum</span>
            <span className="text-[10px] text-red-400 font-mono">PT-101 (PEAD)</span>
          </div>
          <div>
            <div className={`text-3xl font-bold font-mono tracking-tight ${
              pressaoAtualBar >= 3.0 ? 'text-red-500 animate-pulse' :
              pressaoAtualBar >= 2.7 ? 'text-amber-400' : 'text-slate-200'
            }`}>
              {pressaoAtualBar.toFixed(2)} <span className="text-sm font-normal text-[#94a3b8]">bar</span>
            </div>
            <div className="text-[11px] text-[#64748b] mt-1">
              Limite Máx: <strong className="text-red-400">3.00 bar</strong> | Override: <strong className="text-amber-400">2.70 bar</strong>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#1e293b] text-[11px]">
            <span className={pressaoAtualBar < 2.7 ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>
              {pressaoAtualBar < 2.7 ? 'Faixa Elástica Segura' : 'Alívio Mecânico Ativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Sintonia e Gráfico de Resposta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Sintonia de Parâmetros PID */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sintonia de Ganhos PID
                </h3>
              </div>
              {!podeEditarGanhos && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Requer Engenheiro/Admin
                </span>
              )}
            </div>

            {/* Ajuste de Setpoint */}
            <form onSubmit={handleAplicarSp} className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Ajuste de Setpoint de Vazão (L/h):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={500}
                    max={1500}
                    step={10}
                    value={spInput}
                    onChange={(e) => setSpInput(Number(e.target.value))}
                    className="flex-1 bg-[#0a0e17] border border-[#334155] rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold uppercase transition"
                  >
                    Aplicar SP
                  </button>
                </div>
              </div>
            </form>

            {/* Sintonia Kp, Ki, Kd */}
            <form onSubmit={handleSalvarSintonia} className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Ganho Proporcional (Kp):</span>
                  <span className="text-sky-400 font-mono">{kpInput}</span>
                </div>
                <input
                  type="number"
                  min={0.01}
                  max={2.0}
                  step={0.01}
                  disabled={!podeEditarGanhos}
                  value={kpInput}
                  onChange={(e) => setKpInput(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Ganho Integral (Ki):</span>
                  <span className="text-sky-400 font-mono">{kiInput}</span>
                </div>
                <input
                  type="number"
                  min={0.001}
                  max={0.5}
                  step={0.005}
                  disabled={!podeEditarGanhos}
                  value={kiInput}
                  onChange={(e) => setKiInput(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Ganho Derivativo (Kd):</span>
                  <span className="text-sky-400 font-mono">{kdInput}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={0.2}
                  step={0.005}
                  disabled={!podeEditarGanhos}
                  value={kdInput}
                  onChange={(e) => setKdInput(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono disabled:opacity-50"
                />
              </div>

              {podeEditarGanhos && (
                <button
                  type="submit"
                  className="w-full mt-2 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded text-xs font-bold uppercase tracking-wider transition shadow"
                >
                  Salvar Parâmetros no CLP
                </button>
              )}
            </form>
          </div>

          {/* Ajuste em Modo Manual */}
          {pidConfig.modo === 'MANUAL' && (
            <div className="mt-4 pt-3 border-t border-[#1e293b]">
              <div className="flex justify-between text-xs mb-1 text-amber-300 font-semibold">
                <span>Modulação Manual do Inversor (VFD):</span>
                <span className="font-mono">{manualOutputInput}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={manualOutputInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setManualOutputInput(val);
                  onSetSaidaManual(val);
                }}
                className="w-full accent-amber-500"
              />
            </div>
          )}
        </div>

        {/* Gráfico Visual de Acompanhamento do Laço */}
        <div className="lg:col-span-2 bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#1e293b] gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Dinâmica do Laço em Tempo Real (SP vs PV vs VFD)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <span className="w-3 h-0.5 bg-sky-400 inline-block"></span> SP Vazão
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span> PV Vazão
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="w-3 h-0.5 bg-purple-400 inline-block"></span> Saída VFD %
                </span>
              </div>
            </div>

            {/* Simulação Visual do Gráfico */}
            <div className="bg-[#0a0e17] rounded-lg border border-[#1e293b] p-3 h-64 flex flex-col justify-end relative overflow-hidden">
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none opacity-20">
                <div className="border-b border-[#334155]"></div>
                <div className="border-b border-[#334155]"></div>
                <div className="border-b border-[#334155]"></div>
                <div className="border-b border-[#334155]"></div>
              </div>

              {/* Curvas em SVG */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Linha de Setpoint (Azul) */}
                <line
                  x1="0"
                  y1={200 - ((pidConfig.setpointVazaoLh - 400) / 1200) * 180}
                  x2="500"
                  y2={200 - ((pidConfig.setpointVazaoLh - 400) / 1200) * 180}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />

                {/* Polilinha de PV (Vazão Medida) */}
                {historicoPid.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    points={historicoPid.map((p, idx) => {
                      const x = (idx / (historicoPid.length - 1)) * 500;
                      const y = 200 - ((p.pvVazao - 400) / 1200) * 180;
                      return `${x},${Math.max(10, Math.min(195, y))}`;
                    }).join(' ')}
                  />
                )}

                {/* Polilinha de MV (Sinal VFD em roxo) */}
                {historicoPid.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    points={historicoPid.map((p, idx) => {
                      const x = (idx / (historicoPid.length - 1)) * 500;
                      const y = 200 - (p.mvVfdPct / 100) * 180;
                      return `${x},${Math.max(10, Math.min(195, y))}`;
                    }).join(' ')}
                  />
                )}
              </svg>

              {/* Legenda de Eixos */}
              <div className="flex justify-between text-[10px] text-[#64748b] font-mono mt-2 pt-1 border-t border-[#1e293b]">
                <span>T-30s</span>
                <span>T-20s</span>
                <span>T-10s</span>
                <span>Tempo Real (Agora)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-lg bg-[#0a0e17] border border-[#1e293b] text-xs text-[#94a3b8] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Tempo de Amostragem do Laço: <strong>1.0 segundo (1 Hz)</strong>
            </span>
            <span>Controle Ativo de Camada Dupla Elétrica (EDL)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
