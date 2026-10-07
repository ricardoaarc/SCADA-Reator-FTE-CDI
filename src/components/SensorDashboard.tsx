/**
 * Painel Especializado de Instrumentação e Sensores Físico-Químicos
 * Monitoramento de pH, Fluoreto (ISE), Condutividade Elétrica, Temperatura, Pressão e Vazão
 * Reator FTE-CDI para Desfluoretação de Água
 */

import React from 'react';
import { 
  Droplet, 
  Thermometer, 
  Activity, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Waves,
  ShieldCheck,
  TrendingDown,
  Info
} from 'lucide-react';
import { SensorData } from '../types';

interface SensorDashboardProps {
  dados: SensorData;
}

export const SensorDashboard: React.FC<SensorDashboardProps> = ({ dados }) => {
  const isPotavel = dados.fluoretoOutPPM <= 1.5;
  const reducaoCondutividade = dados.condutividadeInUsCm > 0
    ? (((dados.condutividadeInUsCm - dados.condutividadeOutUsCm) / dados.condutividadeInUsCm) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Banner Informativo de Qualidade da Água */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        isPotavel 
          ? 'bg-emerald-950/20 border-emerald-500/40' 
          : 'bg-amber-950/30 border-amber-500/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${
            isPotavel 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Qualidade da Água Tratada: {isPotavel ? 'CONFORME (POTÁVEL)' : 'ATENÇÃO (NÃO POTÁVEL)'}
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                isPotavel 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}>
                Portaria GM/MS nº 888/2021
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Limite Máximo Permitido (LMP) para fluoreto em água de abastecimento humano: <strong>1.50 mg/L (ppm)</strong>.
              Valor atual no efluente: <strong className={isPotavel ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>{dados.fluoretoOutPPM.toFixed(2)} ppm</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#0a0e17] border border-[#1e293b]">
            <span className="text-[#64748b] block text-[10px]">Eficiência de Retenção:</span>
            <strong className="text-emerald-400 text-sm">{dados.eficienciaRemocaoPct.toFixed(1)}%</strong>
          </div>
          <div className="p-2 rounded-lg bg-[#0a0e17] border border-[#1e293b]">
            <span className="text-[#64748b] block text-[10px]">Alívio Condutividade:</span>
            <strong className="text-sky-400 text-sm">-{reducaoCondutividade}%</strong>
          </div>
        </div>
      </div>

      {/* Grade de 4 Grandes Instrumentos Físico-Químicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Transdutor de pH (AT-101) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">pH do Efluente</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              AT-101
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-white tracking-tight">
              {dados.ph.toFixed(2)}
            </div>
            <span className="text-xs text-[#94a3b8] block mt-1">
              Faixa de Conformidade: <strong>6.5 a 8.5</strong>
            </span>
          </div>

          {/* Barra de Escala de pH */}
          <div className="mt-4 pt-3 border-t border-[#1e293b]">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-emerald-500 to-blue-500 relative">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full shadow"
                style={{ left: `${Math.max(0, Math.min(100, ((dados.ph - 4) / 10) * 100))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-[#64748b] font-mono mt-1">
              <span>Ácido (4.0)</span>
              <span>Neutro (7.0)</span>
              <span>Básico (14.0)</span>
            </div>
          </div>
        </div>

        {/* 2. Sensor ISE de Fluoreto (ISE-101 / ISE-102) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                <Droplet className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Fluoreto (F⁻)</span>
            </div>
            <span className="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              ISE-102
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold font-mono text-sky-400 tracking-tight">
                {dados.fluoretoOutPPM.toFixed(2)}
              </div>
              <span className="text-sm font-normal text-[#94a3b8]">ppm (mg/L)</span>
            </div>
            <div className="text-xs text-[#94a3b8] mt-1 flex items-center justify-between">
              <span>Entrada Bruta:</span>
              <strong className="text-slate-200 font-mono">{dados.fluoretoInPPM.toFixed(2)} ppm</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748b]">Remoção Seletiva:</span>
            <strong className="text-emerald-400 font-bold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              {dados.eficienciaRemocaoPct.toFixed(1)}%
            </strong>
          </div>
        </div>

        {/* 3. Condutivímetro Industrial (CT-101 / CT-102) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Waves className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Condutividade</span>
            </div>
            <span className="text-[10px] font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              CT-102
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold font-mono text-purple-400 tracking-tight">
                {dados.condutividadeOutUsCm.toFixed(0)}
              </div>
              <span className="text-sm font-normal text-[#94a3b8]">µS/cm</span>
            </div>
            <div className="text-xs text-[#94a3b8] mt-1 flex items-center justify-between">
              <span>Entrada (CT-101):</span>
              <strong className="text-slate-200 font-mono">{dados.condutividadeInUsCm.toFixed(0)} µS/cm</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748b]">Redução Salina:</span>
            <strong className="text-sky-400 font-bold">-{reducaoCondutividade}%</strong>
          </div>
        </div>

        {/* 4. Transmissor de Temperatura (TT-101) */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <Thermometer className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Temperatura Skid</span>
            </div>
            <span className="text-[10px] font-mono text-orange-400 bg-orange-950 px-2 py-0.5 rounded border border-orange-800">
              TT-101
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold font-mono text-orange-400 tracking-tight">
                {dados.temperaturaC.toFixed(1)}
              </div>
              <span className="text-sm font-normal text-[#94a3b8]">°C</span>
            </div>
            <span className="text-xs text-[#94a3b8] block mt-1">
              Limite Térmico do PEAD: <strong>45.0 °C</strong>
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs">
            <span className="text-[#64748b]">Status Térmico:</span>
            <strong className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Normal (Isotérmico)
            </strong>
          </div>
        </div>
      </div>

      {/* Tabela Comparativa de Instrumentação e Faixas de Calibração */}
      <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
          Parâmetros de Calibração e Transmissão Analógica (4–20 mA)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-[#1e293b] text-[#94a3b8] uppercase text-[11px]">
                <th className="py-2.5 px-3">TAG</th>
                <th className="py-2.5 px-3">Variável</th>
                <th className="py-2.5 px-3">Sensor / Princípio</th>
                <th className="py-2.5 px-3">Faixa Calibrada</th>
                <th className="py-2.5 px-3">Valor Lido</th>
                <th className="py-2.5 px-3">Sinal 4-20mA</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-slate-300">
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">PT-101</td>
                <td className="py-2.5 px-3 font-sans">Pressão Plenum Entrada</td>
                <td className="py-2.5 px-3">Piezorresistivo Cerâmico</td>
                <td className="py-2.5 px-3">0.0 a 4.0 bar</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.pressaoBar.toFixed(2)} bar</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.pressaoBar / 4) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3"><span className="text-emerald-400">OPERACIONAL</span></td>
              </tr>
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">FT-101</td>
                <td className="py-2.5 px-3 font-sans">Vazão Total do Skid</td>
                <td className="py-2.5 px-3">Eletromagnético Industrial</td>
                <td className="py-2.5 px-3">0 a 2000 L/h</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.vazaoLitrosHora.toFixed(0)} L/h</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.vazaoLitrosHora / 2000) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3"><span className="text-emerald-400">OPERACIONAL</span></td>
              </tr>
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">ISE-102</td>
                <td className="py-2.5 px-3 font-sans">Fluoreto Efluente</td>
                <td className="py-2.5 px-3">Eletrodo Ion-Seletivo LaF3</td>
                <td className="py-2.5 px-3">0.1 a 20.0 ppm</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.fluoretoOutPPM.toFixed(2)} ppm</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.fluoretoOutPPM / 20) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3">
                  <span className={isPotavel ? 'text-emerald-400' : 'text-amber-400'}>
                    {isPotavel ? 'POTÁVEL' : 'LMP EXCEDIDO'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">AT-101</td>
                <td className="py-2.5 px-3 font-sans">pH Efluente</td>
                <td className="py-2.5 px-3">Eletrodo Vidro Combinado</td>
                <td className="py-2.5 px-3">0.0 a 14.0 pH</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.ph.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.ph / 14) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3"><span className="text-emerald-400">OPERACIONAL</span></td>
              </tr>
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">CT-102</td>
                <td className="py-2.5 px-3 font-sans">Condutividade Saída</td>
                <td className="py-2.5 px-3">Célula Toroidal 4-Polos</td>
                <td className="py-2.5 px-3">0 a 5000 µS/cm</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.condutividadeOutUsCm.toFixed(0)} µS/cm</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.condutividadeOutUsCm / 5000) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3"><span className="text-emerald-400">OPERACIONAL</span></td>
              </tr>
              <tr className="hover:bg-[#0a0e17]/50">
                <td className="py-2.5 px-3 text-sky-400 font-bold">TT-101</td>
                <td className="py-2.5 px-3 font-sans">Temperatura</td>
                <td className="py-2.5 px-3">Termorresistência Pt100</td>
                <td className="py-2.5 px-3">0 a 100 °C</td>
                <td className="py-2.5 px-3 font-bold text-slate-100">{dados.temperaturaC.toFixed(1)} °C</td>
                <td className="py-2.5 px-3 text-emerald-400">{(4 + (dados.temperaturaC / 100) * 16).toFixed(1)} mA</td>
                <td className="py-2.5 px-3"><span className="text-emerald-400">OPERACIONAL</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
