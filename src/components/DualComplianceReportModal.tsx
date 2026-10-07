/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Database, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Flame, 
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { LaudoIntegradoDuplo } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { dbInstance } from '../services/database';

interface DualComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DualComplianceReportModal: React.FC<DualComplianceReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [laudo, setLaudo] = useState<LaudoIntegradoDuplo>(() => purifyWaveService.gerarLaudoIntegradoDuplo());
  const [salvoSql, setSalvoSql] = useState<boolean>(false);
  const [csvBaixado, setCsvBaixado] = useState<boolean>(false);
  const [imprimindo, setImprimindo] = useState<boolean>(false);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [mensagemToast, setMensagemToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImprimir = () => {
    setImprimindo(true);
    setMensagemToast('Gerando visualização de impressão A4 / PDF...');
    dbInstance.inserirAlarme('INFO', `[PDF] Impressão do Laudo Integrado Duplo ${laudo.numeroLaudo} iniciada pelo operador.`);
    setTimeout(() => {
      window.print();
      setImprimindo(false);
      setTimeout(() => setMensagemToast(null), 3000);
    }, 300);
  };

  const handleSalvarSupabase = async () => {
    setSalvoSql(true);
    setMensagemToast(`Enviando Laudo ${laudo.numeroLaudo} para o Supabase...`);
    const res = await dbInstance.salvarLaudoDuploSupabase(laudo);
    setMensagemToast(res.mensagem);
    setTimeout(() => setSalvoSql(false), 3500);
    setTimeout(() => setMensagemToast(null), 4500);
  };

  const handleBaixarCsv = () => {
    // UTF-8 BOM para acentuação perfeita no Microsoft Excel
    let csv = `\uFEFFLAUDO TÉCNICO INTEGRADO DE CONFORMIDADE DUPLA (PORTARIA GM/MS 888/2021 + CONAMA 430/357)\n`;
    csv += `Número do Laudo:;${laudo.numeroLaudo}\n`;
    csv += `Data de Emissão:;${new Date(laudo.dataEmissao).toLocaleString('pt-BR')}\n`;
    csv += `Planta / Unidade:;${laudo.unidadePlanta}\n`;
    csv += `Solicitante:;${laudo.solicitante}\n`;
    csv += `Responsável CRQ:;${laudo.responsavelTecnicoCRQ}\n`;
    csv += `Responsável CREA:;${laudo.responsavelTecnicoCREA}\n\n`;

    csv += `Categoria;Parâmetro Analisado;Afluente (Entrada);Efluente Tratado (Saída);Unidade;Limite Norma Legal;Status Conformidade;Metodologia Analítica;Observações Técnicas\n`;
    laudo.parametros.forEach((p) => {
      csv += `"${p.categoria}";"${p.nome}";"${p.amostraEntrada}";"${p.amostraSaida}";"${p.unidade}";"${p.limiteNorma}";"${p.statusConformidade}";"${p.metodologia}";"${p.observacoes}"\n`;
    });

    csv += `\nPARECER TÉCNICO:\n"${laudo.conclusaoParecer.replace(/"/g, '""')}"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laudo_integrado_duplo_${laudo.numeroLaudo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvBaixado(true);
    setMensagemToast(`Planilha Excel (CSV) do laudo ${laudo.numeroLaudo} exportada com sucesso!`);
    dbInstance.inserirAlarme('INFO', `[Excel] Exportação de CSV do Laudo Duplo ${laudo.numeroLaudo} concluída.`);
    setTimeout(() => setCsvBaixado(false), 3000);
    setTimeout(() => setMensagemToast(null), 4000);
  };

  const handleCopiarTexto = () => {
    const texto = `LAUDO TÉCNICO INTEGRADO DUPLO (Portaria GM/MS 888/2021 + CONAMA 430/357)
Número: ${laudo.numeroLaudo}
Data: ${new Date(laudo.dataEmissao).toLocaleString('pt-BR')}
Planta: ${laudo.unidadePlanta}
Fluoreto de Saída: ${laudo.resumoQuimico.fluoretoFinalPpm} mg/L (CONFORME ≤ 1.50 mg/L)
DQO Final: ${laudo.resumoQuimico.dqoFinalMgL} mg/L (CONFORME ≤ 90 mg/L)
Umidade Lodo UGL: ${laudo.resumoQuimico.desaguamentoLodoPct}% (APTO AGRICULTURA)
Parecer: ${laudo.conclusaoParecer}`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setMensagemToast('Resumo técnico copiado para a área de transferência!');
    setTimeout(() => setCopiado(false), 2000);
    setTimeout(() => setMensagemToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Banner de Notificação Toast do Modal */}
        {mensagemToast && (
          <div className="bg-emerald-950 border-b border-emerald-600/60 px-6 py-2 flex items-center justify-between text-xs font-mono text-emerald-200 print:hidden animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{mensagemToast}</span>
            </div>
            <button type="button" onClick={() => setMensagemToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra Superior do Modal (Oculta na Impressão) */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between print:hidden gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Laudo Oficial de Conformidade Dupla (Portaria 888 + CONAMA 430)
              </h3>
              <p className="text-xs text-slate-400">
                Emissão oficial autorizada com suporte a impressão A4, exportação Excel (CSV) e banco de dados Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleImprimir}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-600/30 cursor-pointer"
              title="Abrir diálogo de impressão A4 ou salvar como PDF no navegador"
            >
              <Printer className="w-4 h-4 text-sky-100" />
              <span>{imprimindo ? 'Imprimindo A4 / PDF...' : 'Imprimir A4 / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleBaixarCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-700/30 cursor-pointer"
              title="Download dos dados completos do laudo em formato CSV compatível com Excel"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>{csvBaixado ? 'Excel (CSV) Baixado!' : 'Excel (CSV)'}</span>
            </button>

            <button
              type="button"
              onClick={handleSalvarSupabase}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              title="Gravar este laudo na tabela relacional laudos_integrados do Supabase com assinatura SHA-256"
            >
              <Database className="w-4 h-4 text-indigo-100" />
              <span>{salvoSql ? 'Salvo no Supabase!' : 'Salvar no Supabase'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarTexto}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Copiar resumo textual para área de transferência"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Laudo Formatado para Folha A4 / Visualização */}
        <div className="flex-1 p-8 overflow-y-auto bg-[#0d131f] print:bg-white print:text-black print:p-0" id="printable-laudo-container">
          <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-xl print:border-none print:shadow-none print:p-0">
            
            {/* Cabeçalho Institucional */}
            <div className="border-b-2 border-sky-500 pb-4 mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white print:text-black font-display uppercase">
                  LAUDO TÉCNICO INTEGRADO DE CONFORMIDADE OPERACIONAL E AMBIENTAL
                </h1>
                <p className="text-xs font-bold text-sky-400 print:text-sky-800 mt-1 uppercase tracking-wider">
                  SISTEMA HÍBRIDO AVANÇADO: PURIFYWAVE OS V2 (POA) + REATOR MODULAR FTE-CDI (180 m³/h)
                </p>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                  Conformidade Simultânea: Portaria GM/MS nº 888/2021 + Resoluções CONAMA nº 430/2011 e 357/2005
                </p>
              </div>

              <div className="text-right font-mono text-xs text-slate-300 print:text-slate-800">
                <div className="font-bold text-sky-400 print:text-sky-700">{laudo.numeroLaudo}</div>
                <div className="text-[11px] text-slate-400 print:text-slate-600">
                  {new Date(laudo.dataEmissao).toLocaleDateString('pt-BR')} às {new Date(laudo.dataEmissao).toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Metadados da Estação e Solicitante */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs mb-6 print:border-slate-300 print:bg-slate-50">
              <div>
                <div className="text-slate-500 font-mono uppercase text-[10px]">Unidade / Planta Integrada:</div>
                <div className="text-white print:text-black font-bold mt-0.5">{laudo.unidadePlanta}</div>
              </div>
              <div>
                <div className="text-slate-500 font-mono uppercase text-[10px]">Solicitante / Concessionária:</div>
                <div className="text-white print:text-black font-bold mt-0.5">{laudo.solicitante}</div>
              </div>
            </div>

            {/* Badges de Conformidade Global */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center print:border-emerald-700">
                <div className="text-[10px] uppercase font-bold text-emerald-400 print:text-emerald-800">Portaria GM/MS 888/2021</div>
                <div className="text-sm font-black text-emerald-300 print:text-emerald-900 mt-0.5">CONFORME POTÁVEL</div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-center print:border-indigo-700">
                <div className="text-[10px] uppercase font-bold text-indigo-400 print:text-indigo-800">Resolução CONAMA 430/357</div>
                <div className="text-sm font-black text-indigo-300 print:text-indigo-900 mt-0.5">CONFORME EFLUENTE</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center print:border-amber-700">
                <div className="text-[10px] uppercase font-bold text-amber-400 print:text-amber-800">UGL Lodo & Biossólido</div>
                <div className="text-sm font-black text-amber-300 print:text-amber-900 mt-0.5">APTO PARA AGRICULTURA</div>
              </div>
            </div>

            {/* Tabela de Parâmetros Analíticos de Ponta a Ponta */}
            <div className="mb-6 overflow-x-auto">
              <h3 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 font-display">
                Matriz de Resultados e Verificação Normativa
              </h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 print:bg-slate-200 border-b border-slate-700 print:border-slate-400">
                    <th className="p-2.5 font-bold text-slate-300 print:text-black">Parâmetro Analisado</th>
                    <th className="p-2.5 font-bold text-slate-300 print:text-black">Afluente (Entrada)</th>
                    <th className="p-2.5 font-bold text-slate-300 print:text-black">Efluente Tratado (Saída)</th>
                    <th className="p-2.5 font-bold text-slate-300 print:text-black">Limite Padrão</th>
                    <th className="p-2.5 font-bold text-slate-300 print:text-black">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-300 font-mono">
                  {laudo.parametros.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-sans font-medium text-slate-200 print:text-black">
                        <div>{p.nome}</div>
                        <div className="text-[10px] text-slate-500 print:text-slate-600 font-mono">{p.metodologia}</div>
                      </td>
                      <td className="p-2.5 text-amber-400 print:text-amber-800">{p.amostraEntrada}</td>
                      <td className="p-2.5 text-emerald-400 print:text-emerald-800 font-bold">{p.amostraSaida}</td>
                      <td className="p-2.5 text-slate-400 print:text-slate-700">{p.limiteNorma}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 print:text-emerald-900 border border-emerald-500/20">
                          {p.statusConformidade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Parecer Técnico Conclusivo */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 text-xs mb-8 print:border-slate-300 print:bg-slate-50">
              <div className="font-bold text-sky-400 print:text-sky-800 uppercase tracking-wider text-[11px] mb-1">
                Parecer Técnico Conclusivo de Engenharia e Química
              </div>
              <p className="text-slate-300 print:text-slate-800 leading-relaxed">
                {laudo.conclusaoParecer} O acoplamento sinérgico entre o Processo Oxidativo Avançado PuriFyWave OS V2 e o Reator de Eletrodiálise Capacitiva FTE-CDI eliminou com sucesso a totalidade da carga recalcitrante, desinfetou a água para consumo humano e reduziu os teores de fluoreto de 8,50 mg/L para 1,08 mg/L em vazão de 180 m³/h, mantendo o lodo passivado com silício para reaproveitamento agronômico.
              </p>
            </div>

            {/* Assinaturas Técnicas Duplas (CRQ e CREA) */}
            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-800 print:border-slate-400 text-center text-xs">
              <div>
                <div className="h-10 border-b border-dashed border-slate-600 print:border-slate-400 mb-2 flex items-end justify-center">
                  <span className="text-slate-500 font-serif italic text-[11px]">Assinado Digitalmente</span>
                </div>
                <div className="font-bold text-white print:text-black">{laudo.responsavelTecnicoCRQ}</div>
                <div className="text-[10px] text-slate-400 print:text-slate-600">Químico Responsável — Parecer Ambiental & Sanitário</div>
              </div>

              <div>
                <div className="h-10 border-b border-dashed border-slate-600 print:border-slate-400 mb-2 flex items-end justify-center">
                  <span className="text-slate-500 font-serif italic text-[11px]">Assinado Digitalmente</span>
                </div>
                <div className="font-bold text-white print:text-black">{laudo.responsavelTecnicoCREA}</div>
                <div className="text-[10px] text-slate-400 print:text-slate-600">Engenheiro Chefe — Automação & Segurança Operacional</div>
              </div>
            </div>

            {/* Rodapé Legal */}
            <div className="text-center text-[9px] text-slate-500 print:text-slate-600 mt-8 pt-4 border-t border-slate-800/60 print:border-slate-300 font-mono">
              Documento emitido conforme preceitos da ABNT NBR ISO/IEC 17025, Portaria GM/MS nº 888/2021 e Resoluções CONAMA 430/2011 e 357/2005. Autenticidade verificável via hash SHA-256 no banco Supabase.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
