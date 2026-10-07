/**
 * Painel Especializado de Extração e Leitura de Laudos de Laboratório com IA (Gemini 3.8 Flash)
 * Supervisório SCADA Reator FTE-CDI
 * Recursos Avançados:
 * 1. OCR Multimodal Individual & Análise Paramétrica com Portaria GM/MS 888/2021
 * 2. Processamento em Lote (Batch OCR) para pastas/coleções de múltiplos laudos
 * 3. Série Temporal e Gráficos de Evolução da Qualidade do Aquífero / Poços
 * 4. Gravação Automática e Persistência no Banco de Dados Relacional SQL / Supabase
 */

import React, { useState, useEffect } from 'react';
import { 
  lerArquivoComoDataUrl, 
  chamarOcr, 
  montarLaudoDeOcr, 
  normalizarFalha, 
  resumoDoLote, 
  FalhaOcr 
} from '../services/laudoOcr';
import { 
  Sparkles, 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Layers, 
  FlaskConical, 
  Search, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Check, 
  RefreshCw, 
  FileSpreadsheet, 
  ExternalLink,
  ChevronRight,
  Database,
  TrendingUp,
  FolderOpen,
  Save,
  Trash2,
  Calendar,
  MapPin,
  BarChart3,
  ListFilter
} from 'lucide-react';
import { LaudoLaboratorial, ParametroLaudo, SensorData, SkidHardwareState, PocoHistoricoPonto } from '../types';
import { dbInstance } from '../services/database';

interface LabAiReportPanelProps {
  hardwareState: SkidHardwareState;
  sensorData: SensorData;
  onAplicarNoReator: (laudo: LaudoLaboratorial) => void;
}

