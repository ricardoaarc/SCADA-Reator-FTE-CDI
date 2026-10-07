/**
 * Painel de Balanço e Distribuição Hidráulica do Manifold DN200 (16 Células / 180 m³/h)
 * Protocolo de Comissionamento Teste T4:
 * Desvio de vazão célula a célula deve ser estritamente inferior a 10% em relação à média.
 */

import React from 'react';
import { 
  GitFork, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  ArrowDownUp, 
  Gauge, 
  Layers,
  HelpCircle
} from 'lucide-react';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';

export const ManifoldBalancingPanel: React.FC = () => {
  const balanco = controllerV2Instance.calcularBalancoManifold();

  return (
    <div className="space-y-6">
      {/* Header do Manifold */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0d1728] via-[#122038] to-[#0d1829] border border-sky-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <GitFork className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Balanço Hidráulico do Manifold Principal PEAD DN200 (8")
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                  balanco.aprovadoT4
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                    : 'bg-red-950 text-red-300 border border-red-600'
                }`}>
                  {balanco.aprovadoT4 ? 'TESTE T4: CONFORME (< 10% DESVIO)' : 'TESTE T4: NÃO CONFORME (> 10% DESVIO)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Monitoramento da distribuição uniforme de 180 m³/h (50 L/s) entre as 16 células em paralelo (~11,25 m³/h nominal por célula).
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono">
            <div className="text-slate-400">Vazão Total do Coletor:</div>
            <div className="text-xl font-bold text-sky-400">{balanco.vazaoTotalM3h.toFixed(1)} m³/h</div>
            <div className="text-[11px] text-slate-500">Média: {(balanco.vazaoMediaPorCelulaLh / 1000).toFixed(2)} m³/h/célula</div>
          </div>
        </div>

        {/* Métricas do Teste T4 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs font-mono">
          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Desvio Máximo Detectado</span>
            <span className={`text-lg font-bold mt-0.5 block ${balanco.desvioMaximoDetectadoPct > 10.0 ? 'text-red-400' : 'text-emerald-400'}`}>
              ± {balanco.desvioMaximoDetectadoPct.toFixed(2)} %
            </span>
            <span className="text-[10px] text-slate-500">Critério de Aceite: &le; 10,0%</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Tubulação e Coletor</span>
            <span className="text-base font-bold text-white mt-0.5 block">PEAD DN200 (8") PN10</span>
            <span className="text-[10px] text-slate-500">Velocidade: ~1,6 m/s (ideal)</span>
          </div>

          <div className="bg-[#070c16] p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Status de Comissionamento</span>
            <span className={`text-base font-bold mt-0.5 block ${balanco.aprovadoT4 ? 'text-emerald-400' : 'text-red-400'}`}>
              {balanco.aprovadoT4 ? 'Manifold Balanceado' : 'Ajustar Válvulas Borboleta'}
            </span>
            <span className="text-[10px] text-slate-500">16 ramais balanceados</span>
          </div>
        </div>
      </div>

      {/* Tabela de Distribuição Célula a Célula */}
      <div className="p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-sky-400" />
            Distribuição de Vazão nas 16 Células (Teste T4)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Vazão Alvo por Célula: 11.250 L/h (11,25 m³/h)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-[#070c16] text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Célula</th>
                <th className="py-2.5 px-3">Vazão (L/h)</th>
                <th className="py-2.5 px-3">Vazão (m³/h)</th>
                <th className="py-2.5 px-3">Pressão Entrada</th>
                <th className="py-2.5 px-3">Desvio vs Média</th>
                <th className="py-2.5 px-3">Critério T4 (&le; 10%)</th>
                <th className="py-2.5 px-3">Balanço Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {balanco.celulas.map((c: any) => {
                const isCritico = Math.abs(c.desvio_em_relacao_a_media_pct) > 10.0;

                return (
                  <tr key={c.celula_id} className="hover:bg-[#152033] transition">
                    <td className="py-2.5 px-3 font-bold text-sky-400">{c.codigo}</td>
                    <td className="py-2.5 px-3 text-slate-200">{c.vazao_l_h.toFixed(0)} L/h</td>
                    <td className="py-2.5 px-3 text-white font-bold">{c.vazao_m3_h.toFixed(2)} m³/h</td>
                    <td className="py-2.5 px-3 text-slate-300">{c.pressao_bar.toFixed(2)} bar</td>
                    <td className={`py-2.5 px-3 font-bold ${isCritico ? 'text-red-400' : 'text-emerald-400'}`}>
                      {c.desvio_em_relacao_a_media_pct > 0 ? `+${c.desvio_em_relacao_a_media_pct}%` : `${c.desvio_em_relacao_a_media_pct}%`}
                    </td>
                    <td className="py-2.5 px-3">
                      {isCritico ? (
                        <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[10px]">
                          <XCircle className="w-3.5 h-3.5" /> Desvio Alto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado T4
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 w-44">
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex items-center">
                        <div 
                          className={`h-full rounded-full ${isCritico ? 'bg-red-500' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(100, (c.vazao_l_h / 15000) * 100)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
