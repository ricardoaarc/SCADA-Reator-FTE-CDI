import React from 'react';
import { Gauge, AlertOctagon, Info, ArrowUpRight, Activity } from 'lucide-react';
import { SensorData, SkidHardwareState } from '../types';

interface HydraulicPanelProps {
  sensorData: SensorData;
  hardwareState: SkidHardwareState;
}

export const HydraulicPanel: React.FC<HydraulicPanelProps> = ({ sensorData, hardwareState }) => {
  const isCritico = sensorData.pressaoBar >= 3.0;
  const isFouling = hardwareState.foulingDetectado;
  const isVazaoBaixa = sensorData.vazaoLitrosHora < 500 && hardwareState.bombaAlimentacaoAtiva;
  const isVazaoAlta = sensorData.vazaoLitrosHora > 1500;

  // Percentual para barras de progresso industriais
  const pressaoPct = Math.min(100, (sensorData.pressaoBar / 3.5) * 100);
  const vazaoPct = Math.min(100, (sensorData.vazaoLitrosHora / 1800) * 100);

  return (
    <section
      id="panel-hidraulica"
      className={`scada-panel hidraulica relative overflow-hidden transition-all ${
        isCritico ? 'panel-critico' : ''
      }`}
    >
      {/* Top Banner de Alerta Crítico */}
      {isCritico && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[11px] font-bold py-1 px-3 flex items-center justify-between uppercase tracking-wider animate-pulse">
          <span className="flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            CRÍTICO: Sobrepressão Base Plenum (≥ 3.0 bar)! Relé da bomba desarmado
          </span>
          <span>RISCO DE EXTRUSÃO PEAD</span>
        </div>
      )}

      <div className={`flex items-center justify-between pb-2 border-b border-[#1e293b] ${isCritico ? 'mt-4' : ''}`}>
        <div className="flex items-center gap-2">
          <Gauge className={`w-5 h-5 ${isCritico ? 'text-red-500' : 'text-[#0ea5e9]'}`} />
          <h2 className="text-base font-bold text-[#e2e8f0]">U-Flow (Dinâmica de Fluidos)</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
          Rack 10 Células em Paralelo
        </span>
      </div>

      {/* Leitura de Pressão */}
      <div className="readout mt-4">
        <div>
          <span className="label block">Pressão (Base Plenum PEAD):</span>
          <span className="text-[11px] text-[#94a3b8]">Limite mecânico máx: 3.00 bar</span>
        </div>
        <div className="text-right">
          <span
            id="val-pressao"
            className={`value ${
              isCritico
                ? 'text-red-500 font-bold text-2xl'
                : sensorData.pressaoBar > 2.4
                ? 'text-amber-400'
                : 'text-[#e2e8f0]'
            }`}
          >
            {sensorData.pressaoBar.toFixed(2)} <small className="text-xs">bar</small>
          </span>
        </div>
      </div>

      {/* Barra de Limite de Pressão */}
      <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-[#1e293b] my-1">
        <div
          className={`h-full transition-all duration-300 ${
            isCritico
              ? 'bg-red-500 animate-pulse'
              : sensorData.pressaoBar > 2.4
              ? 'bg-amber-500'
              : 'bg-[#0ea5e9]'
          }`}
          style={{ width: `${pressaoPct}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b] font-mono mb-4">
        <span>0.0 bar</span>
        <span className="text-emerald-500/70">Ideal: 1.5 - 2.2 bar</span>
        <span className="text-red-400 font-semibold">Max PEAD: 3.0 bar</span>
      </div>

      {/* Leitura de Vazão */}
      <div className="readout">
        <div>
          <span className="label block">Vazão do Skid:</span>
          <span className="text-[11px] text-[#94a3b8]">Faixa operacional: 500 - 1500 L/h</span>
        </div>
        <div className="text-right">
          <span
            id="val-vazao"
            className={`value ${
              isVazaoBaixa
                ? 'text-amber-400'
                : isVazaoAlta
                ? 'text-sky-300'
                : 'text-[#e2e8f0]'
            }`}
          >
            {Math.round(sensorData.vazaoLitrosHora)} <small className="text-xs">L/h</small>
          </span>
        </div>
      </div>

      {/* Barra de Faixa de Vazão */}
      <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-[#1e293b] my-1">
        <div
          className={`h-full transition-all duration-300 ${
            isVazaoBaixa ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${vazaoPct}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b] font-mono mb-4">
        <span className="text-amber-400">Min: 500 L/h</span>
        <span className="text-[#94a3b8]">50-150 L/h por célula</span>
        <span>Max: 1500 L/h</span>
      </div>

      {/* Diagnóstico Hidráulico Adicional */}
      <div className="pt-3 border-t border-[#1e293b] grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">Vazão Média/Célula:</span>
          <span className="font-mono font-semibold text-[#e2e8f0]">
            {(sensorData.vazaoLitrosHora / 10).toFixed(1)} L/h
          </span>
        </div>
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">Status Permeabilidade:</span>
          <span
            className={`font-mono font-semibold flex items-center gap-1 ${
              isFouling ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            <Activity className="w-3 h-3" />
            {isFouling ? 'Fouling / Alerta' : 'Normal (U-Flow)'}
          </span>
        </div>
      </div>
    </section>
  );
};