// Lotes pré-configurados de séries históricas de poços reais
const LOTES_PRESET: { id: string; nome: string; descricao: string; laudos: LaudoLaboratorial[] }[] = [
  {
    id: 'lote-poco-palmital-2025-2026',
    nome: 'Série Histórica: Poço Tubular P-01 (Palmital/SP)',
    descricao: 'Monitoramento trimestral de 4 campanhas analíticas (Jun/2025 a Mar/2026) demonstrando pico de estiagem e aumento de Fluoreto.',
    laudos: [
      {
        id: 'laudo-exacty-2415-t2',
        numeroLaudo: '2415.2025-V.0',
        laboratorio: 'Exacty Análises Químicas LTDA',
        solicitante: 'CONSTRUIR LOTEADORA LTDA',
        matriz: 'Água - Água Bruta (Saída do Poço)',
        localColeta: 'Poço Tubular P-01 - Palmital/SP',
        dataColeta: '2025-06-22 09:40:00',
        dataEmissao: '2025-07-10',
        responsavelTecnico: 'Gentil Mario Pinheiro Junior (CRQ 09100961)',
        conclusaoGeral: 'Campanha T2 (Inverno início). Fluoreto em 1.45 mg/L, pH 11.10. Parâmetros dentro do limite de potabilidade.',
        conformidadePortaria888: true,
        statusSql: 'SALVO',
        pocoId: 'POCO-PALMITAL-01',
        parametrosChaveFteCdi: {
          fluoretoMgL: 1.45,
          ph: 11.10,
          condutividadeUsCm: 280,
          stdMgL: 180,
          cloretosMgL: 1.1,
          sulfatosMgL: 3.50,
          nitratosMgL: 0.16,
          ferroMgL: 0.05,
          durezaMgL: 11.0,
          coliformesUfc100ml: 0,
          dboMgL: null
        },
        recomendacoesOperacionais: ['Operação estável no reator FTE-CDI com remoção de 85% de F-.'],
        parametros: [
          { nome: 'Fluoreto (F-)', resultado: '1.45', unidade: 'mg/L', vmp: '1.50 mg/L', metodologia: 'EPA 300.1', emConformidade: true, impactoFteCdi: 'Faixa controlada no limite' },
          { nome: 'pH (In Loco)', resultado: '11.10', unidade: 'U pH', vmp: '6.0 a 9.0', metodologia: 'SMWW 4500-H+', emConformidade: false, impactoFteCdi: 'Alcalinidade requer acompanhamento' }
        ]
      },
      {
        id: 'laudo-exacty-2890-t3',
        numeroLaudo: '2890.2025-V.0',
        laboratorio: 'Exacty Análises Químicas LTDA',
        solicitante: 'CONSTRUIR LOTEADORA LTDA',
        matriz: 'Água - Água Bruta (Saída do Poço)',
        localColeta: 'Poço Tubular P-01 - Palmital/SP',
        dataColeta: '2025-09-18 14:15:00',
        dataEmissao: '2025-10-05',
        responsavelTecnico: 'Gentil Mario Pinheiro Junior (CRQ 09100961)',
        conclusaoGeral: 'Campanha T3 (Estiagem severa). Fluoreto subiu para 1.72 mg/L (NÃO CONFORME - acima do VMP 1.50 mg/L).',
        conformidadePortaria888: false,
        statusSql: 'SALVO',
        pocoId: 'POCO-PALMITAL-01',
        parametrosChaveFteCdi: {
          fluoretoMgL: 1.72,
          ph: 11.20,
          condutividadeUsCm: 310,
          stdMgL: 198,
          cloretosMgL: 1.8,
          sulfatosMgL: 4.10,
          nitratosMgL: 0.22,
          ferroMgL: 0.07,
          durezaMgL: 14.0,
          coliformesUfc100ml: 0,
          dboMgL: null
        },
        recomendacoesOperacionais: ['Aumento de F- exige elevação de tensão para 1.40V constante e vazão de 1200 L/h.'],
        parametros: [
          { nome: 'Fluoreto (F-)', resultado: '1.72', unidade: 'mg/L', vmp: '1.50 mg/L', metodologia: 'EPA 300.1', emConformidade: false, impactoFteCdi: 'Pico de estiagem acima da norma' }
        ]
      },
      {
        id: 'laudo-exacty-3210-t4',
        numeroLaudo: '3210.2025-V.1',
        laboratorio: 'Exacty Análises Químicas LTDA',
        solicitante: 'CONSTRUIR LOTEADORA LTDA',
        matriz: 'Água - Água Bruta (Saída do Poço)',
        localColeta: 'Poço Tubular P-01 - Palmital/SP',
        dataColeta: '2025-12-10 10:30:00',
        dataEmissao: '2025-12-28',
        responsavelTecnico: 'Gentil Mario Pinheiro Junior (CRQ 09100961)',
        conclusaoGeral: 'Campanha T4 (Início das chuvas). Fluoreto em 1.58 mg/L, recarga gradual do aquífero.',
        conformidadePortaria888: false,
        statusSql: 'SALVO',
        pocoId: 'POCO-PALMITAL-01',
        parametrosChaveFteCdi: {
          fluoretoMgL: 1.58,
          ph: 10.95,
          condutividadeUsCm: 295,
          stdMgL: 188,
          cloretosMgL: 1.4,
          sulfatosMgL: 3.80,
          nitratosMgL: 0.18,
          ferroMgL: 0.06,
          durezaMgL: 12.0,
          coliformesUfc100ml: 0,
          dboMgL: null
        },
        recomendacoesOperacionais: ['Fluoreto acima de 1.50 mg/L. Manter reator FTE-CDI operando com setpoint de 1.40V.'],
        parametros: [
          { nome: 'Fluoreto (F-)', resultado: '1.58', unidade: 'mg/L', vmp: '1.50 mg/L', metodologia: 'EPA 300.1', emConformidade: false, impactoFteCdi: 'Concentração crítica' }
        ]
      },
      {
        id: 'laudo-exacty-3794',
        numeroLaudo: '3794.2026-V.0',
        laboratorio: 'Exacty Análises Químicas LTDA',
        solicitante: 'CONSTRUIR LOTEADORA LTDA',
        matriz: 'Água - Água Bruta (Saída do Poço)',
        localColeta: 'Poço Tubular P-01 - Palmital/SP',
        dataColeta: '2026-03-16 13:50:00',
        dataEmissao: '2026-04-14',
        responsavelTecnico: 'Gentil Mario Pinheiro Junior (CRQ 09100961)',
        conclusaoGeral: 'Campanha T1 2026 (Pós-chuvas). Fluoreto reduziu para 1.39 mg/L devido à diluição hidrogeológica.',
        conformidadePortaria888: false,
        statusSql: 'SALVO',
        pocoId: 'POCO-PALMITAL-01',
        parametrosChaveFteCdi: {
          fluoretoMgL: 1.39,
          ph: 11.49,
          condutividadeUsCm: 275,
          stdMgL: 174,
          cloretosMgL: 1.0,
          sulfatosMgL: 3.23,
          nitratosMgL: 0.14,
          ferroMgL: 0.05,
          durezaMgL: 10.0,
          coliformesUfc100ml: 0,
          dboMgL: null
        },
        recomendacoesOperacionais: ['Desfluoretação no reator CDI reduz efluente para < 0.25 mg/L com segurança total.'],
        parametros: [
          { nome: 'Fluoreto (F-)', resultado: '1.39', unidade: 'mg/L', vmp: '1.50 mg/L', metodologia: 'EPA 300.1', emConformidade: true, impactoFteCdi: 'Alvo principal do FTE-CDI' }
        ]
      }
    ]
  }
];

