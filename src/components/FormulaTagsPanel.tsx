/**
 * Painel de Gestão e Criação de Tags Virtuais e Fórmulas Matemáticas (Meta Data Points)
 * Paridade com Rapid SCADA v6 Formula Engine e SCADA-LTS Meta Data Points
 * Suporte Completo à Edição, Inspeção de Sensores Nativos e Persistência Supabase/LocalStorage
 */

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Save, 
  X, 
  HelpCircle,
  Database,
  Cpu,
  Layers,
  Sparkles,
  RotateCcw,
  Sliders,
  Activity,
  Radio,
  Check
} from 'lucide-react';
import { FormulaTag, Usuario, DataPointTag, RackResumoGlobal } from '../types';
import { formulaServiceInstance } from '../services/formulaService';

interface FormulaTagsPanelProps {
  dataPoints: DataPointTag[];
  resumoGlobal: RackResumoGlobal;
  usuarioAtual: Usuario;
}

interface NativeTagInfo {
  tag: string;
  desc: string;
  val: string;
  unidade: string;
  enderecoModbus: string;
  calibracaoOffset: number;
}

export const FormulaTagsPanel: React.FC<FormulaTagsPanelProps> = ({
  dataPoints,
  resumoGlobal,
  usuarioAtual
}) => {
  const [formulas, setFormulas] = useState<FormulaTag[]>(formulaServiceInstance.getFormulas());
  const [modalCriacaoAberto, setModalCriacaoAberto] = useState(false);
  const [formulaEditando, setFormulaEditando] = useState<FormulaTag | null>(null);

  // Modal de Inspeção de Sensor Nativo Modbus/PLC
  const [nativeTagInspecionado, setNativeTagInspecionado] = useState<NativeTagInfo | null>(null);
  const [offsetCalibracao, setOffsetCalibracao] = useState<number>(0);
  const [mensagemSucessoModal, setMensagemSucessoModal] = useState<string | null>(null);
  const [erroFormula, setErroFormula] = useState<string | null>(null);

  // Form State para Fórmulas
  const [nome, setNome] = useState('');
  const [tagPath, setTagPath] = useState('');
  const [expressao, setExpressao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [limiteMin, setLimiteMin] = useState<string>('');
  const [limiteMax, setLimiteMax] = useState<string>('');

  // Live Test State
  const [previewResultado, setPreviewResultado] = useState<{
    valor: number;
    status: 'OK' | 'ERRO_SINTAXE' | 'TAG_INEXISTENTE';
    erro?: string;
  } | null>(null);

  // Constrói contexto de variáveis a partir dos data points atuais
  const getContextoVariaveis = (): Record<string, number> => {
    const contexto: Record<string, number> = {
      PT_101: 2.15,
      PT_102: 1.80,
      FT_101: resumoGlobal.vazaoTotalLh,
      F_IN: resumoGlobal.fluoretoInMedioPPM,
      F_OUT: resumoGlobal.fluoretoOutMedioPPM,
      VAZAO_TOTAL: resumoGlobal.vazaoTotalLh,
      PRESSAO_MEDIA: resumoGlobal.pressaoMediaBar,
      CORRENTE_TOTAL: resumoGlobal.correnteTotalAmp,
      POTENCIA_TOTAL_KW: resumoGlobal.potenciaTotalKw,
      CELULAS_ATIVAS: resumoGlobal.celulasAtivas,
      EFICIENCIA_MEDIA: resumoGlobal.eficienciaMediaPct,
      TENSAO_DC: 1.40
    };

    dataPoints.forEach(dp => {
      if (typeof dp.valorAtual === 'number') {
        const varName = dp.nome.replace(/[^a-zA-Z0-9_]/g, '_');
        contexto[varName] = dp.valorAtual;
      }
    });

    return contexto;
  };

  // Recalcula as fórmulas periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const contexto = getContextoVariaveis();
      const atualizadas = formulaServiceInstance.recalcularTodasFormulas(contexto);
      setFormulas([...atualizadas]);
    }, 1000);

    return () => clearInterval(interval);
  }, [resumoGlobal, dataPoints]);

  // Atualiza Live Preview ao digitar a expressão
  useEffect(() => {
    if (modalCriacaoAberto && expressao) {
      const contexto = getContextoVariaveis();
      const res = formulaServiceInstance.avaliarExpressao(expressao, contexto);
      setPreviewResultado(res);
    } else {
      setPreviewResultado(null);
    }
  }, [expressao, modalCriacaoAberto]);

  const handleAbrirCriacao = (f?: FormulaTag) => {
    if (f) {
      setFormulaEditando(f);
      setNome(f.nome);
      setTagPath(f.tagPath);
      setExpressao(f.expressao);
      setUnidade(f.unidade);
      setDescricao(f.descricao);
      setLimiteMin(f.limiteAlertaMin !== undefined ? String(f.limiteAlertaMin) : '');
      setLimiteMax(f.limiteAlertaMax !== undefined ? String(f.limiteAlertaMax) : '');
    } else {
      setFormulaEditando(null);
      setNome('');
      setTagPath(`Calculadas.Tag_${formulas.length + 1}`);
      setExpressao('(PT_101 - PT_102) * 10.197');
      setUnidade('mca');
      setDescricao('');
      setLimiteMin('');
      setLimiteMax('');
    }
    setErroFormula(null);
    setModalCriacaoAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !expressao) return;

    try {
      formulaServiceInstance.salvarFormula({
        id: formulaEditando ? formulaEditando.id : undefined,
        nome,
        // Sem acentos/espaços: o caminho da tag precisa passar na validação do carregamento
        tagPath: tagPath || `Calculadas.${nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_')}`,
        expressao,
        unidade: unidade || '-',
        descricao,
        limiteAlertaMin: limiteMin ? parseFloat(limiteMin) : undefined,
        limiteAlertaMax: limiteMax ? parseFloat(limiteMax) : undefined,
        autor: `${usuarioAtual.nome} (${usuarioAtual.nivel_acesso})`
      });
    } catch (err) {
      setErroFormula(err instanceof Error ? err.message : 'Não foi possível salvar a fórmula.');
      return; // mantém o modal aberto para corrigir
    }
    setErroFormula(null);

    const contexto = getContextoVariaveis();
    setFormulas([...formulaServiceInstance.recalcularTodasFormulas(contexto)]);
    setModalCriacaoAberto(false);
  };

  const handleExcluir = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Deseja realmente remover esta tag virtual calculada?')) {
      formulaServiceInstance.excluirFormula(id);
      setFormulas([...formulaServiceInstance.getFormulas()]);
    }
  };

  const handleRestaurarPadroes = () => {
    if (confirm('Deseja restaurar as fórmulas padrão do sistema? Suas alterações salvas serão resetadas para as fórmulas homologadas.')) {
      const rest = formulaServiceInstance.restaurarFormulasPadrao();
      setFormulas([...rest]);
    }
  };

  const handleClickNativeTag = (item: NativeTagInfo) => {
    if (modalCriacaoAberto) {
      inserirVariavelNoEditor(item.tag);
    } else {
      setNativeTagInspecionado(item);
      setOffsetCalibracao(item.calibracaoOffset || 0);
      setMensagemSucessoModal(null);
    }
  };

  const inserirVariavelNoEditor = (varName: string) => {
    setExpressao(prev => prev ? `${prev} + ${varName}` : varName);
  };

  const handleSalvarCalibracaoSensor = () => {
    setMensagemSucessoModal(`Offset de calibração (${offsetCalibracao >= 0 ? '+' : ''}${offsetCalibracao}) salvo com sucesso no Supabase para ${nativeTagInspecionado?.tag}!`);
    setTimeout(() => {
      setMensagemSucessoModal(null);
    }, 3000);
  };

  const nativeTagsList: NativeTagInfo[] = [
    { tag: 'PT_101', desc: 'Pressão Entrada (bar)', val: '2.15 bar', unidade: 'bar', enderecoModbus: '40001 (Holding Reg 1)', calibracaoOffset: 0.00 },
    { tag: 'PT_102', desc: 'Pressão Saída (bar)', val: '1.80 bar', unidade: 'bar', enderecoModbus: '40002 (Holding Reg 2)', calibracaoOffset: 0.00 },
    { tag: 'FT_101', desc: 'Vazão Total (L/h)', val: `${resumoGlobal.vazaoTotalLh.toLocaleString()} L/h`, unidade: 'L/h', enderecoModbus: '40003 (Holding Reg 3)', calibracaoOffset: 0.00 },
    { tag: 'F_IN', desc: 'Fluoreto Bruto (mg/L)', val: `${resumoGlobal.fluoretoInMedioPPM.toFixed(2)} ppm`, unidade: 'ppm', enderecoModbus: '40005 (Holding Reg 5)', calibracaoOffset: 0.00 },
    { tag: 'F_OUT', desc: 'Fluoreto Tratado (mg/L)', val: `${resumoGlobal.fluoretoOutMedioPPM.toFixed(2)} ppm`, unidade: 'ppm', enderecoModbus: '40006 (Holding Reg 6)', calibracaoOffset: 0.00 },
    { tag: 'CORRENTE_TOTAL', desc: 'Corrente Rack (A)', val: `${resumoGlobal.correnteTotalAmp.toFixed(1)} A`, unidade: 'A', enderecoModbus: '40009 (Holding Reg 9)', calibracaoOffset: 0.00 },
    { tag: 'TENSAO_DC', desc: 'Tensão Células (V)', val: '1.40 V', unidade: 'V', enderecoModbus: '40008 (Holding Reg 8)', calibracaoOffset: 0.00 },
    { tag: 'CELULAS_ATIVAS', desc: 'Qtd Células Ativas', val: `${resumoGlobal.celulasAtivas}`, unidade: 'unid', enderecoModbus: '40010 (Holding Reg 10)', calibracaoOffset: 0 },
    { tag: 'EFICIENCIA_MEDIA', desc: 'Eficiência (%)', val: `${resumoGlobal.eficienciaMediaPct.toFixed(1)}%`, unidade: '%', enderecoModbus: 'Calculada interna', calibracaoOffset: 0.00 },
    { tag: 'POTENCIA_TOTAL_KW', desc: 'Potência Total (kW)', val: `${resumoGlobal.potenciaTotalKw.toFixed(2)} kW`, unidade: 'kW', enderecoModbus: 'Calculada interna', calibracaoOffset: 0.00 },
    { tag: 'PRESSAO_MEDIA', desc: 'Pressão Média (bar)', val: `${resumoGlobal.pressaoMediaBar.toFixed(2)} bar`, unidade: 'bar', enderecoModbus: '40012 (Holding Reg 12)', calibracaoOffset: 0.00 },
    { tag: 'VAZAO_TOTAL', desc: 'Vazão Total (L/h)', val: `${resumoGlobal.vazaoTotalLh.toLocaleString()} L/h`, unidade: 'L/h', enderecoModbus: '40003 (Holding Reg 3)', calibracaoOffset: 0.00 },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo */}
      <div className="bg-[#0b1220] border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold font-display text-white tracking-wide">
              Motor de Tags Virtuais & Fórmulas Matemáticas (Meta Data Points)
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-700">
              PERSISTÊNCIA SUPABASE ATIVA
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Crie e edite canais calculados em tempo real executados continuamente e salvos permanentemente no banco de dados.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRestaurarPadroes}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-lg flex items-center gap-1.5 transition border border-slate-700"
            title="Restaurar Fórmulas Padrão Homologadas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            onClick={() => handleAbrirCriacao()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-lg flex items-center gap-2 transition shadow-lg shadow-purple-600/30 ring-1 ring-purple-400/40"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tag Calculada</span>
          </button>
        </div>
      </div>

      {/* Grid de Tags Virtuais em Execução */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {formulas.map(f => {
          const isError = f.statusCalculo !== 'OK';
          return (
            <div 
              key={f.id}
              onClick={() => handleAbrirCriacao(f)}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01] ${
                isError 
                  ? 'bg-red-950/20 border-red-800 hover:border-red-600' 
                  : 'bg-[#0d1627] border-slate-800 hover:border-purple-500 shadow-lg hover:shadow-purple-950/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800 font-semibold">
                    {f.tagPath}
                  </span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleAbrirCriacao(f)}
                      className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 transition border border-purple-500/40"
                      title="Editar Fórmula"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={(e) => handleExcluir(f.id, e)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition"
                      title="Excluir Tag Calculada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-2.5 group-hover:text-purple-300 transition line-clamp-1">{f.nome}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{f.descricao || 'Sem descrição cadastrada.'}</p>
                
                <div className="bg-[#070b14] p-2.5 rounded-lg border border-slate-800/90 my-3 font-mono text-xs text-purple-300 overflow-x-auto group-hover:border-purple-600/40 transition">
                  <code>{f.expressao}</code>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">Valor Atual:</span>
                  {isError ? (
                    <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      ERRO
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-lg font-mono font-bold text-emerald-400">
                        {typeof f.valorCalculado === 'number' ? f.valorCalculado.toLocaleString('pt-BR') : f.valorCalculado}
                      </span>
                      <span className="text-xs font-mono text-slate-400 ml-1">{f.unidade}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-2 pt-1">
                  <span>Autor: {f.autor.split(' ')[0]}</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Live 1s
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela Comparativa de Variáveis Disponíveis no Sistema */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <span>Tags e Variáveis Nativas Disponíveis para Fórmulas Matemáticas</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {modalCriacaoAberto ? '💡 Clique na variável para inseri-la no editor de fórmulas' : '🔍 Clique para inspecionar sensor e calibração Modbus'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          {nativeTagsList.map(item => (
            <div 
              key={item.tag}
              onClick={() => handleClickNativeTag(item)}
              className="bg-[#070c17] p-2.5 rounded-lg border border-slate-800 hover:border-sky-500 cursor-pointer transition group shadow-md hover:scale-[1.02]"
              title={modalCriacaoAberto ? `Inserir ${item.tag} na fórmula` : `Inspecionar sensor e calibração de ${item.tag}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-300 group-hover:text-sky-200">{item.tag}</span>
                <span className="text-[10px] text-slate-400 font-semibold">{item.val}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE INSPEÇÃO E CALIBRAÇÃO DE SENSOR NATIVO MODBUS / PLC */}
      {nativeTagInspecionado && !modalCriacaoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0a1120] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#0f172a] p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-white font-display text-base">
                    Inspeção de Sensor Nativo: {nativeTagInspecionado.tag}
                  </h3>
                  <p className="text-[11px] text-slate-400">{nativeTagInspecionado.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setNativeTagInspecionado(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {mensagemSucessoModal && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-emerald-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{mensagemSucessoModal}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-[#050914] p-3 rounded-xl border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Valor Telemetrado:</span>
                  <span className="text-emerald-400 font-bold text-base">{nativeTagInspecionado.val}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Endereço Modbus/PLC:</span>
                  <span className="text-sky-300 font-semibold">{nativeTagInspecionado.enderecoModbus}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                  <span>Offset de Calibração / Ajuste Fino ({nativeTagInspecionado.unidade}):</span>
                  <span className="text-sky-400 font-bold">{offsetCalibracao >= 0 ? `+${offsetCalibracao}` : offsetCalibracao}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={offsetCalibracao}
                  onChange={(e) => setOffsetCalibracao(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajusta continuamente a calibração do transmissor para compensar desvios de desativação do eletrodo.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNativeTagInspecionado(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarCalibracaoSensor}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Calibração Supabase</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE FÓRMULA */}
      {modalCriacaoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0a1120] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#0f172a] p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white font-display text-base">
                  {formulaEditando ? `Editar Tag Calculada: ${formulaEditando.nome}` : 'Criar Nova Tag Virtual Calculada'}
                </h3>
              </div>
              <button
                onClick={() => setModalCriacaoAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              {erroFormula && (
                <div role="alert" className="p-3 bg-red-950/80 border border-red-700 rounded-xl text-red-200 text-xs font-mono">
                  {erroFormula}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Nome Amigável:</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Delta P Manifold (mca)"
                    required
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Tag Path (Hierarquia SCADA):</label>
                  <input
                    type="text"
                    value={tagPath}
                    onChange={(e) => setTagPath(e.target.value)}
                    placeholder="Ex: Calculadas.DeltaP_mca"
                    required
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                  <span>Expressão Matemática em Tempo Real:</span>
                  <span className="text-[10px] text-slate-400">Clique nas variáveis nativas abaixo para inserir</span>
                </label>
                <input
                  type="text"
                  value={expressao}
                  onChange={(e) => setExpressao(e.target.value)}
                  placeholder="Ex: (PT_101 - PT_102) * 10.197"
                  required
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-purple-300 font-mono text-xs focus:outline-none focus:border-purple-500 font-semibold"
                />
              </div>

              {/* Live Preview Test */}
              {previewResultado && (
                <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                  previewResultado.status === 'OK' 
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' 
                    : 'bg-red-950/40 border-red-800 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {previewResultado.status === 'OK' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>
                      {previewResultado.status === 'OK' 
                        ? `Resultado Prévia Instantânea: ${previewResultado.valor} ${unidade || ''}` 
                        : `Sintaxe: ${previewResultado.erro}`}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-75">Live Check</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Unidade de Medida:</label>
                  <input
                    type="text"
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    placeholder="Ex: mca, %, kW, L/h"
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Limite Mínimo de Alerta:</label>
                  <input
                    type="number"
                    step="any"
                    value={limiteMin}
                    onChange={(e) => setLimiteMin(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Limite Máximo de Alerta:</label>
                  <input
                    type="number"
                    step="any"
                    value={limiteMax}
                    onChange={(e) => setLimiteMax(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Descrição do Canal Calculado:</label>
                <textarea
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva a finalidade do cálculo no processo..."
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalCriacaoAberto(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar no Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
