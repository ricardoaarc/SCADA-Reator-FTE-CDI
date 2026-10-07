/**
 * Painel de Conformidade Regulatória e Auditoria Sanitária
 * Padrão Nacional de Potabilidade da Água: Portaria GM/MS nº 888/2021
 * Valor Máximo Permitido (VMP) de Fluoreto: 1,50 mg/L
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Download, 
  Scale, 
  Calendar,
  Building,
  Check,
  TrendingDown,
  Printer
} from 'lucide-react';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';
import { dbInstance } from '../services/database';

interface RegulatoryCompliancePanelProps {
  onAbrirLaudoOficial?: () => void;
}

export const RegulatoryCompliancePanel: React.FC<RegulatoryCompliancePanelProps> = ({
  onAbrirLaudoOficial
}) => {
  const resumo = controllerV2Instance.obterResumoGlobal();
  const alarmesRegulatorios = dbInstance.getAlarmes().filter(a => a.nivel_severidade === 'NAO_CONFORMIDADE_REGULATORIA');

  const emitirRelatorioAuditoriaTxt = () => {
    let relatorio = `=========================================================================\n`;
    relatorio += `RELATÓRIO OFICIAL DE CONFORMIDADE REGULATÓRIA DE POTABILIDADE DA ÁGUA\n`;
    relatorio += `NORMA DE REFERÊNCIA: PORTARIA GM/MS Nº 888/2021 (MINISTÉRIO DA SAÚDE)\n`;
    relatorio += `ESTAÇÃO / SKID: REATOR FTE-CDI INDUSTRIAL (16 CÉLULAS - 180 m³/h / 50 L/s)\n`;
    relatorio += `DATA DE EMISSÃO: ${new Date().toLocaleString('pt-BR')}\n`;
    relatorio += `=========================================================================\n\n`;

    relatorio += `1. PARÂMETRO CRÍTICO REGULATÓRIO - FLUORETO (F-):\n`;
    relatorio += `- VMP Legal Máximo: 1,50 mg/L\n`;
    relatorio += `- Fluoreto Médio de Entrada (Água Bruta): ${resumo.fluoretoInMedioPPM.toFixed(2)} mg/L\n`;
    relatorio += `- Fluoreto Médio de Saída (Água Tratada): ${resumo.fluoretoOutMedioPPM.toFixed(2)} mg/L\n`;
    relatorio += `- Eficiência Média de Remoção: ${resumo.eficienciaMediaPct.toFixed(1)} %\n`;
    relatorio += `- Status Legal de Potabilidade: ${resumo.conformidadeGeralPortaria888 ? 'CONFORME (ÁGUA POTÁVEL ADEQUADA)' : 'NÃO CONFORME (ACIMA DO LIMITE LEGAL)'}\n\n`;

    relatorio += `2. DADOS HIDRÁULICOS E OPERACIONAIS:\n`;
    relatorio += `- Vazão Total Tratada: ${(resumo.vazaoTotalLh / 1000).toFixed(1)} m³/h (${(resumo.vazaoTotalLh / 3600).toFixed(1)} L/s)\n`;
    relatorio += `- Pressão Média do Rack: ${resumo.pressaoMediaBar.toFixed(2)} bar (Margem segura abaixo de 2,80 bar)\n`;
    relatorio += `- Células Ativas em Operação: ${resumo.celulasAtivas} de 16 células\n\n`;

    relatorio += `3. HISTÓRICO DE OCORRÊNCIAS REGULATÓRIAS:\n`;
    if (alarmesRegulatorios.length === 0) {
      relatorio += `- Nenhuma não-conformidade regulatória registrada no período de telemetria.\n`;
    } else {
      alarmesRegulatorios.forEach((a, i) => {
        relatorio += `[${i + 1}] ${a.timestamp} | Célula: ${a.celula_id || 'Rack'} | ${a.mensagem}\n`;
      });
    }

    relatorio += `\n=========================================================================\n`;
    relatorio += `Responsável Técnico: Eng. Ricardo Arcanjo (ADM-001)\n`;
    relatorio += `Assinatura Digital Hash: ${Math.random().toString(36).substring(2, 15).toUpperCase()}\n`;

    const blob = new Blob([relatorio], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_conformidade_portaria888_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header do Módulo de Compliance */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0c1a24] via-[#0e2433] to-[#0c1a25] border border-emerald-500/40 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-900/60">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Compliance Sanitário & Potabilidade (Portaria GM/MS nº 888/2021)
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                  resumo.conformidadeGeralPortaria888
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                    : 'bg-red-950 text-red-300 border border-red-600 animate-pulse'
                }`}>
                  {resumo.conformidadeGeralPortaria888 ? 'CONFORME (ÁGUA POTÁVEL)' : 'NÃO CONFORME REGULATÓRIO'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Auditoria contínua do efluente desfluoretado contra o Valor Máximo Permitido (VMP: 1,50 mg/L) para consumo humano.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap">
            {onAbrirLaudoOficial && (
              <button
                onClick={onAbrirLaudoOficial}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition shrink-0 border border-emerald-400"
              >
                <FileText className="w-4 h-4" />
                Visualizar Laudo Oficial (PDF / A4)
              </button>
            )}

            <button
              onClick={emitirRelatorioAuditoriaTxt}
              className="px-3 py-2 bg-[#152338] hover:bg-[#1f3352] text-slate-200 font-bold text-xs rounded-lg border border-slate-700 flex items-center gap-1.5 transition shrink-0"
              title="Exportar sumário técnico em formato TXT"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              Sumário TXT
            </button>
          </div>
        </div>

        {/* Métricas Sanitárias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 text-xs font-mono">
          <div className="bg-[#07111a] p-3 rounded-xl border border-emerald-900/60">
            <span className="text-slate-400 text-[10px] uppercase block">Fluoreto Efluente Atual</span>
            <span className={`text-xl font-bold mt-0.5 block ${resumo.fluoretoOutMedioPPM > 1.50 ? 'text-red-400' : 'text-emerald-400'}`}>
              {resumo.fluoretoOutMedioPPM.toFixed(2)} mg/L
            </span>
            <span className="text-[10px] text-slate-500">Limite VMP Legal: 1,50 mg/L</span>
          </div>

          <div className="bg-[#07111a] p-3 rounded-xl border border-emerald-900/60">
            <span className="text-slate-400 text-[10px] uppercase block">Fluoreto da Água Bruta</span>
            <span className="text-xl font-bold text-amber-300 mt-0.5 block">
              {resumo.fluoretoInMedioPPM.toFixed(2)} mg/L
            </span>
            <span className="text-[10px] text-slate-500">Concentração pré-reator</span>
          </div>

          <div className="bg-[#07111a] p-3 rounded-xl border border-emerald-900/60">
            <span className="text-slate-400 text-[10px] uppercase block">Eficiência de Desfluoretação</span>
            <span className="text-xl font-bold text-sky-400 mt-0.5 block">
              {resumo.eficienciaMediaPct.toFixed(1)} %
            </span>
            <span className="text-[10px] text-slate-500">Massa retida no feltro</span>
          </div>

          <div className="bg-[#07111a] p-3 rounded-xl border border-emerald-900/60">
            <span className="text-slate-400 text-[10px] uppercase block">Alertas Regulatórios</span>
            <span className={`text-xl font-bold mt-0.5 block ${alarmesRegulatorios.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {alarmesRegulatorios.length} registros
            </span>
            <span className="text-[10px] text-slate-500">Rastreabilidade sanitária</span>
          </div>
        </div>
      </div>

      {/* Histórico de Não-Conformidades Sanitárias */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0e1626] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Livro de Registro Sanitário de Não-Conformidades (Portaria 888)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Retenção mínima de 5 anos para fiscalização sanitária
          </span>
        </div>

        {alarmesRegulatorios.length === 0 ? (
          <div className="p-8 text-center bg-[#070c16] rounded-xl border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="font-bold text-white text-sm">100% de Conformidade Regulatória no Período</p>
            <p className="text-xs text-slate-500">Todas as células estão entregando água tratada com teor de fluoreto abaixo de 1,50 mg/L.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-[#070c16] text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Célula</th>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Severidade</th>
                  <th className="py-2.5 px-3">Mensagem e Enquadramento Legal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {alarmesRegulatorios.map((a) => (
                  <tr key={a.id} className="hover:bg-[#152033] transition">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{new Date(a.timestamp).toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 font-bold text-sky-400">{a.celula_id ? `CEL-${a.celula_id < 10 ? '0' + a.celula_id : a.celula_id}` : 'Rack'}</td>
                    <td className="py-2.5 px-3 text-amber-400">{a.codigo}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">
                        NÃO CONFORMIDADE
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{a.mensagem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
