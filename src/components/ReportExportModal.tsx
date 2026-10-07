/**
 * Modal de Exportação de Relatórios Técnicos (Excel e Laudo Técnico PDF)
 * Reator FTE-CDI - Desfluoretação
 */

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  ShieldCheck,
  Calendar,
  Layers,
  Database,
  UserCheck
} from 'lucide-react';
import { CicloReator, TelemetriaSensor, Alarme, SensorData, OperatorProfile } from '../types';
import { reportService } from '../services/ReportService';
import { authService } from '../services/AuthService';

interface ReportExportModalProps {
  ciclos: CicloReator[];
  telemetrias: TelemetriaSensor[];
  alarmes: Alarme[];
  dadosSensores: SensorData;
  operadorAtual: OperatorProfile;
  onFechar: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  ciclos,
  telemetrias,
  alarmes,
  dadosSensores,
  operadorAtual,
  onFechar,
}) => {
  const [downloadConcluido, setDownloadConcluido] = useState<string | null>(null);

  const handleExportarExcel = () => {
    reportService.exportarPlanilhaExcel(ciclos, telemetrias, alarmes);
    setDownloadConcluido('Planilha Excel gerada e enviada para download com sucesso!');
    setTimeout(() => setDownloadConcluido(null), 4000);
  };

  const handleGerarPdf = () => {
    const cicloAtivo = ciclos.find(c => c.status === 'EM_ANDAMENTO') || ciclos[ciclos.length - 1];
    reportService.gerarLaudoTecnicoPDF(dadosSensores, cicloAtivo, alarmes);
    setDownloadConcluido('Laudo Técnico gerado em nova janela para impressão / PDF.');
    setTimeout(() => setDownloadConcluido(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#151b2b] border border-[#334155] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#0a0e17] border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Exportação de Relatórios de Operação & Conformidade
              </h3>
              <span className="text-[11px] text-[#94a3b8]">
                Formatos homologados para engenharia (Excel / CSV) e auditoria de qualidade (PDF)
              </span>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-[#94a3b8] hover:text-white p-1 rounded hover:bg-[#1e293b]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-4">
          {downloadConcluido && (
            <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadConcluido}</span>
            </div>
          )}

          {/* Resumo do Banco de Dados a ser exportado */}
          <div className="p-3 rounded-lg bg-[#0a0e17] border border-[#1e293b] grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <span className="text-[#64748b] block text-[10px]">Ciclos Gravados:</span>
              <strong className="text-sky-400 text-sm">{ciclos.length}</strong>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px]">Leituras Sensores:</span>
              <strong className="text-emerald-400 text-sm">{telemetrias.length}</strong>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px]">Alarmes Registrados:</span>
              <strong className="text-amber-400 text-sm">{alarmes.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cartão 1: Planilha Excel */}
            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e293b] hover:border-emerald-500/50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <h4 className="text-sm font-bold text-white">Planilha Excel (.CSV)</h4>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Exporta dados brutos tabulados com codificação UTF-8 e ponto-e-vírgula: Ciclos de Adsorção/Regeneração, vazão, pressão, potencial elétrico, pH, condutividade e remoção de fluoreto.
                </p>
              </div>

              <button
                onClick={handleExportarExcel}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md"
              >
                <Download className="w-4 h-4" />
                Baixar Planilha Excel
              </button>
            </div>

            {/* Cartão 2: Laudo Técnico PDF */}
            <div className="p-4 rounded-xl bg-[#0a0e17] border border-[#1e293b] hover:border-sky-500/50 transition flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sky-400 mb-2">
                  <FileText className="w-5 h-5" />
                  <h4 className="text-sm font-bold text-white">Laudo Técnico (PDF)</h4>
                </div>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Documento formal em padrão ABNT com atestado de conformidade da Portaria GM/MS nº 888/2021 (LMP ≤ 1.5 ppm F⁻), resumo de segurança do Plenum PEAD e campo de assinatura técnica.
                </p>
              </div>

              <button
                onClick={handleGerarPdf}
                className="w-full py-2 bg-sky-700 hover:bg-sky-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md"
              >
                <Printer className="w-4 h-4" />
                Gerar Laudo / Salvar PDF
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#0a0e17] rounded-lg border border-[#1e293b] flex items-center justify-between text-xs text-[#94a3b8]">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Emissor: <strong>{operadorAtual.nome}</strong> ({operadorAtual.matricula} - {operadorAtual.role})
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#64748b]">Rastreabilidade Ativa</span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-[#0a0e17] border-t border-[#1e293b] flex justify-end">
          <button
            onClick={onFechar}
            className="px-4 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs font-semibold"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};
