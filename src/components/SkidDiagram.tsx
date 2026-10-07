import React, { useState } from 'react';
import { Layers, Activity, ShieldAlert, Cpu, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Info, Box, Maximize2, X } from 'lucide-react';
import { SkidHardwareState, SensorData, CellTelemetry } from '../types';
import multicamadas3dImg from '../assets/images/fte_cdi_multicamadas_3d_1790040471377.jpg';

interface SkidDiagramProps {
  hardwareState: SkidHardwareState;
  sensorData: SensorData;
}

export const SkidDiagram: React.FC<SkidDiagramProps> = ({ hardwareState, sensorData }) => {
  const [selectedCell, setSelectedCell] = useState<CellTelemetry | null>(null);
  const [modal3dAberto, setModal3dAberto] = useState<boolean>(false);

  const isInterlock = hardwareState.interlockDisparado;
  const isBombaAtiva = hardwareState.bombaAlimentacaoAtiva;
  const isSobrepressao = sensorData.pressaoBar >= 3.0;

  return (
    <div className="scada-panel mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-[#1e293b] gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#e2e8f0]">
                Diagrama Sinóptico do Skid (10 Células FTE-CDI em Paralelo)
              </h2>
              <button
                onClick={() => setModal3dAberto(true)}
                className="px-2 py-0.5 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                title="Ver Renderização 3D Isométrica Explodida do Módulo Compacto Multicamadas (Opção D - Scale Up)"
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver Módulo 3D (Opção D)</span>
              </button>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Dimensão celular: 500 mm × 165 mm × 40 mm | Placas & Bases Plenum em PEAD (Máx 3.0 bar)
            </p>
          </div>
        </div>

        {/* Status de Alimentação e Relé */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 border font-mono ${
              isInterlock
                ? 'bg-red-950/80 text-red-400 border-red-600 animate-pulse'
                : isBombaAtiva
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-600/40'
                : 'bg-[#1e293b] text-[#94a3b8] border-[#334155]'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isInterlock ? 'bg-red-500 animate-ping' : isBombaAtiva ? 'bg-emerald-400' : 'bg-gray-500'
              }`}
            ></div>
            <span>
              RELÉ BOMBA:{' '}
              <strong className="uppercase">
                {isInterlock ? 'CORTADO (TRIP)' : isBombaAtiva ? 'ENERGIZADO (ON)' : 'DESLIGADO'}
              </strong>
            </span>
          </div>

          <div className="px-2.5 py-1 rounded bg-[#0a0e17] text-[#94a3b8] border border-[#1e293b] font-mono">
            <span>PLENUM PEAD: </span>
            <strong className={isSobrepressao ? 'text-red-400 animate-pulse' : 'text-[#0ea5e9]'}>
              {sensorData.pressaoBar.toFixed(2)} / 3.0 bar
            </strong>
          </div>
        </div>
      </div>

      {/* Esquema Visual do Processo P&ID */}
      <div className="mt-4 bg-[#0a0e17] rounded-lg p-4 border border-[#1e293b] relative overflow-hidden">
        {/* Linha de Fluxo Superior (Manifold de Distribuição PEAD) */}
        <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-[#1e293b]/70 font-mono text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-sky-500 rounded-sm"></span>
            <span>Afluente F- ({sensorData.fluoretoInPPM.toFixed(1)} ppm)</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[#e2e8f0]">Plenum Entrada (PEAD)</span>
          </div>

          <div className="text-[11px] text-[#64748b]">
            Vazão Total: <strong className="text-[#e2e8f0]">{Math.round(sensorData.vazaoLitrosHora)} L/h</strong>
          </div>
        </div>

        {/* Grade das 10 Células em Paralelo */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 my-4">
          {hardwareState.celulas.map((c) => {
            const isCellCritica = c.pressaoIndividualBar >= 3.0;
            const isCellFouling = c.status === 'ALERTA_FOULING';
            const isCellSelected = selectedCell?.cellId === c.cellId;

            return (
              <button
                key={c.cellId}
                onClick={() => setSelectedCell(c)}
                className={`p-2.5 rounded text-left transition-all border relative flex flex-col justify-between h-36 ${
                  isCellCritica
                    ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/50 animate-pulse'
                    : isCellFouling
                    ? 'bg-amber-950/30 border-amber-500'
                    : isCellSelected
                    ? 'bg-[#1e293b] border-[#0ea5e9] ring-1 ring-[#0ea5e9]'
                    : 'bg-[#151b2b]/90 border-[#1e293b] hover:border-[#334155]'
                }`}
              >
                {/* Header da Célula */}
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[11px] font-bold text-[#e2e8f0]">C-{c.cellId}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCellCritica
                        ? 'bg-red-500 animate-ping'
                        : isCellFouling
                        ? 'bg-amber-400'
                        : isBombaAtiva
                        ? 'bg-emerald-400'
                        : 'bg-gray-500'
                    }`}
                  ></span>
                </div>

                {/* Camadas Internas de Eletrodos (Representação Física) */}
                <div className="my-1.5 flex flex-col gap-0.5 text-[9px] font-mono py-1 px-1 bg-[#0a0e17] rounded border border-[#1e293b]">
                  <div className="flex justify-between items-center text-sky-400/90" title="Cátodo: Malha de Titânio com Ru-Ir">
                    <span>(-) Ti Ru-Ir</span>
                  </div>
                  <div className="h-0.5 bg-gradient-to-r from-sky-500/40 to-emerald-500/40 my-0.5"></div>
                  <div className="flex justify-between items-center text-slate-300" title="Ânodo: Feltro de Grafite">
                    <span>(+) Feltro C</span>
                  </div>
                </div>

                {/* Métricas da Célula */}
                <div className="space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>P:</span>
                    <span className={isCellCritica ? 'text-red-400 font-bold' : 'text-[#e2e8f0]'}>
                      {c.pressaoIndividualBar.toFixed(2)}b
                    </span>
                  </div>
                  <div className="flex justify-between text-[#94a3b8]">
                    <span>Q:</span>
                    <span className={isCellFouling ? 'text-amber-400 font-bold' : 'text-[#e2e8f0]'}>
                      {Math.round(c.vazaoIndividualLh)}L/h
                    </span>
                  </div>
                </div>

                {/* Badge de Dimensão */}
                <div className="text-[9px] text-center text-[#64748b] border-t border-[#1e293b] pt-1">
                  500x165mm
                </div>
              </button>
            );
          })}
        </div>

        {/* Linha de Fluxo Inferior (Manifold de Saída PEAD) */}
        <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-[#1e293b]/70 font-mono text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="text-[#e2e8f0]">Plenum Saída (PEAD)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm"></span>
            <span className="text-emerald-400 font-semibold">
              Permeado F- ({sensorData.fluoretoOutPPM.toFixed(2)} ppm)
            </span>
          </div>

          <div className="text-[11px] text-[#94a3b8]">
            Fluxo U-Flow Contínuo | Potencial DC:{' '}
            <strong className="text-emerald-400 font-mono">{sensorData.tensaoV.toFixed(2)} V</strong>
          </div>
        </div>
      </div>

      {/* Modal / Detalhe de Inspeção da Célula Selecionada */}
      {selectedCell && (
        <div className="mt-3 p-3 bg-[#0a0e17] rounded-lg border border-[#0ea5e9]/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0ea5e9]/20 text-[#0ea5e9] flex items-center justify-center font-bold font-mono">
              C-{selectedCell.cellId}
            </div>
            <div>
              <h4 className="font-bold text-[#e2e8f0]">
                Célula FTE-CDI #{selectedCell.cellId} — Especificação Física
              </h4>
              <p className="text-[#94a3b8] text-[11px]">
                Dimensões: 500 mm x 165 mm x 40 mm | Espaçador poroso de fluxo | Cátodo Ti (Ru-Ir) & Ânodo Feltro Grafite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono">
            <div>
              <span className="text-[#94a3b8] block text-[10px]">Pressão Local:</span>
              <strong className={selectedCell.pressaoIndividualBar >= 3.0 ? 'text-red-400' : 'text-[#e2e8f0]'}>
                {selectedCell.pressaoIndividualBar.toFixed(2)} bar
              </strong>
            </div>
            <div>
              <span className="text-[#94a3b8] block text-[10px]">Vazão Parcela:</span>
              <strong className="text-[#0ea5e9]">{selectedCell.vazaoIndividualLh.toFixed(1)} L/h</strong>
            </div>
            <div>
              <span className="text-[#94a3b8] block text-[10px]">Temperatura:</span>
              <strong className="text-[#e2e8f0]">{selectedCell.temperaturaC.toFixed(1)} °C</strong>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="px-2 py-1 bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] rounded text-[11px]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Renderização 3D Técnica do Módulo Multicamadas (Opção D) */}
      {modal3dAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="bg-[#0f172a] border border-[#334155] rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#151b2b]">
              <div className="flex items-center gap-2.5">
                <Box className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Conceito 3D: Módulo Industrial Multicamadas FTE-CDI (Opção D)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dimensões estruturais: 2.000 mm × 660 mm × 160 mm | 50 pares compactos de eletrodos (Feltro de Grafite + Malha Ti Ru-Ir)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal3dAberto(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4">
              <div className="relative rounded-lg overflow-hidden border border-[#334155] bg-black">
                <img
                  src={multicamadas3dImg}
                  alt="Render 3D Isométrico Explodido do Módulo FTE-CDI Multicamadas (Plate-and-Frame)"
                  className="w-full h-auto max-h-[500px] object-contain mx-auto"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-xs font-mono text-sky-300">
                  Fluxo U-Flow Paralelo | 50 Micro-Câmaras com Espaçador de 1 mm
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#151b2b] rounded-lg border border-[#1e293b]">
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">Capacidade de Vazão</span>
                  <strong className="text-emerald-400 text-sm font-mono block">40 a 50 m³/h por Módulo</strong>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Com 8 a 10 módulos compactos em paralelo, atinge a meta global de &gt; 400 m³/h.
                  </p>
                </div>

                <div className="p-3 bg-[#151b2b] rounded-lg border border-[#1e293b]">
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">Resistência Ôhmica Mínima</span>
                  <strong className="text-sky-400 text-sm font-mono block">Gap Intereletrodo de 1 mm</strong>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Garante tensão segura (&lt; 1,50 V) sem causar eletrólise parasita nem decomposição da água.
                  </p>
                </div>

                <div className="p-3 bg-[#151b2b] rounded-lg border border-[#1e293b]">
                  <span className="text-slate-400 block text-[11px] font-semibold mb-1">Área Ativa Compactada</span>
                  <strong className="text-purple-400 text-sm font-mono block">&gt; 55 m² de Área Útil</strong>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Densidade volumétrica 65× maior do que a configuração em células individuais grossas.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-[#1e293b] bg-[#151b2b] flex justify-end">
              <button
                onClick={() => setModal3dAberto(false)}
                className="px-4 py-1.5 bg-[#0ea5e9] hover:bg-sky-500 text-white font-semibold rounded text-xs transition"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
