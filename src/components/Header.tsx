/**
 * Header Industrial Responsivo do Sistema SCADA Reator FTE-CDI (16 Células - 180 m³/h)
 * Suporte a RBAC (Operador, Supervisor, Engenheiro), Emissão de Laudos Oficiais e Parada de Emergência
 * Responsivo para Desktop, Tablet, Web e Smartphone
 */

import React, { useState, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck,
  Layers, 
  Cpu, 
  UserCheck, 
  RotateCcw, 
  Power, 
  Activity,
  Sliders,
  Bell,
  Scale,
  GitFork,
  Database,
  Sparkles,
  Flame,
  FileText,
  Menu,
  X,
  Calculator,
  BellRing,
  Server,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import { Usuario, RackResumoGlobal } from '../types';

interface HeaderProps {
  usuarioAtual: Usuario;
  usuariosDisponiveis: Usuario[];
  resumoGlobal: RackResumoGlobal;
  activeTab: string;
  onSelectTab: (tab: any) => void;
  onChangeUsuario: (usuario: Usuario) => void;
  onAbrirParametros: () => void;
  onAbrirLaudosOficiais: () => void;
  onAbrirLaudoDuplo?: () => void;
  onParadaEmergencia: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  usuarioAtual,
  usuariosDisponiveis,
  resumoGlobal,
  activeTab,
  onSelectTab,
  onChangeUsuario,
  onAbrirParametros,
  onAbrirLaudosOficiais,
  onAbrirLaudoDuplo,
  onParadaEmergencia
}) => {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [menuAbasDropdownAberto, setMenuAbasDropdownAberto] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const getRoleColor = (nivel: string) => {
    switch (nivel) {
      case 'ENGENHEIRO':
        return 'bg-purple-950 text-purple-300 border-purple-600';
      case 'SUPERVISOR':
        return 'bg-sky-950 text-sky-300 border-sky-600';
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-600';
    }
  };

  const navTabs = [
    { id: 'SINOPTICO_HIBRIDO', label: 'Sinóptico Híbrido (PuriFyWave + FTE)', icon: Sparkles, color: 'indigo' },
    { id: 'GESTAO_USUARIOS_RBAC', label: 'Gestão Usuários & Zonas (CFR 21)', icon: ShieldCheck, color: 'emerald' },
    { id: 'PURIFYWAVE_OS', label: 'PuriFyWave OS V2 (POA & UGL)', icon: Flame, color: 'indigo' },
    { id: 'SINOPTICO_PID', label: 'Sinóptico FTE-CDI (P&ID)', icon: Activity, color: 'sky' },
    { id: 'RACK_16_CELULAS', label: 'Rack Células (Modular)', icon: Layers, color: 'sky' },
    { id: 'RETROLAVAGEM_CIP', label: 'Retrolavagem & CIP', icon: RotateCcw, color: 'amber' },
    { id: 'MANIFOLD_BALANCO', label: 'Manifold DN200 (T4)', icon: GitFork, color: 'sky' },
    { id: 'WATCHLIST_TAGS', label: 'Tags & Datapoints', icon: Cpu, color: 'purple' },
    { id: 'FORMULAS_TAGS', label: 'Fórmulas & Tags', icon: Calculator, color: 'indigo' },
    { id: 'NOTIFICACOES_EXTERNAS', label: 'Alertas & Telegram', icon: BellRing, color: 'red' },
    { id: 'GATEWAY_MODBUS', label: 'Gateway CLP', icon: Server, color: 'emerald' },
    { id: 'COMPLIANCE_PORTARIA_888', label: 'Portaria 888', icon: Scale, color: 'emerald' },
    { id: 'ALARMES_ISA182', label: 'Alarmes ISA-18.2', icon: Bell, color: 'red' },
    { id: 'IA_LAUDOS', label: 'IA Laudos & OCR', icon: Sparkles, color: 'indigo' },
    { id: 'BANCO_SQL', label: 'Banco SQL', icon: Database, color: 'blue' },
  ];

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleWheelTabs = (e: React.WheelEvent) => {
    if (tabsContainerRef.current) {
      // Converte o giro vertical do mouse (deltaY) em scroll horizontal natural
      if (Math.abs(e.deltaY) > 0) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <header className="bg-[#080d1a] border-b border-[#1b273d] p-3 sm:p-4 sticky top-0 z-40 shadow-xl space-y-3">
      {/* Linha Superior: Título, Métricas Globais, Usuário, Laudos e Parada de Emergência */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Título e Identificação da Planta */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3.5 w-3.5 rounded-full bg-sky-400 animate-ping shrink-0"></div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold font-display text-white tracking-wide flex items-center gap-2">
                  SCADA Industrial FTE-CDI
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-600">
                  Rack {resumoGlobal.celulasAtivas} Células (180 m³/h / 50 L/s)
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  PEAD DN200 PN10
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                Interlocks Físicos (2,80 bar) | Portaria GM/MS nº 888/2021 | Supabase SQL
              </p>
            </div>
          </div>

          {/* Botão Hambúrguer para Mobile */}
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Controles de Topo: Seletor de Perfil RBAC, Botão de Laudos e Emergência */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Seletor Rápido de Usuário (RBAC) */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#0d1526] p-1 sm:p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <select
              value={usuarioAtual.id}
              onChange={(e) => {
                const u = usuariosDisponiveis.find(item => item.id === parseInt(e.target.value));
                if (u) onChangeUsuario(u);
              }}
              className="bg-[#080d1a] border border-slate-700 text-white rounded px-2 py-1 focus:outline-none focus:border-sky-500 font-bold text-xs max-w-[130px] sm:max-w-none"
            >
              {usuariosDisponiveis.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.nivel_acesso})
                </option>
              ))}
            </select>
            <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold border ${getRoleColor(usuarioAtual.nivel_acesso)}`}>
              {usuarioAtual.nivel_acesso}
            </span>
          </div>

          {/* Botão Destaque: Laudos & Relatórios Oficiais */}
          <button
            onClick={onAbrirLaudosOficiais}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-md"
            title="Abrir Centro Oficial de Laudos Técnicos e Conformidade Portaria 888 (PDF/Excel)"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Laudo</span> 888
          </button>

          {/* Botão Destaque: Laudo Duplo Integrado (Portaria 888 + CONAMA 430) */}
          {onAbrirLaudoDuplo && (
            <button
              onClick={onAbrirLaudoDuplo}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-md"
              title="Abrir Laudo Técnico Integrado Duplo (Portaria GM/MS 888 + CONAMA 430)"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>Laudo Duplo</span>
            </button>
          )}

          {/* Botão de Parâmetros (Engenheiro) */}
          <button
            onClick={onAbrirParametros}
            className="px-2.5 sm:px-3 py-1.5 bg-[#151f33] hover:bg-[#1f2d4a] text-slate-200 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Parâmetros</span>
          </button>

          {/* Botão de Parada de Emergência (NR-12) */}
          <button
            onClick={onParadaEmergencia}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5 transition animate-pulse"
            title="Corte imediato de todas as fontes DC e bombas de alimentação"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Parada</span> Emergência
          </button>
        </div>
      </div>

      {/* Menu Drawer Mobile quando aberto */}
      {menuMobileAberto && (
        <div className="lg:hidden p-3 bg-[#0c1424] border border-slate-700 rounded-xl space-y-1 text-xs font-mono animate-fadeIn">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Navegação Rápida:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMenuMobileAberto(false);
                  }}
                  className={`p-2 rounded-lg font-bold flex items-center gap-2 transition text-left ${
                    isActive
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-[#151f33] text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Linha Inferior: Barra de Navegação Horizontal com Botões de Scroll, Suporte a Roda do Mouse e Dropdown de Acesso Rápido */}
      <div className="relative flex items-center gap-1 border-t border-slate-800/80 pt-2">
        {/* Botão Rolar para Esquerda */}
        <button
          onClick={() => handleScrollTabs('left')}
          className="p-1.5 bg-[#0f172a] hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition shrink-0 shadow hidden sm:flex items-center justify-center"
          title="Rolar abas para a esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Container Horizontal com Scroll Suave & Suporte a Mouse Wheel */}
        <div 
          ref={tabsContainerRef}
          onWheel={handleWheelTabs}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1.5 scada-scrollbar text-xs font-mono scroll-smooth"
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap border ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white border-sky-400 shadow-md'
                    : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:text-white hover:bg-[#152038] hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Botão Rolar para Direita */}
        <button
          onClick={() => handleScrollTabs('right')}
          className="p-1.5 bg-[#0f172a] hover:bg-sky-600 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition shrink-0 shadow hidden sm:flex items-center justify-center"
          title="Rolar abas para a direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Botão Dropdown: Todas as Abas (Acesso Direto) */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuAbasDropdownAberto(!menuAbasDropdownAberto)}
            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs font-mono border flex items-center gap-1 transition ${
              menuAbasDropdownAberto
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-[#121c33] text-sky-300 border-slate-700 hover:bg-[#1a2849]'
            }`}
            title="Abrir menu com todas as 12 abas"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Todas as Abas</span>
          </button>

          {/* Dropdown com grid de todas as 12 abas */}
          {menuAbasDropdownAberto && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#0a101f] border border-slate-700 rounded-xl p-3 shadow-2xl z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-[11px] font-bold text-white font-mono uppercase">Menu de Telas ({navTabs.length})</span>
                <button
                  onClick={() => setMenuAbasDropdownAberto(false)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1 max-h-80 overflow-y-auto scada-scrollbar pr-1">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        setMenuAbasDropdownAberto(false);
                      }}
                      className={`w-full p-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition text-left ${
                        isActive
                          ? 'bg-sky-600 text-white shadow'
                          : 'bg-[#0f172a] text-slate-300 hover:bg-[#1a2744] hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
