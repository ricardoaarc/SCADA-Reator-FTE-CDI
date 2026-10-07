import React from 'react';
import { Sliders, AlertOctagon, RotateCw, Play, Pause, Flame, Sparkles, Check } from 'lucide-react';
import { SensorData, SkidHardwareState } from '../types';

interface HardwareSimulationControlProps {
  sensorData: SensorData;
  hardwareState: SkidHardwareState;
  isSimulando: boolean;
  onToggleSimulacao: () => void;
  onInjetarSobrepressao: () => void;
  onInjetarFouling: () => void;
  onResetNominal: () => void;
  onAtualizarSensorManual: (parciais: Partial<SensorData>) => void;
}

export const HardwareSimulationControl: React.FC<HardwareSimulationControlProps> = ({
  sensorData,
  hardwareState,
  isSimulando,
  onToggleSimulacao,
  onInjetarSobrepressao,
  onInjetarFouling,
  onResetNominal,
  onAtualizarSensorManual,
}) => {
  return (
    <div className="scada-panel mb-6 bg-[#111726] border border-[#1e293b]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <h3 className="text-base font-bold text-[#e2e8f0]">
              Bancada de Testes & Simulação de Falhas do CLP
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Injete perturbações e sobrepressão para validar os interlocks mecânicos e desarmamento de relés
            </p>
          </div>
        </div>

        {/* Toggle do Loop em Tempo Real */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSimulacao}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition border ${
              isSimulando
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-600/50'
                : 'bg-amber-950/70 text-amber-400 border-amber-600/50'
            }`}
          >
            {isSimulando ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isSimulando ? 'Loop CLP Ativo (1 Hz)' : 'Loop CLP Pausado'}
          </button>
        </div>
      </div>

      {/* Botões Rápidos de Injeção de Falhas Críticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
        {/* Teste 1: Sobrepressão Crítica */}
        <button
          onClick={onInjetarSobrepressao}
          className="p-3 bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 rounded-lg text-left transition flex flex-col justify-between group"
          title="Injeta 3.20 bar para testar interlock de proteção da base PEAD"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertOctagon className="w-4 h-4 text-red-500" />
              Testar Sobrepressão (3.2 bar)
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-tight">
            Valida Trava 1: Risco de extrusão mecânica das vedações PEAD. Deve cortar imediatamente o relé da bomba!
          </p>
        </button>

        {/* Teste 2: Fouling na Matriz Porosa */}
        <button
          onClick={onInjetarFouling}
          className="p-3 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/60 rounded-lg text-left transition flex flex-col justify-between group"
          title="Injeta vazão < 500 L/h e pressão > 2.0 bar para testar detecção de entupimento"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" />
              Testar Fouling Matriz
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-tight">
            Valida Trava 2: Vazão &lt; 500 L/h com Pressão &gt; 2.0 bar (Incrustação na Malha de Ti e Feltro de Grafite).
          </p>
        </button>

        {/* Teste 3: Restaurar Condições Normais */}
        <button
          onClick={onResetNominal}
          className="p-3 bg-emerald-950/30 hover:bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-left transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <RotateCw className="w-4 h-4 text-emerald-500" />
              Condições Nominais
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-tight">
            Restaura ponto operacional padrão (P: 1.85 bar, Q: 980 L/h, F- in: 8.5 ppm).
          </p>
        </button>
      </div>

      {/* Sliders Interativos de Ajuste Contínuo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#1e293b] text-xs font-mono">
        {/* Ajuste de Pressão */}
        <div>
          <div className="flex justify-between text-[#94a3b8] mb-1">
            <span>Pressão Plenum:</span>
            <strong className={sensorData.pressaoBar >= 3.0 ? 'text-red-400' : 'text-[#e2e8f0]'}>
              {sensorData.pressaoBar.toFixed(2)} bar
            </strong>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.4"
            step="0.05"
            value={sensorData.pressaoBar}
            onChange={(e) => onAtualizarSensorManual({ pressaoBar: parseFloat(e.target.value) })}
            className="w-full accent-[#0ea5e9] bg-[#0a0e17] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#64748b]">
            <span>0.5 bar</span>
            <span className="text-red-400 font-bold">3.0 bar (Interlock)</span>
            <span>3.4 bar</span>
          </div>
        </div>

        {/* Ajuste de Vazão */}
        <div>
          <div className="flex justify-between text-[#94a3b8] mb-1">
            <span>Vazão Total Skid:</span>
            <strong className="text-[#e2e8f0]">{Math.round(sensorData.vazaoLitrosHora)} L/h</strong>
          </div>
          <input
            type="range"
            min="300"
            max="1600"
            step="20"
            value={sensorData.vazaoLitrosHora}
            onChange={(e) => onAtualizarSensorManual({ vazaoLitrosHora: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 bg-[#0a0e17] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#64748b]">
            <span>300 L/h</span>
            <span className="text-emerald-400">Faixa 500 - 1500 L/h</span>
            <span>1600 L/h</span>
          </div>
        </div>

        {/* Ajuste de Fluoreto de Entrada */}
        <div>
          <div className="flex justify-between text-[#94a3b8] mb-1">
            <span>Fluoreto Afluente:</span>
            <strong className="text-amber-400">{sensorData.fluoretoInPPM.toFixed(1)} ppm</strong>
          </div>
          <input
            type="range"
            min="1.0"
            max="20.0"
            step="0.5"
            value={sensorData.fluoretoInPPM}
            onChange={(e) => onAtualizarSensorManual({ fluoretoInPPM: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 bg-[#0a0e17] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#64748b]">
            <span>1.0 ppm</span>
            <span>Típico Poço: 6 - 12 ppm</span>
            <span>20.0 ppm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
