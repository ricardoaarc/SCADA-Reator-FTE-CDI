/**
 * Painel de Data Points & Tag Watchlist Hierárquica (Padrão ScadaBR / SCADA-LTS)
 * Supervisório SCADA Reator FTE-CDI
 * Recursos Industriais:
 * 1. Árvore de Data Sources e Tags (Modbus TCP / CLP)
 * 2. Status de Qualidade do Sinal (GOOD / BAD / STALE / OVERRIDDEN)
 * 3. Forçamento Manual de Tags (Override) para testes de bancada e comissionamento
 * 4. Monitoramento em tempo real com taxa de scan de 2000 ms
 */

import React, { useState } from 'react';
import { 
  Database, 
  Search, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Edit3, 
  RotateCcw, 
  Layers, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Filter, 
  ChevronRight, 
  ChevronDown,
  Info,
  Check,
  Zap,
  Lock,
  Unlock
} from 'lucide-react';
import { DataPointTag, Usuario } from '../types';

interface TagWatchlistPanelProps {
  dataPoints: DataPointTag[];
  usuarioAtual: Usuario;
  onForcarValor: (tagId: string, valor: any) => void;
  onLimparForcamento: (tagId: string) => void;
}

export const TagWatchlistPanel: React.FC<TagWatchlistPanelProps> = ({
  dataPoints,
  usuarioAtual,
  onForcarValor,
  onLimparForcamento,
}) => {
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');
  const [qualidadeFiltro, setQualidadeFiltro] = useState<string>('TODAS');
  const [tagEmEdicao, setTagEmEdicao] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState<string>('');

  const tagsFiltradas = dataPoints.filter(t => {
    const matchTexto = t.tagPath.toLowerCase().includes(termoBusca.toLowerCase()) || 
                       t.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       (t.enderecoModbus && t.enderecoModbus.toLowerCase().includes(termoBusca.toLowerCase()));
    
    const matchCat = categoriaAtiva === 'TODAS' || t.categoria === categoriaAtiva;
    const matchQual = qualidadeFiltro === 'TODAS' || t.qualidade === qualidadeFiltro;

    return matchTexto && matchCat && matchQual;
  });

  const totalGood = dataPoints.filter(t => t.qualidade === 'GOOD').length;
  const totalBad = dataPoints.filter(t => t.qualidade === 'BAD').length;
  const totalOverridden = dataPoints.filter(t => t.qualidade === 'OVERRIDDEN').length;

  const handleSalvarForcamento = (tag: DataPointTag) => {
    let valorConvertido: any = valorEdicao;
    if (tag.tipoDado === 'NUMERICO') {
      valorConvertido = Number(valorEdicao);
      if (isNaN(valorConvertido)) return;
    } else if (tag.tipoDado === 'BINARIO') {
      valorConvertido = valorEdicao.toLowerCase() === 'true' || valorEdicao === '1';
    }

    onForcarValor(tag.id, valorConvertido);
    setTagEmEdicao(null);
    setValorEdicao('');
  };

  return (
    <div className="space-y-5">
      {/* 1. Header do Painel de Data Points */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-[#0e1422] via-[#121a30] to-[#0e1422] border border-sky-500/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/40">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Watchlist de Tags & Data Points (Padrão ScadaBR / SCADA-LTS)
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> CLP ONLINE
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-600">
                  SCAN: 2000 ms
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Mapeamento de registradores Modbus TCP, supervisão hierárquica de variáveis e controle de forçamento manual (Override).
            </p>
          </div>
        </div>

        {/* Resumo de Qualidade de Tags */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#070a10] border border-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Good: <strong className="text-emerald-400">{totalGood}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#070a10] border border-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>
            <span className="text-slate-300">Bad: <strong className="text-red-400">{totalBad}</strong></span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-[#070a10] border border-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span className="text-slate-300">Override: <strong className="text-purple-400">{totalOverridden}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Filtros e Barra de Pesquisa */}
      <div className="p-4 rounded-xl bg-[#0e1422] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar tag por nome, TagPath (ex: Rack_FTE_CDI.CEL-01.PT_Pressao) ou registrador Modbus..."
            className="w-full bg-[#070a10] border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <select
            value={categoriaAtiva}
            onChange={(e) => setCategoriaAtiva(e.target.value)}
            className="bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="TODAS">Todas Categorias</option>
            <option value="CELULAS">Células do Rack</option>
            <option value="MANIFOLD">Manifold DN200</option>
            <option value="QUALIDADE_AGUA">Qualidade da Água (Portaria 888)</option>
            <option value="SEGURANCA">Relés & Segurança Física</option>
          </select>

          <select
            value={qualidadeFiltro}
            onChange={(e) => setQualidadeFiltro(e.target.value)}
            className="bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
          >
            <option value="TODAS">Todas Qualidades</option>
            <option value="GOOD">Qualidade GOOD</option>
            <option value="BAD">Qualidade BAD / Alarme</option>
            <option value="OVERRIDDEN">Forçadas (OVERRIDDEN)</option>
          </select>
        </div>
      </div>

      {/* 3. Tabela de Data Points (Estilo ScadaBR) */}
      <div className="rounded-xl border border-slate-800 bg-[#0e1422] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-[#080c14] border-b border-slate-800 text-slate-400 text-[11px] uppercase">
              <tr>
                <th className="p-3">TagPath / Hierarquia</th>
                <th className="p-3">Nome / Descrição</th>
                <th className="p-3">Endereço Modbus</th>
                <th className="p-3">Valor Atual</th>
                <th className="p-3">Qualidade</th>
                <th className="p-3">Último Scan</th>
                <th className="p-3 text-right">Ação / Forçamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {tagsFiltradas.map((tag) => {
                const isEmEdicao = tagEmEdicao === tag.id;

                return (
                  <tr key={tag.id} className="hover:bg-[#12192b] transition">
                    <td className="p-3 font-bold text-sky-300">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        <span>{tag.tagPath}</span>
                      </div>
                    </td>

                    <td className="p-3 text-slate-300">
                      <div className="font-semibold text-white">{tag.nome}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{tag.descricao}</div>
                    </td>

                    <td className="p-3 text-amber-400 font-bold">
                      {tag.enderecoModbus || '--'}
                    </td>

                    <td className="p-3 font-bold text-white">
                      {isEmEdicao ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={valorEdicao}
                            onChange={(e) => setValorEdicao(e.target.value)}
                            placeholder="Novo valor..."
                            className="w-24 bg-[#070a10] border border-purple-500 rounded px-2 py-1 text-white text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSalvarForcamento(tag)}
                            className="p-1 bg-purple-600 text-white rounded hover:bg-purple-500"
                            title="Confirmar Forçamento"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTagEmEdicao(null)}
                            className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm ${
                          tag.qualidade === 'BAD'
                            ? 'text-red-400 animate-pulse'
                            : tag.qualidade === 'OVERRIDDEN'
                              ? 'text-purple-300'
                              : 'text-emerald-400'
                        }`}>
                          {tag.valorFormatado}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tag.qualidade === 'GOOD'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : tag.qualidade === 'BAD'
                            ? 'bg-red-950 text-red-300 border border-red-700'
                            : 'bg-purple-950 text-purple-300 border border-purple-700'
                      }`}>
                        {tag.qualidade}
                      </span>
                    </td>

                    <td className="p-3 text-slate-400 text-[10px]">
                      {new Date(tag.ultimoScan).toLocaleTimeString('pt-BR')}
                    </td>

                    <td className="p-3 text-right">
                      {tag.isOverridden ? (
                        <button
                          onClick={() => onLimparForcamento(tag.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-[10px] font-bold rounded border border-purple-600/50 flex items-center gap-1 ml-auto transition"
                          title="Remover forçamento manual e retornar à leitura do CLP"
                        >
                          <Unlock className="w-3 h-3" />
                          Liberar Forçamento
                        </button>
                      ) : tag.isSettable ? (
                        <button
                          onClick={() => {
                            setTagEmEdicao(tag.id);
                            setValorEdicao(String(tag.valorAtual));
                          }}
                          className="px-2.5 py-1 bg-[#162035] hover:bg-sky-900/50 text-sky-300 text-[10px] font-bold rounded border border-slate-700 flex items-center gap-1 ml-auto transition"
                          title="Forçar valor manual para teste (Override)"
                        >
                          <Edit3 className="w-3 h-3" />
                          Forçar Valor
                        </button>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Somente Leitura</span>
                      )}
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
