/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Droplets, 
  Activity, 
  Zap, 
  Sliders, 
  Power, 
  Gauge, 
  Thermometer, 
  ShieldCheck, 
  AlertTriangle, 
  MapPin, 
  Database, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Compass, 
  SlidersHorizontal,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { PocoT100State } from '../types';
import { dbInstance } from '../services/database';

interface WellDetailModalProps {
  poco: PocoT100State;
  isOpen: boolean;
  onClose: () => void;
  onAtualizarPoco: (novoPoco: Partial<PocoT100State>) => void;
}

export const WellDetailModal: React.FC<WellDetailModalProps> = ({
  poco,
  isOpen,
  onClose,
  onAtualizarPoco,
}) => {
  if (!isOpen) return null;

  const [frequenciaSet, setFrequenciaSet] = useState<number>(poco.bombaSubmersa.frequenciaHz);
  const [vazaoSet, setVazaoSet] = useState<number>(poco.vazaoSetadaM3h);
  const [modoBomba, setModoBomba] = useState<'AUTOMATICO_VFD' | 'MANUAL'>(poco.bombaSubmersa.modoOperacao);
  const [salvando, setSalvando] = useState(false);
  const [salvoFeedback, setSalvoFeedback] = useState(false);

  const isBombaLigada = poco.bombaSubmersa.status === 'LIGADA';

  const handleToggleBomba = () => {
    const novoStatus = isBombaLigada ? 'DESLIGADA' : 'LIGADA';
    const novaVazao = novoStatus === 'LIGADA' ? (frequenciaSet / 60) * 200 : 0;
    
    onAtualizarPoco({
      vazaoAtualM3h: Number(novaVazao.toFixed(1)),
      bombaSubmersa: {
        ...poco.bombaSubmersa,
        status: novoStatus,
        rotacaoRpm: novoStatus === 'LIGADA' ? Math.round((frequenciaSet / 60) * 3500) : 0,
        correnteAmp: novoStatus === 'LIGADA' ? Number(((frequenciaSet / 60) * 92.0).toFixed(1)) : 0,
      }
    });

    dbInstance.inserirAlarme(
      'INFO',
      `[POÇO T-100] Bomba Submersa B-100 ${novoStatus} pelo operador via SCADA.`
    );
  };

  const handleAplicarParametros = () => {
    setSalvando(true);
    const vazaoCalculada = (frequenciaSet / 60) * 200;

    setTimeout(() => {
      onAtualizarPoco({
        vazaoSetadaM3h: vazaoSet,
        vazaoAtualM3h: isBombaLigada ? Number(vazaoCalculada.toFixed(1)) : 0,
        bombaSubmersa: {
          ...poco.bombaSubmersa,
          frequenciaHz: frequenciaSet,
          modoOperacao: modoBomba,
          rotacaoRpm: Math.round((frequenciaSet / 60) * 3500),
          correnteAmp: Number(((frequenciaSet / 60) * 92.0).toFixed(1)),
        }
      });
      setSalvando(false);
      setSalvoFeedback(true);
      setTimeout(() => setSalvoFeedback(false), 3000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-slate-100">
        
        {/* Cabeçalho */}
        <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20">
              <Droplets className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  TAG: {poco.id}
                </span>
                <h3 className="text-lg font-bold text-white font-display">
                  {poco.nome} — Sistema de Captação Subterrânea Profunda
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {poco.localizacao} | {poco.aquifero}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. KPIs Hidrogeológicos e Telemetria em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Vazão de Captação (FIT-100)</div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {poco.vazaoAtualM3h.toFixed(1)} <span className="text-xs font-normal text-slate-400">m³/h</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {(poco.vazaoAtualM3h / 3.6).toFixed(1)} L/s (Nominal: 180 m³/h)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Nível Dinâmico (ND)</div>
            <div className="text-xl font-bold font-mono text-sky-400">
              {poco.nivelDinamicoM.toFixed(1)} <span className="text-xs font-normal text-slate-400">m</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Nível Estático: {poco.nivelEstaticoM.toFixed(1)} m (Δh: {poco.rebaixamentoM.toFixed(1)}m)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Fluoreto Natural (ISE)</div>
            <div className="text-xl font-bold font-mono text-rose-400">
              {poco.fluoretoNaturalMgL.toFixed(2)} <span className="text-xs font-normal text-slate-400">mg/L</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Condutividade: {poco.condutividadeUsCm} µS/cm
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Vazão Específica (qe)</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {poco.vazaoEspecificaM3hM.toFixed(2)} <span className="text-xs font-normal text-slate-400">m³/h·m</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Profundidade Total: {poco.profundidadeTotalM}m (12")
            </div>
          </div>
        </div>

        {/* 2. Seção de Controle da Bomba Submersa B-100 (Inversor VFD / Soft-Starter) */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                <Zap className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  BOMBA SUBMERSA DE POÇO PROFUNDO (B-100) — {poco.bombaSubmersa.potenciaCv} CV (55 kW)
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    isBombaLigada ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {poco.bombaSubmersa.status}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  Modelo: {poco.bombaSubmersa.modelo} | Coluna de recalque em Aço Inox DN200 (8")
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleBomba}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                isBombaLigada
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              <Power className="w-4 h-4" />
              {isBombaLigada ? 'DESLIGAR BOMBA B-100' : 'PARTIR BOMBA B-100 (VFD)'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono mb-4">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Frequência VFD</div>
              <div className="text-sky-400 font-bold text-sm">{poco.bombaSubmersa.frequenciaHz.toFixed(1)} Hz</div>
              <div className="text-[9px] text-slate-500">Faixa: 30 a 60 Hz</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Rotação Motor</div>
              <div className="text-white font-bold text-sm">{poco.bombaSubmersa.rotacaoRpm} RPM</div>
              <div className="text-[9px] text-slate-500">2 Polos (3.500 RPM)</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Corrente Consumida</div>
              <div className="text-amber-400 font-bold text-sm">{poco.bombaSubmersa.correnteAmp.toFixed(1)} A</div>
              <div className="text-[9px] text-slate-500">380V Trifásico</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Pressão Descarga</div>
              <div className="text-emerald-400 font-bold text-sm">{poco.bombaSubmersa.pressaoDescargaBar.toFixed(1)} bar</div>
              <div className="text-[9px] text-slate-500">Recalque 68 mca</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500">Temp. Submersa</div>
              <div className="text-purple-400 font-bold text-sm">{poco.bombaSubmersa.temperaturaMotorC.toFixed(1)} °C</div>
              <div className="text-[9px] text-emerald-400">Refrigeração OK</div>
            </div>
          </div>

          {/* Sliders de Ajuste Fino */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span className="font-medium">Setpoint de Frequência do Inversor (VFD):</span>
                <span className="font-mono font-bold text-sky-400">{frequenciaSet.toFixed(1)} Hz ({((frequenciaSet/60)*100).toFixed(0)}%)</span>
              </div>
              <input
                type="range"
                min="30"
                max="60"
                step="0.5"
                value={frequenciaSet}
                onChange={(e) => setFrequenciaSet(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                <span className="font-medium">Setpoint de Vazão Desejada:</span>
                <span className="font-mono font-bold text-amber-400">{vazaoSet.toFixed(0)} m³/h ({(vazaoSet/3.6).toFixed(1)} L/s)</span>
              </div>
              <input
                type="range"
                min="50"
                max="220"
                step="5"
                value={vazaoSet}
                onChange={(e) => setVazaoSet(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Ficha Técnica Construtiva e Qualidade Físico-Química da Água Bruta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Perfil Hidrogeológico (ABNT NBR 12212 / 12244)
            </h5>
            <div className="space-y-1.5 text-xs text-slate-400 font-mono">
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Profundidade Total:</span>
                <span className="text-slate-200 font-bold">{poco.profundidadeTotalM} metros</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Diâmetro de Perfuração:</span>
                <span className="text-slate-200">{poco.diametroPerfuraoPol}" (300 mm)</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Revestimento & Filtros:</span>
                <span className="text-slate-200">{poco.revestimentoMaterial}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Sensor de Nível Hidrostático:</span>
                <span className="text-emerald-400">LT-100 (Submerso a 85m)</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Proteção Funcionamento a Seco:</span>
                <span className="text-emerald-400 font-bold">ATIVA (Interlock 70m)</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Parâmetros Brutos de Qualidade da Água do Aquífero
            </h5>
            <div className="space-y-1.5 text-xs text-slate-400 font-mono">
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Fluoreto Natural Afluente:</span>
                <span className="text-rose-400 font-bold">{poco.fluoretoNaturalMgL.toFixed(2)} mg/L (Requer FTE-CDI)</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">pH Natural:</span>
                <span className="text-slate-200">{poco.phNatural.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Condutividade Elétrica:</span>
                <span className="text-slate-200">{poco.condutividadeUsCm} µS/cm</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                <span className="text-slate-500">Turbidez da Água Bruta:</span>
                <span className="text-slate-200">{poco.turbidezNaturalNtu.toFixed(1)} NTU</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Temperatura da Água:</span>
                <span className="text-sky-300">{poco.temperaturaAguaC.toFixed(1)} °C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-400" /> Sincronização em tempo real com Supabase (`scada_wells_config`).
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Fechar
            </button>
            <button
              onClick={handleAplicarParametros}
              disabled={salvando}
              className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-600/30"
            >
              <RefreshCw className={`w-4 h-4 ${salvando ? 'animate-spin' : ''}`} />
              {salvando ? 'Salvando...' : 'Aplicar Configurações no PLC'}
            </button>
          </div>
        </div>

        {salvoFeedback && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Parâmetros do Poço T-100 e VFD da Bomba B-100 aplicados com sucesso!
          </div>
        )}

      </div>
    </div>
  );
};
