import React from 'react';
import { Target, CheckCircle, AlertCircle, Droplet, Award } from 'lucide-react';
import { SensorData, SkidHardwareState } from '../types';

interface QualityPanelProps {
  sensorData: SensorData;
  hardwareState: SkidHardwareState;
}

export const QualityPanel: React.FC<QualityPanelProps> = ({ sensorData, hardwareState }) => {
  const fIn = sensorData.fluoretoInPPM;
  const fOut = sensorData.fluoretoOutPPM;
  const eficiencia = fIn > 0 ? Math.max(0, Math.min(100, ((fIn - fOut) / fIn) * 100)) : 0;
  
  // Limite máximo de fluoreto para água potável (Portaria GM/MS 888/2021 e OMS: 1.5 ppm / mg/L)
  const isPotavel = fOut <= 1.5 && hardwareState.bombaAlimentacaoAtiva && sensorData.tensaoV > 0.5;

  return (
    <section className="scada-panel qualidade transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#0ea5e9]" />
          <h2 className="text-base font-bold text-[#e2e8f0]">Eficiência (F-)</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
          Eletrossorção Seletiva
        </span>
      </div>

      {/* Leitura Entrada */}
      <div className="readout mt-4">
        <div>
          <span className="label block">Entrada (Água Bruta):</span>
          <span className="text-[11px] text-[#94a3b8]">Teor de Fluoreto no afluente</span>
        </div>
        <div className="text-right">
          <span className="value text-[#94a3b8]">
            {fIn.toFixed(2)} <small className="text-xs">ppm</small>
          </span>
        </div>
      </div>

      {/* Leitura Saída (Destaque) */}
      <div className="readout destaque">
        <div>
          <span className="label block font-semibold text-[#e2e8f0]">Saída (Permeado FTE):</span>
          <span className="text-[11px] text-[#94a3b8]">Água desfluoretada tratada</span>
        </div>
        <div className="text-right">
          <span className="value text-[#0ea5e9]">
            {fOut.toFixed(2)} <small className="text-xs">ppm</small>
          </span>
        </div>
      </div>

      {/* Padrão de Potabilidade (Portaria GM/MS 888 / OMS) */}
      <div className="my-2 p-2.5 rounded bg-[#0a0e17] border border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPotavel ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <div>
            <span className="text-xs font-semibold block text-[#e2e8f0]">
              {isPotavel ? 'Conforme Padrão de Potabilidade' : 'Fora do Padrão / Em Regeneração'}
            </span>
            <span className="text-[10px] text-[#94a3b8]">
              VMP Portaria GM/MS nº 888: ≤ 1,5 mg/L (ppm)
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            isPotavel
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}
        >
          {fOut <= 1.5 ? 'OK' : 'ALERTA'}
        </span>
      </div>

      {/* Métricas de Remoção */}
      <div className="pt-3 border-t border-[#1e293b] grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">Taxa de Remoção:</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">
            {eficiencia.toFixed(1)}%
          </span>
        </div>
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">F- Retido Acumulado:</span>
          <span className="font-mono font-bold text-[#0ea5e9] text-sm">
            {hardwareState.massaFRemovidaMg.toFixed(0)} mg
          </span>
        </div>
      </div>
    </section>
  );
};
