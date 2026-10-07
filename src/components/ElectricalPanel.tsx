import React from 'react';
import { Zap, Cpu, BatteryCharging, ShieldCheck } from 'lucide-react';
import { SensorData, SkidHardwareState } from '../types';

interface ElectricalPanelProps {
  sensorData: SensorData;
  hardwareState: SkidHardwareState;
}

export const ElectricalPanel: React.FC<ElectricalPanelProps> = ({ sensorData, hardwareState }) => {
  // Área superficial total ativa: 10 células x (50 cm x 16.5 cm) = 8.250 cm²
  const areaTotalCm2 = 8250;
  const densidadeCorrenteMaCm2 = (sensorData.correnteAmp * 1000) / areaTotalCm2;
  const potenciaWatts = sensorData.tensaoV * sensorData.correnteAmp;

  return (
    <section className="scada-panel eletrica transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#0ea5e9]" />
          <h2 className="text-base font-bold text-[#e2e8f0]">Potencial Eletroquímico</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] border border-[#334155]">
          Fonte DC Modbus
        </span>
      </div>

      {/* Leitura de Tensão DC */}
      <div className="readout mt-4">
        <div>
          <span className="label block">Tensão DC:</span>
          <span className="text-[11px] text-[#94a3b8]">Target: 1.40 V (Ads.) / 0.00 V (Reg.)</span>
        </div>
        <div className="text-right">
          <span
            id="val-tensao"
            className={`value ${
              sensorData.tensaoV > 1.0 ? 'text-emerald-400' : 'text-[#94a3b8]'
            }`}
          >
            {sensorData.tensaoV.toFixed(2)} <small className="text-xs">V</small>
          </span>
        </div>
      </div>

      {/* Barra de Tensão */}
      <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-[#1e293b] my-1">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${Math.min(100, (sensorData.tensaoV / 2.0) * 100)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b] font-mono mb-4">
        <span>0.0 V (Curto / Descarga)</span>
        <span className="text-emerald-400 font-semibold">1.40 V (Remoção F-)</span>
        <span>2.0 V (Máx)</span>
      </div>

      {/* Leitura de Corrente */}
      <div className="readout">
        <div>
          <span className="label block">Corrente do Skid:</span>
          <span className="text-[11px] text-[#94a3b8]">Distribuição pelas 10 células</span>
        </div>
        <div className="text-right">
          <span id="val-corrente" className="value text-[#0ea5e9]">
            {sensorData.correnteAmp.toFixed(1)} <small className="text-xs">A</small>
          </span>
        </div>
      </div>

      {/* Barra de Corrente */}
      <div className="w-full bg-[#0a0e17] h-2 rounded-full overflow-hidden border border-[#1e293b] my-1">
        <div
          className="h-full bg-[#0ea5e9] transition-all duration-300"
          style={{ width: `${Math.min(100, (sensorData.correnteAmp / 35) * 100)}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[10px] text-[#64748b] font-mono mb-4">
        <span>0 A</span>
        <span className="text-[#0ea5e9]">Faixa Típica: 12 - 25 A</span>
        <span>35 A (Máx)</span>
      </div>

      {/* Métricas Eletroquímicas Avançadas */}
      <div className="pt-3 border-t border-[#1e293b] grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">Densidade de Corrente:</span>
          <span className="font-mono font-semibold text-[#e2e8f0]">
            {densidadeCorrenteMaCm2.toFixed(2)} mA/cm²
          </span>
        </div>
        <div className="bg-[#0a0e17]/60 p-2 rounded border border-[#1e293b]">
          <span className="text-[#94a3b8] block text-[11px]">Potência Consumida:</span>
          <span className="font-mono font-semibold text-[#0ea5e9]">
            {potenciaWatts.toFixed(1)} W
          </span>
        </div>
      </div>

      {/* Especificação dos Eletrodos */}
      <div className="mt-3 p-2 bg-[#0a0e17]/40 rounded border border-[#1e293b] flex items-center justify-between text-[11px] text-[#94a3b8]">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-[#0ea5e9]" />
          <span>Cátodo: Malha Ti (Ru-Ir)</span>
        </div>
        <span>Ânodo: Feltro Grafite</span>
      </div>
    </section>
  );
};
