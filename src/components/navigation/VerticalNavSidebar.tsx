/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard,
  Activity,
  Layers,
  RotateCcw,
  GitFork,
  Flame,
  Scale,
  Sparkles,
  Cpu,
  Calculator,
  Bell,
  BellOff,
  Server,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sliders,
  FileCheck,
  Layout,
  Power,
  Volume2,
  VolumeX,
  X,
  MoreVertical,
  Check,
  Radio,
  UserCheck,
  Settings,
  Circle
} from 'lucide-react';
import { Usuario, RackResumoGlobal, LayoutNavegacaoScada } from '../../types';

interface VerticalNavSidebarProps {
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
  onAlternarLayoutNavegacao: (novoLayout: LayoutNavegacaoScada) => void;
  isColapsado: boolean;
  onToggleColapso: () => void;
}

interface SubNavItem {
  id: string;
  label: string;
  badge?: string;
  badgeColor?: 'blue' | 'emerald' | 'orange' | 'purple' | 'rose' | 'slate';
  icon?: React.ElementType;
}

interface NavMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isDirectTab?: boolean;
  directTabId?: string;
  subItems?: SubNavItem[];
}

/**
 * VerticalNavSidebar — Modelo Profissional Fiel ao Guia de Design (modelo-menu_vertical.png)
 * - Mac Window Dots superiores (🔴 🟡 🟢)
 * - Identidade visual limpa e refinada com logo geométrico
 * - Botão de colapso circular flutuante (< / >)
 * - Botões principais em azul real (#2563eb / #0052ff) quando ativos
 * - Árvore hierárquica com linhas conectoras curvas (Tree guide lines)
 * - Seção de Operadores em Turno com avatar circular, indicador de status online e badge
 * - Barra de micro-controles utilitários (Volume, Mudo, Parâmetros, Laudos, Layout)
 * - Card inferior do operador com avatar, email/cargo e menu de contexto
 * - Modo colapsado com flyout cards flutuantes estruturados
 */