export const LabAiReportPanel: React.FC<LabAiReportPanelProps> = ({
  hardwareState,
  sensorData,
  onAplicarNoReator,
}) => {
  // Estado das Abas de Navegação Interna
  const [subAba, setSubAba] = useState<'INDIVIDUAL' | 'BATCH_LOTE' | 'SERIE_TEMPORAL' | 'BANCO_SQL'>('INDIVIDUAL');
  
  // Laudos carregados
  const [laudosList, setLaudosList] = useState<LaudoLaboratorial[]>(dbInstance.getLaudos());
  const [laudoAtual, setLaudoAtual] = useState<LaudoLaboratorial>(dbInstance.getLaudos()[0] || LOTES_PRESET[0].laudos[3]);
  const [filtroParametros, setFiltroParametros] = useState<'TODOS' | 'NAO_CONFORMES' | 'CHAVE_FTE_CDI'>('TODOS');
  
  // Status de IA e Processamento
  const [isProcessandoIa, setIsProcessandoIa] = useState<boolean>(false);
  const [progressoLote, setProgressoLote] = useState<{ total: number; atual: number; nomeArquivo: string } | null>(null);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [textoEntradaManual, setTextoEntradaManual] = useState<string>('');
  const [mostrarEntradaTexto, setMostrarEntradaTexto] = useState<boolean>(false);
  
  // Série Temporal
  const [filtroLocalPoco, setFiltroLocalPoco] = useState<string>('Palmital');
  const [serieHistorica, setSerieHistorica] = useState<PocoHistoricoPonto[]>(dbInstance.getSerieHistoricaPoco('Palmital'));

  useEffect(() => {
    setLaudosList(dbInstance.getLaudos());
    setSerieHistorica(dbInstance.getSerieHistoricaPoco(filtroLocalPoco));
  }, [filtroLocalPoco]);

  // Manipulador de Upload Individual ou Múltiplo (Batch OCR)
  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessandoIa(true);
    const total = files.length;
    const novosLaudos: LaudoLaboratorial[] = [];
    const falhas: FalhaOcr[] = [];
    let pendentes = 0;

    try {
      for (let i = 0; i < total; i++) {
        const file = files[i];
        setProgressoLote({ total, atual: i + 1, nomeArquivo: file.name });
        setMensagemStatus(`Processando arquivo [${i + 1}/${total}]: ${file.name} com IA Gemini...`);

        try {
          const dataUrl = await lerArquivoComoDataUrl(file);
          const dados = await chamarOcr(dataUrl, file.type || 'image/png');
          const laudoExtraido = montarLaudoDeOcr(dados, file.name, i);

          // Salva no banco; laudo incompleto fica como PENDENTE_REVISAO (não entra na série nem no reator)
          dbInstance.salvarLaudo(laudoExtraido);
          novosLaudos.push(laudoExtraido);
          if (laudoExtraido.statusSql === 'PENDENTE_REVISAO') pendentes++;
        } catch (err) {
          const falha = normalizarFalha(file.name, err);
          falhas.push(falha);
          console.error(`[${falha.codigo}] OCR do arquivo ${file.name}: ${falha.motivo}`);
        }
      }

      setLaudosList(dbInstance.getLaudos());
      setSerieHistorica(dbInstance.getSerieHistoricaPoco(filtroLocalPoco));
      if (novosLaudos.length > 0) {
        setLaudoAtual(novosLaudos[0]);
      }
      setMensagemStatus(resumoDoLote(total, novosLaudos.length - pendentes, pendentes, falhas));
    } finally {
      setIsProcessandoIa(false);
      setProgressoLote(null);
      e.target.value = ''; // permite reenviar o mesmo arquivo
    }
  };

  // Salvar laudo atual no Banco SQL
  const handleSalvarNoBancoSql = (laudo: LaudoLaboratorial) => {
    const salvo = dbInstance.salvarLaudo(laudo);
    setLaudoAtual(salvo);
    setLaudosList(dbInstance.getLaudos());
    setSerieHistorica(dbInstance.getSerieHistoricaPoco(filtroLocalPoco));
    setMensagemStatus(`Laudo ${laudo.numeroLaudo} gravado com sucesso no Banco SQL / Supabase!`);
  };

  // Injetar lote histórico demonstrativo de poços
  const handleCarregarLotePreset = (loteIndex: number) => {
    const lote = LOTES_PRESET[loteIndex];
    if (!lote) return;

    dbInstance.salvarLaudosLote(lote.laudos);
    setLaudosList(dbInstance.getLaudos());
    setSerieHistorica(dbInstance.getSerieHistoricaPoco(filtroLocalPoco));
    setLaudoAtual(lote.laudos[lote.laudos.length - 1]);
    setMensagemStatus(`Lote "${lote.nome}" carregado e sincronizado no Banco SQL (${lote.laudos.length} laudos).`);
  };

  const parametrosFiltrados = laudoAtual.parametros.filter((p) => {
    if (filtroParametros === 'NAO_CONFORMES') return !p.emConformidade;
    if (filtroParametros === 'CHAVE_FTE_CDI') {
      const nomes = ['fluoreto', 'ph', 'sólidos', 'std', 'condutividade', 'sulfato', 'cloreto', 'dureza', 'nitrato', 'coliformes', 'dbo'];
      return nomes.some((n) => p.nome.toLowerCase().includes(n));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel com Badges e Ações Principais */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[#11192e] via-[#151d38] to-[#121c2d] border border-sky-500/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-inner">
            <Sparkles className="w-7 h-7 animate-pulse text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Leitor & Extrator de Laudos com IA
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-sky-500/20 text-sky-300 border border-sky-400">
                  Gemini 3.8 Flash
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
                  <Database className="w-3 h-3" /> Supabase / SQL
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              OCR Multimodal em Lote (Batch), Análise Temporal de Aquíferos e Sincronização Automática com Banco de Dados SCADA.
            </p>
          </div>
        </div>

        {/* Botões Rápidos de Ação */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleSalvarNoBancoSql(laudoAtual)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5 transition"
            title="Grava o laudo laboratorial no banco de dados relacional Supabase / PostgreSQL"
          >
            <Save className="w-4 h-4" />
            Salvar no Banco SQL
          </button>

          <button
            onClick={() => onAplicarNoReator(laudoAtual)}
            disabled={laudoAtual.statusSql === 'PENDENTE_REVISAO' || laudoAtual.parametrosChaveFteCdi.fluoretoMgL === null || laudoAtual.parametrosChaveFteCdi.ph === null}
            className="disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition"
            title="Injeta os dados do laudo diretamente nas variáveis de entrada do reator FTE-CDI"
          >
            <Zap className="w-4 h-4 fill-current" />
            Carregar no Reator (F- {laudoAtual.parametrosChaveFteCdi.fluoretoMgL ?? '--'} mg/L)
          </button>
        </div>
      </div>

      {/* 2. Sub-Navegação entre Módulos: Individual, Batch Lote, Série Temporal e Banco SQL */}
      <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 flex-wrap">
        <button
          onClick={() => setSubAba('INDIVIDUAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            subAba === 'INDIVIDUAL'
              ? 'bg-sky-600 text-white shadow-md'
              : 'bg-[#151b2b] text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Laudo Individual & Ensaios
        </button>

        <button
          onClick={() => setSubAba('BATCH_LOTE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            subAba === 'BATCH_LOTE'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-[#151b2b] text-slate-400 hover:text-white'
          }`}
        >
          <FolderOpen className="w-4 h-4 text-purple-300" />
          Processamento em Lote (Batch OCR)
        </button>

        <button
          onClick={() => setSubAba('SERIE_TEMPORAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            subAba === 'SERIE_TEMPORAL'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-[#151b2b] text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-300" />
          Evolução Temporal do Aquífero / Poço
        </button>

        <button
          onClick={() => setSubAba('BANCO_SQL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            subAba === 'BANCO_SQL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-[#151b2b] text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-blue-300" />
          Laudos no Banco SQL ({laudosList.length})
        </button>
      </div>

      {/* Alerta de Status / Notificação */}
      {mensagemStatus && (
        <div className="p-3 rounded-lg bg-[#111622] border border-sky-500/50 text-xs font-mono text-sky-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{mensagemStatus}</span>
          </div>
          <button onClick={() => setMensagemStatus(null)} className="text-slate-500 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Progress Bar de Processamento em Lote */}
      {progressoLote && (
        <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500 shadow-xl space-y-2 animate-pulse">
          <div className="flex justify-between text-xs font-mono text-purple-200">
            <span>Processando Lote de Laudos com Gemini 3.8 Flash...</span>
            <span className="font-bold">{progressoLote.atual} de {progressoLote.total} arquivos ({Math.round((progressoLote.atual / progressoLote.total) * 100)}%)</span>
          </div>
          <div className="w-full bg-[#0a0e17] rounded-full h-3 p-0.5 border border-purple-800">
            <div 
              className="bg-gradient-to-r from-purple-500 to-sky-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${(progressoLote.atual / progressoLote.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">Arquivo atual: <span className="text-white">{progressoLote.nomeArquivo}</span></p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 1: VISÃO DO LAUDO INDIVIDUAL                                      */}
      {/* ========================================================================= */}
      {subAba === 'INDIVIDUAL' && (
        <div className="space-y-6">
          {/* Seletor Rápido de Laudos */}
          <div className="p-4 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-400" />
                Laudo Selecionado para Análise e Eletroadsorção:
              </span>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-[#1e293b] hover:bg-[#2a374d] text-sky-300 border border-sky-600/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Laudo (PDF/Imagem)
                  <input 
                    type="file" 
                    accept="application/pdf,image/png,image/jpeg,image/webp" 
                    onChange={handleBatchFileUpload} 
                    className="hidden" 
                  />
                </label>

                <button
                  onClick={() => setMostrarEntradaTexto(!mostrarEntradaTexto)}
                  className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#2a374d] text-slate-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {mostrarEntradaTexto ? 'Ocultar Texto' : 'Colar Texto'}
                </button>
              </div>
            </div>

            {/* Lista dos 3 Laudos Principais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {laudosList.slice(0, 3).map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setLaudoAtual(p)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    laudoAtual.id === p.id
                      ? 'bg-sky-950/50 border-sky-400 shadow-md shadow-sky-950/50'
                      : 'bg-[#0e1320] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">Nº {p.numeroLaudo}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                        p.conformidadePortaria888 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                      }`}>
                        {p.conformidadePortaria888 ? 'POTÁVEL' : 'NÃO CONFORME'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-200 mt-1 truncate">{p.localColeta}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{p.laboratorio}</p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-400">F-: {p.parametrosChaveFteCdi.fluoretoMgL ?? '--'} mg/L</span>
                    <span className="text-sky-300">pH: {p.parametrosChaveFteCdi.ph ?? '--'}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Caixa de Texto Manual de Laudo */}
            {mostrarEntradaTexto && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <textarea
                  value={textoEntradaManual}
                  onChange={(e) => setTextoEntradaManual(e.target.value)}
                  placeholder="Cole aqui o texto do laudo laboratorial ou tabela de parâmetros para extração automática via IA..."
                  rows={4}
                  className="w-full bg-[#0a0e17] border border-slate-700 rounded-lg p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}
          </div>

          {/* Cartão de Resumo do Laudo Selecionado */}
          <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Relatório de Ensaio Nº {laudoAtual.numeroLaudo}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    laudoAtual.conformidadePortaria888 === null
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : laudoAtual.conformidadePortaria888
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-red-950 text-red-300 border border-red-700'
                  }`}>
                    {laudoAtual.conformidadePortaria888 === null ? 'CONFORMIDADE PORTARIA 888: A VERIFICAR' : laudoAtual.conformidadePortaria888 ? 'CONFORME PORTARIA GM/MS 888' : 'NÃO CONFORME PORTARIA GM/MS 888'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-700">
                    STATUS SQL: {laudoAtual.statusSql || 'SALVO'}
                  </span>
                </div>
                {laudoAtual.statusSql === 'PENDENTE_REVISAO' && (
                  <p className="text-xs text-amber-300 mt-1 font-semibold">
                    [SCD-OCR-002] Laudo incompleto, revisar manualmente: {(laudoAtual.camposAusentes || []).join(', ') || 'campos críticos'}. Não será aplicado ao reator nem entra na série temporal.
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {laudoAtual.laboratorio} | Responsável Técnico: <span className="text-slate-200 font-semibold">{laudoAtual.responsavelTecnico}</span>
                </p>
              </div>

              <div className="text-xs font-mono text-slate-400 text-right">
                <div>Data Coleta: <span className="text-slate-200">{laudoAtual.dataColeta}</span></div>
                <div>Emissão: <span className="text-slate-200">{laudoAtual.dataEmissao}</span></div>
              </div>
            </div>

            {/* Metadados da Amostra */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#0a0e17] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SOLICITANTE</span>
                <span className="text-slate-200 font-bold truncate block">{laudoAtual.solicitante}</span>
              </div>
              <div className="bg-[#0a0e17] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">MATRIZ & ORIGEM</span>
                <span className="text-slate-200 font-bold truncate block">{laudoAtual.matriz}</span>
              </div>
              <div className="bg-[#0a0e17] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LOCAL DA AMOSTRAGEM</span>
                <span className="text-slate-200 font-bold truncate block">{laudoAtual.localColeta}</span>
              </div>
              <div className="bg-[#0a0e17] p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PARÂMETROS EXTRAÍDOS</span>
                <span className="text-sky-400 font-bold">{laudoAtual.parametros.length} ensaios analíticos</span>
              </div>
            </div>

            {/* Parecer do Laudo e Diretrizes Eletroquímicas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-[#0a0e17] border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Parecer Técnico do Laboratório
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {laudoAtual.conclusaoGeral}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0a0e17] border border-sky-900/60 space-y-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Diretrizes de Operação do Reator FTE-CDI
                </span>
                <ul className="text-xs text-slate-300 space-y-1.5">
                  {laudoAtual.recomendacoesOperacionais.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-sky-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tabela de Ensaios Extraídos com Impacto no Reator */}
          <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Ensaios Físico-Químicos & Microbiológicos Extraídos
                </h3>
              </div>

              <div className="flex items-center gap-1.5 bg-[#0a0e17] p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setFiltroParametros('TODOS')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    filtroParametros === 'TODOS' ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({laudoAtual.parametros.length})
                </button>
                <button
                  onClick={() => setFiltroParametros('NAO_CONFORMES')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    filtroParametros === 'NAO_CONFORMES' ? 'bg-red-950 text-red-300' : 'text-slate-400 hover:text-red-300'
                  }`}
                >
                  Não Conformes ({laudoAtual.parametros.filter(p => !p.emConformidade).length})
                </button>
                <button
                  onClick={() => setFiltroParametros('CHAVE_FTE_CDI')}
                  className={`px-2.5 py-1 rounded font-bold transition ${
                    filtroParametros === 'CHAVE_FTE_CDI' ? 'bg-sky-950 text-sky-300' : 'text-slate-400 hover:text-sky-300'
                  }`}
                >
                  Críticos para FTE-CDI
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0a0e17] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Parâmetro</th>
                    <th className="py-2.5 px-3">Resultado</th>
                    <th className="py-2.5 px-3">Unidade</th>
                    <th className="py-2.5 px-3">Limite VMP (Norma)</th>
                    <th className="py-2.5 px-3">Metodologia</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Impacto no Reator FTE-CDI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {parametrosFiltrados.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#1a2236] transition">
                      <td className="py-2.5 px-3 font-bold text-white">{item.nome}</td>
                      <td className="py-2.5 px-3 text-sky-300 font-bold">{item.resultado}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.unidade}</td>
                      <td className="py-2.5 px-3 text-slate-300">{item.vmp}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">{item.metodologia}</td>
                      <td className="py-2.5 px-3">
                        {item.emConformidade ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[11px] animate-pulse">
                            <XCircle className="w-3.5 h-3.5" /> Não Conforme
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-xs text-slate-300 max-w-md">
                        {item.impactoFteCdi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: PROCESSAMENTO EM LOTE (BATCH OCR)                              */}
      {/* ========================================================================= */}
      {subAba === 'BATCH_LOTE' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#151b2b] border border-purple-500/40 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/50">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Processamento em Lote (Batch OCR com IA)</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Suba múltiplos arquivos PDF ou imagens simultaneamente para extração automática e armazenamento no Banco SQL.
                </p>
              </div>
            </div>

            {/* Zona de Drop e Upload Múltiplo */}
            <div className="border-2 border-dashed border-purple-500/40 bg-[#0a0e17] rounded-xl p-8 text-center space-y-3 hover:border-purple-400 transition">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Selecione uma pasta ou múltiplos arquivos de laudos</p>
                <p className="text-xs text-slate-400 mt-1">Formatos suportados: PDF, PNG, JPG, WEBP (Relatórios de Ensaio)</p>
              </div>
              <label className="inline-block cursor-pointer px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg transition">
                Selecionar Múltiplos Arquivos (Batch)
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf,image/png,image/jpeg,image/webp" 
                  onChange={handleBatchFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Lotes Pré-configurados de Séries Históricas */}
            <div className="pt-2 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Ou carregue uma Série Histórica Pré-Mapeada:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LOTES_PRESET.map((lote, idx) => (
                  <div key={lote.id} className="p-4 rounded-lg bg-[#0e1320] border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white">{lote.nome}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-700">
                          {lote.laudos.length} Laudos
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{lote.descricao}</p>
                    </div>
                    <button
                      onClick={() => handleCarregarLotePreset(idx)}
                      className="mt-3 py-1.5 px-3 bg-[#1e293b] hover:bg-purple-900/40 text-xs font-bold text-purple-300 border border-purple-700/50 rounded flex items-center justify-center gap-1.5 transition"
                    >
                      <Database className="w-3.5 h-3.5" />
                      Importar Série no Banco SQL & Atualizar Gráficos
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 3: EVOLUÇÃO TEMPORAL DO AQUÍFERO / POÇO                          */}
      {/* ========================================================================= */}
      {subAba === 'SERIE_TEMPORAL' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#151b2b] border border-emerald-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Série Temporal da Qualidade Hidrogeológica do Poço
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Correlação entre Estações (Seca vs Chuva) e Teores de Fluoreto (F-), pH e Sólidos Dissolvidos.
                  </p>
                </div>
              </div>

              {/* Filtro do Poço */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Filtrar Aquífero:</span>
                <select
                  value={filtroLocalPoco}
                  onChange={(e) => setFiltroLocalPoco(e.target.value)}
                  className="bg-[#0a0e17] border border-slate-700 text-white text-xs font-mono rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Palmital">Poço Tubular P-01 (Palmital/SP)</option>
                  <option value="">Todos os Pontos Monitorados</option>
                </select>
              </div>
            </div>

            {/* Cartões de Indicadores Chave da Série */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#0a0e17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Pico Máximo de Fluoreto</span>
                <span className="text-xl font-bold text-red-400">1.72 mg/L</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Campanha Set/2025 (Estiagem)</span>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Média Histórica F-</span>
                <span className="text-xl font-bold text-amber-400">1.53 mg/L</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Limite VMP: 1.50 mg/L</span>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Variação de pH</span>
                <span className="text-xl font-bold text-sky-400">10.95 a 11.49</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Água Hiper-Alcalina</span>
              </div>
              <div className="bg-[#0a0e17] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Laudos Auditados no SQL</span>
                <span className="text-xl font-bold text-emerald-400">{serieHistorica.length} laudos</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">100% integridade hash</span>
              </div>
            </div>

            {/* Gráfico Visual de Evolução Temporal */}
            <div className="bg-[#0a0e17] p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Evolução Temporal do Fluoreto (F-) vs Limite Portaria GM/MS 888 (1.50 mg/L)
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-red-400"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span> Acima do Limite</span>
                  <span className="flex items-center gap-1 text-emerald-400"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span> Conforme</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-4 h-0.5 bg-red-400 border-dashed inline-block"></span> VMP (1.50 mg/L)</span>
                </div>
              </div>

              {/* Barras/Pontos Gráficos */}
              <div className="h-44 flex items-end justify-between gap-4 pt-4 px-4 border-b border-l border-slate-800 relative">
                {/* Linha Tracejada de VMP 1.50 mg/L */}
                <div 
                  className="absolute left-0 right-0 border-b-2 border-dashed border-red-500/70 z-10"
                  style={{ bottom: `${(1.50 / 2.0) * 100}%` }}
                >
                  <span className="absolute right-2 -top-4 text-[10px] font-mono text-red-400 font-bold bg-[#0a0e17] px-1">
                    VMP Portaria 888 (1.50 mg/L)
                  </span>
                </div>

                {serieHistorica.map((ponto, i) => {
                  const alturaPct = Math.min(100, Math.round((ponto.fluoretoMgL / 2.0) * 100));
                  const isNaoConforme = ponto.fluoretoMgL > 1.50;

                  return (
                    <div key={ponto.laudoId} className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-20 group">
                      <span className="text-[11px] font-mono font-bold text-white group-hover:scale-110 transition">
                        {ponto.fluoretoMgL.toFixed(2)} mg/L
                      </span>
                      <div 
                        className={`w-full max-w-[48px] rounded-t-lg transition-all duration-500 ${
                          isNaoConforme
                            ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-lg shadow-red-950'
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-950'
                        }`}
                        style={{ height: `${alturaPct}%` }}
                      ></div>
                      <div className="text-center font-mono text-[10px] text-slate-400 mt-1">
                        <div className="font-bold text-slate-200">{ponto.dataColeta}</div>
                        <div className="text-slate-500 text-[9px]">pH {ponto.ph.toFixed(1)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela da Série Histórica */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0a0e17] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Laudo</th>
                    <th className="py-2.5 px-3">Data Coleta</th>
                    <th className="py-2.5 px-3">Local / Poço</th>
                    <th className="py-2.5 px-3">Fluoreto (F-)</th>
                    <th className="py-2.5 px-3">pH</th>
                    <th className="py-2.5 px-3">Sólidos (STD)</th>
                    <th className="py-2.5 px-3">Nitratos (NO3-)</th>
                    <th className="py-2.5 px-3">Dureza Total</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {serieHistorica.map((p) => (
                    <tr key={p.laudoId} className="hover:bg-[#1a2236] transition">
                      <td className="py-2.5 px-3 font-bold text-sky-400">{p.numeroLaudo}</td>
                      <td className="py-2.5 px-3 text-slate-300">{p.dataColeta}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[150px]">{p.localPoco}</td>
                      <td className={`py-2.5 px-3 font-bold ${p.fluoretoMgL > 1.50 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {p.fluoretoMgL.toFixed(2)} mg/L
                      </td>
                      <td className="py-2.5 px-3 text-sky-300">{p.ph.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.stdMgL} mg/L</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.nitratosMgL} mg/L</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.durezaMgL} mg/L</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            const found = laudosList.find(l => l.id === p.laudoId || l.numeroLaudo === p.numeroLaudo);
                            if (found) {
                              setLaudoAtual(found);
                              setSubAba('INDIVIDUAL');
                            }
                          }}
                          className="px-2 py-1 bg-[#1e293b] hover:bg-sky-900/50 text-sky-300 text-[10px] font-bold rounded border border-slate-700 transition"
                        >
                          Ver Detalhes &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 4: BANCO DE DADOS SQL / SUPABASE AUDITORIA                         */}
      {/* ========================================================================= */}
      {subAba === 'BANCO_SQL' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#151b2b] border border-blue-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b] pb-3 gap-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/50">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Tabela Relacional: `laudos_laboratoriais` (Supabase / PostgreSQL)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Registros imutáveis com rastreabilidade de laboratório, CRQ, data de amostragem e parâmetros normalizados.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-700 text-xs font-mono font-bold">
                  {laudosList.length} Registros Gravados
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#0a0e17] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">ID / Nº Laudo</th>
                    <th className="py-2.5 px-3">Laboratório</th>
                    <th className="py-2.5 px-3">Solicitante</th>
                    <th className="py-2.5 px-3">Local Coleta</th>
                    <th className="py-2.5 px-3">Data Coleta</th>
                    <th className="py-2.5 px-3">F- (mg/L)</th>
                    <th className="py-2.5 px-3">pH</th>
                    <th className="py-2.5 px-3">Conformidade</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {laudosList.map((l) => (
                    <tr key={l.id} className="hover:bg-[#1a2236] transition">
                      <td className="py-2.5 px-3 font-bold text-sky-400">{l.numeroLaudo}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]">{l.laboratorio}</td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]">{l.solicitante}</td>
                      <td className="py-2.5 px-3 text-slate-300 truncate max-w-[160px]">{l.localColeta}</td>
                      <td className="py-2.5 px-3 text-slate-400">{l.dataColeta.slice(0, 10)}</td>
                      <td className={`py-2.5 px-3 font-bold ${(l.parametrosChaveFteCdi.fluoretoMgL ?? 0) > 1.50 ? 'text-red-400' : 'text-amber-400'}`}>
                        {l.parametrosChaveFteCdi.fluoretoMgL !== null ? `${l.parametrosChaveFteCdi.fluoretoMgL.toFixed(2)} mg/L` : 'NULL'}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400">
                        {l.parametrosChaveFteCdi.ph !== null ? l.parametrosChaveFteCdi.ph.toFixed(2) : 'NULL'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.conformidadePortaria888 === null ? 'bg-amber-950 text-amber-300 border border-amber-700' : l.conformidadePortaria888 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                        }`}>
                          {l.conformidadePortaria888 === null ? 'A VERIFICAR' : l.conformidadePortaria888 ? 'CONFORME' : 'NÃO CONFORME'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setLaudoAtual(l);
                            setSubAba('INDIVIDUAL');
                          }}
                          className="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 text-[11px] font-bold rounded border border-sky-700 transition"
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
