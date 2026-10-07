import React, { useState } from 'react';
import { LineChart, BarChart2, Activity, Maximize2 } from 'lucide-react';
import { TelemetriaSensor } from '../types';

interface TelemetryChartsProps {
  historico: TelemetriaSensor[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ historico }) => {
  const [activeTab, setActiveTab] = useState<'PRESSAO_VAZAO' | 'FLUORETO' | 'ELETRICA'>('PRESSAO_VAZAO');

  if (historico.length === 0) {
    return (
      <div className="scada-panel p-6 text-center text-[#94a3b8] text-sm">
        Aguardando telemetria dos sensores do CLP...
      </div>
    );
  }

  // Dimensões do SVG do gráfico
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const dataPoints = historico.slice(-40); // Últimos 40 pontos
  const n = dataPoints.length;

  const getX = (index: number) => padding.left + (index / Math.max(1, n - 1)) * chartW;

  return (
    <div className="scada-panel mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e293b] gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#0ea5e9]" />
          <div>
            <h3 className="text-base font-bold text-[#e2e8f0]">
              Tendências de Telemetria em Tempo Real (Strip-Charts SCADA)
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Amostragem em tempo real | Loop de controle e validação de limites físicos
            </p>
          </div>
        </div>

        {/* Seletores de Gráfico */}
        <div className="flex items-center gap-1 bg-[#0a0e17] p-1 rounded border border-[#1e293b] text-xs">
          <button
            onClick={() => setActiveTab('PRESSAO_VAZAO')}
            className={`px-3 py-1 rounded transition font-mono ${
              activeTab === 'PRESSAO_VAZAO'
                ? 'bg-[#0ea5e9] text-white font-bold'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            Pressão & Vazão
          </button>
          <button
            onClick={() => setActiveTab('FLUORETO')}
            className={`px-3 py-1 rounded transition font-mono ${
              activeTab === 'FLUORETO'
                ? 'bg-[#0ea5e9] text-white font-bold'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            Fluoreto (F-)
          </button>
          <button
            onClick={() => setActiveTab('ELETRICA')}
            className={`px-3 py-1 rounded transition font-mono ${
              activeTab === 'ELETRICA'
                ? 'bg-[#0ea5e9] text-white font-bold'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            Potencial & Corrente
          </button>
        </div>
      </div>

      {/* Área do Gráfico SVG Industrial */}
      <div className="mt-4 bg-[#0a0e17] p-3 rounded-lg border border-[#1e293b]">
        {activeTab === 'PRESSAO_VAZAO' && (
          <div>
            <div className="flex justify-between text-xs text-[#94a3b8] mb-2 px-2 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#0ea5e9] inline-block"></span>
                Pressão Plenum (bar) [Escala Esquerda]
              </span>
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                <span className="w-3 h-0.5 bg-red-500 border-b border-dashed inline-block"></span>
                Limite Mecânico PEAD: 3.0 bar
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
                Vazão Skid (L/h)
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
              {/* Linhas de Grade */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                <line
                  key={i}
                  x1={padding.left}
                  y1={padding.top + r * chartH}
                  x2={width - padding.right}
                  y2={padding.top + r * chartH}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Linha Vermelha de Limite Mecânico Crítico PEAD (3.0 bar no range de 0 a 3.5 bar) */}
              {(() => {
                const maxP = 3.5;
                const y3bar = padding.top + (1 - 3.0 / maxP) * chartH;
                return (
                  <g>
                    <line
                      x1={padding.left}
                      y1={y3bar}
                      x2={width - padding.right}
                      y2={y3bar}
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text
                      x={width - padding.right - 5}
                      y={y3bar - 4}
                      fill="#ef4444"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      3.0 bar INTERLOCK FÍSICO
                    </text>
                  </g>
                );
              })()}

              {/* Curva de Pressão (0 a 3.5 bar) */}
              {(() => {
                const maxP = 3.5;
                const pathP = dataPoints
                  .map((d, i) => {
                    const x = getX(i);
                    const y = padding.top + (1 - Math.min(maxP, d.pressao_bar) / maxP) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <path
                    d={pathP}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })()}

              {/* Pontos de Pressão */}
              {dataPoints.map((d, i) => {
                const maxP = 3.5;
                const x = getX(i);
                const y = padding.top + (1 - Math.min(maxP, d.pressao_bar) / maxP) * chartH;
                const isOver = d.pressao_bar >= 3.0;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isOver ? 4 : 2}
                    fill={isOver ? '#ef4444' : '#0ea5e9'}
                  />
                );
              })}

              {/* Rótulos dos Eixos Y */}
              <text x={padding.left - 8} y={padding.top + 5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                3.5b
              </text>
              <text x={padding.left - 8} y={padding.top + chartH * 0.5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                1.75b
              </text>
              <text x={padding.left - 8} y={padding.top + chartH} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                0.0b
              </text>
            </svg>
          </div>
        )}

        {activeTab === 'FLUORETO' && (
          <div>
            <div className="flex justify-between text-xs text-[#94a3b8] mb-2 px-2 font-mono">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-0.5 bg-amber-400 inline-block"></span>
                Fluoreto Entrada (Afluente ppm)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
                Fluoreto Saída (Tratado ppm)
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3 h-0.5 bg-sky-400 border-b border-dashed inline-block"></span>
                Padrão Portaria GM/MS 888: 1.5 ppm
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
              {/* Linhas de Grade */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                <line
                  key={i}
                  x1={padding.left}
                  y1={padding.top + r * chartH}
                  x2={width - padding.right}
                  y2={padding.top + r * chartH}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Linha de Referência 1.5 ppm (Potabilidade) */}
              {(() => {
                const maxF = 15.0;
                const y15 = padding.top + (1 - 1.5 / maxF) * chartH;
                return (
                  <g>
                    <line
                      x1={padding.left}
                      y1={y15}
                      x2={width - padding.right}
                      y2={y15}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text
                      x={width - padding.right - 5}
                      y={y15 - 4}
                      fill="#38bdf8"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      1.5 ppm VMP Potabilidade
                    </text>
                  </g>
                );
              })()}

              {/* Curva de Fluoreto de Entrada */}
              {(() => {
                const maxF = 15.0;
                const pathIn = dataPoints
                  .map((d, i) => {
                    const x = getX(i);
                    const y = padding.top + (1 - Math.min(maxF, d.fluoreto_in_ppm) / maxF) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <path
                    d={pathIn}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                );
              })()}

              {/* Curva de Fluoreto de Saída */}
              {(() => {
                const maxF = 15.0;
                const pathOut = dataPoints
                  .map((d, i) => {
                    const x = getX(i);
                    const y = padding.top + (1 - Math.min(maxF, d.fluoreto_out_ppm) / maxF) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <path
                    d={pathOut}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })()}

              {/* Pontos de Saída */}
              {dataPoints.map((d, i) => {
                const maxF = 15.0;
                const x = getX(i);
                const y = padding.top + (1 - Math.min(maxF, d.fluoreto_out_ppm) / maxF) * chartH;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={2.5}
                    fill={d.fluoreto_out_ppm <= 1.5 ? '#10b981' : '#f59e0b'}
                  />
                );
              })}

              <text x={padding.left - 8} y={padding.top + 5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                15 ppm
              </text>
              <text x={padding.left - 8} y={padding.top + chartH} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                0 ppm
              </text>
            </svg>
          </div>
        )}

        {activeTab === 'ELETRICA' && (
          <div>
            <div className="flex justify-between text-xs text-[#94a3b8] mb-2 px-2 font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span>
                Tensão DC (V) - Alvo 1.40 V
              </span>
              <span className="flex items-center gap-1.5 text-[#0ea5e9]">
                <span className="w-3 h-0.5 bg-[#0ea5e9] inline-block"></span>
                Corrente do Skid (A)
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56">
              {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                <line
                  key={i}
                  x1={padding.left}
                  y1={padding.top + r * chartH}
                  x2={width - padding.right}
                  y2={padding.top + r * chartH}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Curva de Tensão (0 a 2.0 V) */}
              {(() => {
                const maxV = 2.0;
                const pathV = dataPoints
                  .map((d, i) => {
                    const x = getX(i);
                    const y = padding.top + (1 - Math.min(maxV, d.tensao_v) / maxV) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return <path d={pathV} fill="none" stroke="#10b981" strokeWidth="2.5" />;
              })()}

              {/* Curva de Corrente (0 a 30 A) */}
              {(() => {
                const maxA = 30.0;
                const pathA = dataPoints
                  .map((d, i) => {
                    const x = getX(i);
                    const y = padding.top + (1 - Math.min(maxA, d.corrente_amp) / maxA) * chartH;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return <path d={pathA} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3 2" />;
              })()}

              <text x={padding.left - 8} y={padding.top + 5} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                2.0V
              </text>
              <text x={padding.left - 8} y={padding.top + chartH} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                0.0V
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
