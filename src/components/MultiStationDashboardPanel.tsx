/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Activity, 
  Zap, 
  Droplets, 
  ShieldCheck, 
  Server, 
  Radio, 
  RefreshCw, 
  Plus, 
  Search, 
  Sliders, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wifi, 
  Layers,
  Compass,
  ArrowUpRight,
  Database
} from 'lucide-react';
import { multiStationService, StationConfig, StationInstrument } from '../services/multiStationService';

interface MultiStationDashboardPanelProps {
  onAbrirSinopticoLocal?: (codigoEstacao: string) => void;
  onAbrirProvisionador?: () => void;
}

export const MultiStationDashboardPanel: React.FC<MultiStationDashboardPanelProps> = ({
  onAbrirSinopticoLocal,
  onAbrirProvisionador
}) => {
  const [estacoes, setEstacoes] = useState<StationConfig[]>([]);
  const [estacaoSelecionada, setEstacaoSelecionada] = useState<StationConfig | null>(null);
  const [instrumentos, setInstrumentos] = useState<StationInstrument[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [sincronizando, setSincronizando] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    const list = multiStationService.getEstacoes();
    setEstacoes(list);
    if (list.length > 0 && !estacaoSelecionada) {
      setEstacaoSelecionada(list[0]);
      setInstrumentos(multiStationService.getInstrumentosPorEstacao(list[0].id));
    }
  };

  const handleSelecionarEstacao = (est: StationConfig) => {
    setEstacaoSelecionada(est);
    setInstrumentos(multiStationService.getInstrumentosPorEstacao(est.id));
  };

  const handleSincronizarGrid = () => {
    setSincronizando(true);
    setTimeout(() => {
      carregarDados();
      setSincronizando(false);
    }, 800);
  };

  const estacoesFiltradas = estacoes.filter(e => {
    const matchBusca = e.nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
                       e.codigoEstacao.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       e.ipGateway.includes(termoBusca);
    const matchTipo = filtroTipo === 'TODOS' || e.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  const totalOnline = estacoes.filter(e => e.statusConexao === 'ONLINE').length;
  const totalAlerta = estacoes.filter(e => e.statusConexao === 'ALERTA').length;
  const totalOffline = estacoes.filter(e => e.statusConexao === 'OFFLINE').length;

  return (
    <div className="space-y-6">
      
      {/* 1. CABEÇALHO MACRO GIS EXECUTIVE SCADA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                  Dashboards Multi-Estação & Grid Distribuído
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ISA-95 LEVEL 4 MACRO GIS
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Supervisão executiva consolidada em tempo real de ETAs, ETEs e Adutoras do Município
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSincronizarGrid}
              disabled={sincronizando}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin text-purple-400' : ''}`} />
              <span>{sincronizando ? 'Sincronizando...' : 'Atualizar Telemetria'}</span>
            </button>

            {onAbrirProvisionador && (
              <button
                onClick={onAbrirProvisionador}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 border border-purple-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>Provisionar & Gerenciar Estações</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICAS CHAVE MUNICIPAIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Estações Ativas</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-mono font-bold text-white flex items-center gap-2">
              {estacoes.length} Unidades
              <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {totalOnline} OK
              </span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Vazão Total do Grid</span>
              <Droplets className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-mono font-bold text-sky-300">
              420 m³/h
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">/ 500 m³/h</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Conformidade Portaria 888</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-mono font-bold text-emerald-300">
              100.0%
              <span className="text-xs font-sans text-emerald-400 font-normal ml-1">(1.08 ppm F⁻)</span>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Consumo Energético</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-mono font-bold text-amber-300">
              88.5 kW/h
              <span className="text-xs font-sans text-slate-400 font-normal ml-1">(0.49 kWh/m³)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAPA GIS GEORREFERENCIADO DA MALHA MUNICIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LADO ESQUERDO: MAPA VECTORIAL MUNICIPAL SCADA (2 COLUNAS) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Mapa GIS do Grid Distribuído (Malha Hidráulica)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Lat: -23.5505 | Long: -46.6333 (UTM WGS84)
            </span>
          </div>

          {/* RENDERIZADOR VECTORIAL DO MAPA GIS */}
          <div className="relative w-full h-[420px] bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden flex items-center justify-center">
            
            {/* Grid Decorativo estilo Radar GIS */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
            
            {/* Linhas de Adutora Hidráulica Simuladas entre Estações */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line x1="20%" y1="35%" x2="50%" y2="50%" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_3s_linear_infinite]" />
              <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 6" />
              <line x1="20%" y1="35%" x2="25%" y2="75%" stroke="#a855f7" strokeWidth="1.5" />
            </svg>

            {/* MARCADORES DAS ESTAÇÕES NO MAPA */}
            {estacoes.map((e, idx) => {
              const posMap: Record<string, { top: string; left: string }> = {
                'EST-001': { top: '50%', left: '50%' }, // ETA Central
                'EST-002': { top: '35%', left: '20%' }, // ETA Bairro X
                'EST-003': { top: '75%', left: '25%' }, // Poço Secundário 27
                'EST-004': { top: '80%', left: '50%' }, // ETE Central
                'EST-005': { top: '30%', left: '80%' }, // Reservatório R-1
              };

              const coords = posMap[e.id] || { top: `${30 + idx * 15}%`, left: `${30 + idx * 15}%` };
              const isSelected = estacaoSelecionada?.id === e.id;
              const isOnline = e.statusConexao === 'ONLINE';

              return (
                <div
                  key={e.id}
                  style={{ top: coords.top, left: coords.left }}
                  onClick={() => handleSelecionarEstacao(e)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all z-10 group`}
                >
                  {/* Anel de Pulso */}
                  <span className={`absolute -inset-2 rounded-full opacity-75 animate-ping ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                  
                  {/* Nó de Estação */}
                  <div className={`relative p-2.5 rounded-2xl flex items-center gap-2 border shadow-2xl transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white ring-4 ring-purple-500/40 border-purple-300 scale-110'
                      : 'bg-slate-900/95 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}>
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                    <div className="text-left hidden sm:block">
                      <div className="text-[11px] font-bold font-mono tracking-tight">{e.codigoEstacao}</div>
                      <div className="text-[9px] opacity-80 font-mono">{e.ipGateway}</div>
                    </div>
                  </div>

                  {/* Tooltip Hover */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 text-xs">
                    <div className="font-bold text-white truncate">{e.nome}</div>
                    <div className="text-[10px] text-slate-400">Protocolo: {e.protocolo}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Ping: {e.frequenciaPingS}s OK</div>
                  </div>
                </div>
              );
            })}

            {/* Legenda do Mapa */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[10px] font-mono text-slate-300 space-y-1 backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>ETA / ETE Online</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>Poço Adutora Modbus</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Malha Adutora Principal</span>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: CARD TÉCNICO DA ESTAÇÃO SELECIONADA (1 COLUNA) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-4 flex flex-col justify-between">
          {estacaoSelecionada ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {estacaoSelecionada.tipo}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {estacaoSelecionada.statusConexao}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {estacaoSelecionada.nome}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {estacaoSelecionada.codigoEstacao} | Gateway: {estacaoSelecionada.ipGateway}
                </p>
              </div>

              {/* DADOS DE CONEXÃO & PROTOCOLO */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Protocolo:</div>
                  <div className="text-slate-200 font-bold">{estacaoSelecionada.protocolo}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Ping Rate:</div>
                  <div className="text-slate-200 font-bold">{estacaoSelecionada.frequenciaPingS}s</div>
                </div>
              </div>

              {/* LISTA DE INSTRUMENTOS VINCULADOS */}
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase font-mono mb-2 flex items-center justify-between">
                  <span>Instrumentos Registrados ({instrumentos.length})</span>
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                </div>

                <div className="space-y-1.5 max-h-[180px] overflow-y-auto scada-scrollbar pr-1">
                  {instrumentos.map((inst) => (
                    <div key={inst.id} className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-[11px]">{inst.tagEquipamento}</div>
                        <div className="text-[10px] text-slate-400">{inst.nomeAmigavel}</div>
                      </div>
                      <div className="text-right font-mono text-[10px]">
                        <div className="text-sky-400">{inst.enderecoModbus}</div>
                        <div className="text-emerald-400 font-bold">{inst.statusOperacional}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BOTÃO PARA COMUTAR P&ID LOCAL */}
              {onAbrirSinopticoLocal && (
                <button
                  onClick={() => onAbrirSinopticoLocal(estacaoSelecionada.codigoEstacao)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Sinóptico P&ID Local</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-12 text-xs">
              Selecione uma estação no mapa para visualizar o prontuário de telemetria
            </div>
          )}
        </div>
      </div>

      {/* 3. TABELA MATRIZ DE ESTAÇÕES MUNICIPAIS & TELEMETRIA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              Matriz Geral de Estações & Provisionamento Modbus / Edge
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar estação, IP ou tag..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-48 sm:w-64 font-mono"
              />
            </div>

            {/* Filtro por Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="ETA">ETAs</option>
              <option value="ETE">ETEs</option>
              <option value="POCO_ADUTORA">Poços & Adutoras</option>
              <option value="RESERVATORIO">Reservatórios</option>
            </select>
          </div>
        </div>

        {/* TABELA DE ESTAÇÕES */}
        <div className="overflow-x-auto scada-scrollbar">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase font-mono bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Código / Nome da Estação</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">IP Gateway / CLP</th>
                <th className="p-3">Protocolo</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {estacoesFiltradas.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white">{e.codigoEstacao}</div>
                    <div className="text-[10px] text-slate-400 font-sans">{e.nome}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-purple-300">
                      {e.tipo}
                    </span>
                  </td>
                  <td className="p-3 text-sky-400">{e.ipGateway}</td>
                  <td className="p-3 text-slate-300">{e.protocolo}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      e.statusConexao === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                      {e.statusConexao}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {onAbrirSinopticoLocal && (
                      <button
                        onClick={() => onAbrirSinopticoLocal(e.codigoEstacao)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-bold transition-all"
                      >
                        P&ID Sinóptico
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