export const VerticalNavSidebar: React.FC<VerticalNavSidebarProps> = ({
  usuarioAtual,
  usuariosDisponiveis,
  resumoGlobal,
  activeTab,
  onSelectTab,
  onChangeUsuario,
  onAbrirParametros,
  onAbrirLaudosOficiais,
  onAbrirLaudoDuplo,
  onParadaEmergencia,
  onAlternarLayoutNavegacao,
  isColapsado,
  onToggleColapso
}) => {
  // Controle de acordeões abertos
  const [menuAberto, setMenuAberto] = useState<Record<string, boolean>>({
    dashboard: true,
    usuarios: true,
    processo: true,
    quimica: false,
    engenharia: false,
  });

  const [flyoutAtivo, setFlyoutAtivo] = useState<string | null>(null);
  const [somSilenciado, setSomSilenciado] = useState<boolean>(false);
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState<boolean>(false);
  const [hoverTooltip, setHoverTooltip] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLElement>(null);

  // Fecha flyouts flutuantes e modais ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setFlyoutAtivo(null);
        setMenuUsuarioAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const toggleSubmenu = (menuId: string) => {
    setMenuAberto(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const handleSelectTab = (tabId: string) => {
    onSelectTab(tabId);
    setFlyoutAtivo(null);
  };

  // Estrutura hierárquica de menus compatível com o design do modelo
  const menuItems: NavMenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard Sinóptico',
      icon: LayoutDashboard,
      subItems: [
        { id: 'SINOPTICO_HIBRIDO', label: 'Sinóptico Híbrido', badge: 'Live', badgeColor: 'emerald' },
        { id: 'SINOPTICO_PID', label: 'Sinóptico P&ID Clássico', badge: 'DN200', badgeColor: 'blue' },
        { id: 'DASHBOARD_MULTI_ESTACAO', label: 'Multi-Estações GIS', badge: '3 Est.', badgeColor: 'purple' },
      ]
    },
    {
      id: 'usuarios',
      label: 'Zonas & Usuários',
      icon: ShieldCheck,
      subItems: [
        { id: 'GESTAO_USUARIOS_RBAC', label: 'Cadastro CFR 21 & Zonas', badge: 'CFR 21', badgeColor: 'emerald' },
      ]
    },
    {
      id: 'processo',
      label: 'Processo FTE-CDI',
      icon: Activity,
      subItems: [
        { id: 'RACK_16_CELULAS', label: '16 Células Modulares', badge: `${resumoGlobal.celulasAtivas}/16`, badgeColor: resumoGlobal.celulasAtivas === 16 ? 'emerald' : 'orange' },
        { id: 'RETROLAVAGEM_CIP', label: 'Retrolavagem & CIP', badge: 'XV-103', badgeColor: 'slate' },
        { id: 'MANIFOLD_BALANCO', label: 'Manifold Hidráulico', badge: '180 m³/h', badgeColor: 'blue' },
      ]
    },
    {
      id: 'quimica',
      label: 'Química & Laudos',
      icon: Flame,
      subItems: [
        { id: 'PURIFYWAVE_OS', label: 'Skid CONTHEC (A+B+C)', badge: 'Móvel', badgeColor: 'orange' },
        { id: 'COMPLIANCE_PORTARIA_888', label: 'Portaria 888 & 430', badge: '100% OK', badgeColor: 'emerald' },
        { id: 'IA_LAUDOS', label: 'IA Laudos & OCR', badge: 'CRQ/CREA', badgeColor: 'purple' },
      ]
    },
    {
      id: 'engenharia',
      label: 'Engenharia & Dados',
      icon: Cpu,
      subItems: [
        { id: 'WATCHLIST_TAGS', label: 'Tags & Datapoints Live', badge: 'Live', badgeColor: 'blue' },
        { id: 'FORMULAS_TAGS', label: 'Fórmulas & Balanço', badge: 'Meta', badgeColor: 'slate' },
        { id: 'ALARMES_ISA182', label: 'Alarmes ISA-18.2', badge: resumoGlobal.celulasIntertravadas > 0 ? `${resumoGlobal.celulasIntertravadas}` : '0', badgeColor: resumoGlobal.celulasIntertravadas > 0 ? 'rose' : 'emerald' },
        { id: 'GATEWAY_MODBUS', label: 'Gateway CLP Modbus', badge: 'TCP/IP', badgeColor: 'slate' },
        { id: 'BANCO_SQL', label: 'Banco SQL Supabase', badge: 'Cloud', badgeColor: 'purple' },
      ]
    }
  ], [resumoGlobal]);

  // Renderiza badges minimalistas idênticos ao modelo (ex: badge 8 laranja, badge 3 verde)
  const renderBadgePill = (text: string, color: SubNavItem['badgeColor'] = 'slate') => {
    const colorStyles: Record<string, string> = {
      blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      emerald: 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30',
      orange: 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30',
      purple: 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30',
      rose: 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 animate-pulse',
      slate: 'bg-slate-800 text-slate-400 border border-slate-700',
    };

    return (
      <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full shrink-0 ${colorStyles[color]}`}>
        {text}
      </span>
    );
  };

  return (
    <aside 
      ref={sidebarRef}
      className={`bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out z-40 select-none shrink-0 sticky top-0 h-screen font-sans text-slate-300 ${
        isColapsado ? 'w-[76px]' : 'w-[280px]'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO MENU (MAC DOTS + LOGO + BOTÃO CIRCULAR FLUTUANTE) */}
      {/* ========================================================================= */}
      <div className="p-4 relative">
        
        {/* Janela Mac Dots (🔴 🟡 🟢) */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-sm"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-sm"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-sm"></span>
        </div>

        {/* Brand / Logo com ícone geométrico */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Ícone Hexagonal / Geométrico inspirado no modelo */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40 shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
            </div>

            {!isColapsado && (
              <div className="min-w-0">
                <div className="font-semibold text-white text-[15px] tracking-tight leading-tight truncate">
                  PuriFyWave
                </div>
                <div className="text-[11px] text-slate-400 font-normal leading-tight truncate">
                  SCADA FTE-CDI 180 m³/h
                </div>
              </div>
            )}
          </div>

          {/* Botão Circular Flutuante de Colapso (< ou >) exatamente como no modelo */}
          <button
            onClick={onToggleColapso}
            className={`w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80 hover:border-slate-500 text-slate-400 hover:text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0 ${
              isColapsado ? 'absolute -right-3.5 top-5 z-50 bg-slate-800' : ''
            }`}
            title={isColapsado ? 'Expandir Menu' : 'Recolher Menu'}
          >
            {isColapsado ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CORPO DE NAVEGAÇÃO HIERÁRQUICA COM LINHAS CONECTORAS CURVAS */}
      {/* ========================================================================= */}
      <div className="px-3 py-2 space-y-1.5 flex-1 overflow-y-auto scada-scrollbar">
        
        {menuItems.map((menu) => {
          const MenuIcon = menu.icon;
          const temSubItemAtivo = menu.subItems?.some(sub => sub.id === activeTab);
          const isAberto = menuAberto[menu.id] || temSubItemAtivo;

          // =======================================================
          // MODO EXPANDIDO (280px)
          // =======================================================
          if (!isColapsado) {
            return (
              <div key={menu.id} className="space-y-1">
                
                {/* Botão do Item Pai */}
                <button
                  onClick={() => toggleSubmenu(menu.id)}
                  className={`w-full py-2.5 px-3 rounded-2xl flex items-center justify-between transition-colors text-sm font-medium ${
                    temSubItemAtivo && !isAberto
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MenuIcon className={`w-5 h-5 shrink-0 stroke-[1.75] ${temSubItemAtivo ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="truncate">{menu.label}</span>
                  </div>
                  
                  {menu.subItems && menu.subItems.length > 0 && (
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${isAberto ? 'rotate-0' : '-rotate-90'}`} />
                  )}
                </button>

                {/* Sub-itens com Árvore de Linhas Conectoras Curvas (Fiel ao modelo-menu_vertical.png) */}
                {isAberto && menu.subItems && (
                  <div className="relative pl-6 ml-4 space-y-1 pt-0.5">
                    
                    {/* Linha vertical principal da árvore */}
                    <div className="absolute left-2 top-0 bottom-3 w-[1.5px] bg-slate-800"></div>

                    {menu.subItems.map((subItem) => {
                      const isAtivo = activeTab === subItem.id;

                      return (
                        <div key={subItem.id} className="relative">
                          
                          {/* Linha curva conectora (Branch guide line) */}
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-l-[1.5px] border-b-[1.5px] border-slate-800 rounded-bl-lg pointer-events-none"></div>

                          {/* Botão do Sub-item (Pill azul sólido quando ativo, conforme modelo) */}
                          <button
                            onClick={() => handleSelectTab(subItem.id)}
                            className={`w-full py-2 px-3 rounded-2xl text-xs flex items-center justify-between gap-2 transition-all font-medium ${
                              isAtivo
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                          >
                            <span className="truncate">{subItem.label}</span>
                            {subItem.badge && (
                              <span className={isAtivo ? 'px-2 py-0.5 text-[10px] font-mono rounded-full bg-white/20 text-white font-bold' : ''}>
                                {!isAtivo ? renderBadgePill(subItem.badge, subItem.badgeColor) : subItem.badge}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // =======================================================
          // MODO COLAPSADO (76px) COM FLYOUT CARDS FLUTUANTES
          // =======================================================
          return (
            <div key={menu.id} className="relative flex justify-center py-1">
              
              {/* Botão Ícone Quadrado/Squircle centralizado */}
              <button
                onClick={() => setFlyoutAtivo(flyoutAtivo === menu.id ? null : menu.id)}
                onMouseEnter={() => setHoverTooltip(menu.label)}
                onMouseLeave={() => setHoverTooltip(null)}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  temSubItemAtivo
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                }`}
              >
                <MenuIcon className="w-5 h-5 stroke-[1.75]" />
              </button>

              {/* Tooltip minimalista preto no hover (se flyout não estiver ativo) */}
              {hoverTooltip === menu.label && flyoutAtivo !== menu.id && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white whitespace-nowrap shadow-xl z-50 pointer-events-none animate-in fade-in duration-100">
                  {menu.label}
                </div>
              )}

              {/* Flyout Card Flutuante com a Árvore Hierárquica Idêntica ao Modelo */}
              {flyoutAtivo === menu.id && (
                <div className="absolute left-full top-0 ml-3 w-64 rounded-2xl bg-[#0f172a]/98 border border-slate-700/80 shadow-2xl backdrop-blur-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
                  
                  {/* Título do Card */}
                  <div className="px-2 py-1 text-xs font-semibold text-white border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MenuIcon className="w-4 h-4 text-blue-400" />
                      <span>{menu.label}</span>
                    </div>
                    <button onClick={() => setFlyoutAtivo(null)} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sub-itens no Flyout com linhas curvas */}
                  <div className="space-y-1 pt-1">
                    {menu.subItems?.map((subItem) => {
                      const isAtivo = activeTab === subItem.id;
                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleSelectTab(subItem.id)}
                          className={`w-full py-2 px-3 rounded-xl text-xs flex items-center justify-between gap-2 transition-all font-medium ${
                            isAtivo
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-850'
                          }`}
                        >
                          <span className="truncate">{subItem.label}</span>
                          {subItem.badge && (
                            <span className={isAtivo ? 'px-2 py-0.5 text-[10px] font-mono rounded-full bg-white/20 text-white font-bold' : ''}>
                              {!isAtivo ? renderBadgePill(subItem.badge, subItem.badgeColor) : subItem.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ========================================================================= */}
        {/* SEÇÃO INBOX / OPERADORES EM TURNO (IDÊNTICO AO MODELO) */}
        {/* ========================================================================= */}
        {!isColapsado && (
          <div className="pt-4 mt-2 border-t border-slate-800/80 space-y-2">
            
            {/* Cabeçalho da Seção de Operadores */}
            <div className="px-3 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Operadores em Turno</span>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center justify-center">
                  3
                </span>
                <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>

            {/* Lista de Operadores em Turno com Avatares e Indicador de Status Verde */}
            <div className="space-y-1">
              
              {/* Operador 1: Carlos Eduardo Mendes */}
              <div 
                onClick={() => {
                  const u = usuariosDisponiveis.find(x => x.nome.includes('Carlos'));
                  if (u) onChangeUsuario(u);
                }}
                className={`p-2 rounded-2xl flex items-center justify-between cursor-pointer transition ${
                  usuarioAtual.nome.includes('Carlos') ? 'bg-slate-900 border border-slate-700/80' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      CE
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1d]"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Carlos Mendes</div>
                    <div className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-emerald-400 text-emerald-400" />
                      Supervisor • Turno A
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300">
                  <UserCheck className="w-3 h-3" />
                </div>
              </div>

              {/* Operadora 2: Dra. Camila Silveira */}
              <div 
                onClick={() => {
                  const u = usuariosDisponiveis.find(x => x.nome.includes('Camila') || x.nome.includes('Ricardo'));
                  if (u) onChangeUsuario(u);
                }}
                className={`p-2 rounded-2xl flex items-center justify-between cursor-pointer transition ${
                  usuarioAtual.nome.includes('Camila') || usuarioAtual.nome.includes('Ricardo') ? 'bg-slate-900 border border-slate-700/80' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      CS
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1d]"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Dra. Camila Silveira</div>
                    <div className="text-[10px] text-purple-400 font-medium truncate flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-purple-400 text-purple-400" />
                      Eng. Química • CRQ
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300">
                  <UserCheck className="w-3 h-3" />
                </div>
              </div>

              {/* Operador 3: Marcos Vinicius */}
              <div 
                onClick={() => {
                  const u = usuariosDisponiveis.find(x => x.nome.includes('Marcos'));
                  if (u) onChangeUsuario(u);
                }}
                className={`p-2 rounded-2xl flex items-center justify-between cursor-pointer transition ${
                  usuarioAtual.nome.includes('Marcos') ? 'bg-slate-900 border border-slate-700/80' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      MV
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-[#0a0f1d]"></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Marcos Vinicius</div>
                    <div className="text-[10px] text-amber-400 font-medium truncate flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-amber-400 text-amber-400" />
                      Operador de Estação
                    </div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300">
                  <UserCheck className="w-3 h-3" />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA DE MICRO-CONTROLES UTILITÁRIOS (IDÊNTICO AO MODELO) */}
      {/* ========================================================================= */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40">
        <div className={`flex items-center justify-between ${isColapsado ? 'flex-col gap-2' : ''}`}>
          
          {/* Silenciar Áudio / Buzzer */}
          <button
            onClick={() => setSomSilenciado(!somSilenciado)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title={somSilenciado ? 'Desmutar Buzzer de Alarmes' : 'Silenciar Buzzer de Alarmes'}
          >
            {somSilenciado ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Alternar Modo Layout Superior / Vertical */}
          <button
            onClick={() => onAlternarLayoutNavegacao('HORIZONTAL')}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-900 transition"
            title="Alternar para Menu Horizontal"
          >
            <Layout className="w-4 h-4" />
          </button>

          {/* Configurações & Parâmetros */}
          <button
            onClick={onAbrirParametros}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            title="Parâmetros de Processo & Interlocks"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Laudo Duplo Integrado */}
          {onAbrirLaudoDuplo && (
            <button
              onClick={onAbrirLaudoDuplo}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition"
              title="Laudo Duplo Portaria 888 + CONAMA 430"
            >
              <FileCheck className="w-4 h-4" />
            </button>
          )}

          {/* Parada de Emergência NR-12 */}
          <button
            onClick={onParadaEmergencia}
            className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-600 transition shadow-sm"
            title="Parada de Emergência Geral (NR-12)"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CARD INFERIOR DO OPERADOR (AVATAR + EMAIL/CARGO + 3-DOTS MENU) */}
      {/* ========================================================================= */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 relative">
        <div 
          onClick={() => setMenuUsuarioAberto(!menuUsuarioAberto)}
          className={`p-2 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between cursor-pointer transition ${
            isColapsado ? 'justify-center p-1.5' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                {usuarioAtual.nome.charAt(0)}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0f1d]"></span>
            </div>

            {!isColapsado && (
              <div className="min-w-0 text-left">
                <div className="text-xs font-semibold text-white truncate">
                  {usuarioAtual.nome}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {usuarioAtual.cargo || 'Supervisor Chefe'}
                </div>
              </div>
            )}
          </div>

          {!isColapsado && (
            <MoreVertical className="w-4 h-4 text-slate-500 hover:text-slate-300 shrink-0" />
          )}
        </div>

        {/* Popover Flutuante de Troca de Operador e Credenciais */}
        {menuUsuarioAberto && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-2xl bg-[#0f172a]/98 border border-slate-700/80 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
            <div className="px-2 py-1 text-xs font-semibold text-slate-300 border-b border-slate-800 flex items-center justify-between">
              <span>Alternar Usuário Ativo</span>
              <button onClick={() => setMenuUsuarioAberto(false)} className="text-slate-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto scada-scrollbar">
              {usuariosDisponiveis.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    onChangeUsuario(u);
                    setMenuUsuarioAberto(false);
                  }}
                  className={`w-full p-2 rounded-xl text-xs text-left flex items-center justify-between transition ${
                    u.id === usuarioAtual.id 
                      ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold truncate">{u.nome}</div>
                    <div className={`text-[10px] font-mono ${u.id === usuarioAtual.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {u.nivel_acesso} • {u.matricula}
                    </div>
                  </div>
                  {u.id === usuarioAtual.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="pt-1.5 border-t border-slate-800">
              <button
                onClick={() => {
                  handleSelectTab('GESTAO_USUARIOS_RBAC');
                  setMenuUsuarioAberto(false);
                }}
                className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Cadastrar Usuários & Zonas CFR 21
              </button>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
