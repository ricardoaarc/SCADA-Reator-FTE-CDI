/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Activity, 
  Layers, 
  RotateCcw, 
  GitFork, 
  Cpu, 
  Calculator, 
  BellRing, 
  Server, 
  Scale, 
  Bell, 
  Database, 
  ChevronDown, 
  ChevronRight, 
  Sliders, 
  ShieldAlert, 
  FileCheck, 
  FileText, 
  Layout, 
  Sidebar as SidebarIcon, 
  Check, 
  Power,
  Droplets,
  Zap,
  ShieldCheck,
  Compass,
  ArrowRight,
  MoreHorizontal,
  Menu,
  X
} from 'lucide-react';
import { Usuario, RackResumoGlobal, LayoutNavegacaoScada } from '../../types';

interface HorizontalNavHeaderProps {
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
  layoutAtual: LayoutNavegacaoScada;
}

/**
 * HorizontalNavHeader — Menu Horizontal com Mega-Dropdowns e Overflow Inteligente
 * Inspirado no padrão "Coordonly na horizontal" (Imagem 2 de referência):
 * - Aba ativa em pill de alto contraste (Azul Royal);
 * - Submenus flutuantes limpos com backdrop-blur;
 * - Overflow preditivo ("Mais...") para telas menores;
 * - Menu de conta do supervisor com alternador rápido de layout (Horizontal <-> Vertical).
 */
export const HorizontalNavHeader: React.FC<HorizontalNavHeaderProps> = ({
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
  layoutAtual
}) => {
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);
  const [menuContaAberto, setMenuContaAberto] = useState<boolean>(false);
  const [notificacoesAberto, setNotificacoesAberto] = useState<boolean>(false);
  const [mobileMenuAberto, setMobileMenuAberto] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownAberto(null);
        setMenuContaAberto(false);
        setNotificacoesAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const toggleDropdown = (nome: string) => {
    setDropdownAberto(prev => prev === nome ? null : nome);
    setMenuContaAberto(false);
    setNotificacoesAberto(false);
  };

  const selecionarAbaEFechar = (abaId: string) => {
    onSelectTab(abaId);
    setDropdownAberto(null);
  };

  // Grupos Temáticos de Navegação
  const grupoProcesso = [
    { id: 'SINOPTICO_PID', label: 'Sinóptico FTE-CDI (P&ID)', desc: 'Diagrama P&ID clássico com malhas de controle', icon: Activity, badge: '16 Células' },
    { id: 'RACK_16_CELULAS', label: 'Rack Células (Modular)', desc: 'Supervisão granular tensão e corrente', icon: Layers, badge: `${resumoGlobal.celulasAtivas}/16 Online` },
    { id: 'RETROLAVAGEM_CIP', label: 'Retrolavagem & CIP', desc: 'Dessorção salina automática e sanitização', icon: RotateCcw, badge: 'Auto 24h' },
    { id: 'MANIFOLD_BALANCO', label: 'Manifold DN200 (T4)', desc: 'Equilíbrio de pressões e perdas de carga', icon: GitFork, badge: '180 m³/h' },
  ];

  const grupoQuimicaZld = [
    { id: 'PURIFYWAVE_OS', label: 'PuriFyWave OS V2 (POA & UGL)', desc: 'Skid Quádruplo CONTHEC e Prensa Parafuso', icon: Flame, badge: 'A+B+C' },
    { id: 'COMPLIANCE_PORTARIA_888', label: 'Portaria GM/MS nº 888', desc: 'Conformidade de fluoreto, turbidez e pH', icon: Scale, badge: '1.08 ppm F⁻' },
    { id: 'IA_LAUDOS', label: 'IA Laudos & OCR', desc: 'Reconhecimento ótico e laudos em tempo real', icon: Sparkles, badge: 'OCR Ativo' },
  ];

  const grupoMais = [
    { id: 'GESTAO_USUARIOS_RBAC', label: 'Gestão de Usuários & Zonas', desc: 'Perfis técnicos, zonas de operação e conformidade FDA 21 CFR Part 11 / IEC 62443', icon: ShieldCheck, badge: 'CFR 21' },
    { id: 'WATCHLIST_TAGS', label: 'Tags & Datapoints', desc: 'Varredura e override de variáveis industriais', icon: Cpu },
    { id: 'FORMULAS_TAGS', label: 'Fórmulas & Tags', desc: 'Cálculo de balanço de massa e rendimento virtual', icon: Calculator },
    { id: 'ALARMES_ISA182', label: 'Alarmes ISA-18.2', desc: 'Console de eventos, criticidades e silenciamento', icon: Bell, badge: `${resumoGlobal.celulasIntertravadas} Ativos` },
    { id: 'NOTIFICACOES_EXTERNAS', label: 'Alertas & Telegram', desc: 'Disparo de eventos para equipe externa', icon: BellRing },
    { id: 'GATEWAY_MODBUS', label: 'Gateway Modbus / CLP', desc: 'Comunicação serial e TCP/IP em campo', icon: Server },
    { id: 'BANCO_SQL', label: 'Banco de Dados SQL', desc: 'Auditoria e tabelas relacionais Supabase', icon: Database },
  ];

  return (
    <header ref={containerRef} className="bg-slate-950/95 border-b border-slate-800/90 sticky top-0 z-40 backdrop-blur-md shadow-2xl transition-all">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* 1. LADO ESQUERDO: BRANDING SCADA & STATUS */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400/40">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                SCADA Industrial
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 hidden md:inline-block">
                180 m³/h
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Portaria 888 OK</span>
              </span>
              <span className="hidden sm:inline-block text-slate-700">•</span>
              <span className="hidden sm:flex items-center gap-1 text-cyan-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>ZLD T-102</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. CENTRO: BARRA DE NAVEGAÇÃO HORIZONTAL EM PILLS FLUIDA E ELEGANTE */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-slate-800/80 p-1 rounded-2xl shadow-inner relative max-w-full overflow-x-auto scada-scrollbar">
          
          {/* Item 1: Sinóptico Híbrido */}
          <button
            onClick={() => selecionarAbaEFechar('SINOPTICO_HIBRIDO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'SINOPTICO_HIBRIDO'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35 ring-1 ring-blue-400/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sinóptico Híbrido</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
          </button>

          {/* Item 2: DESTAQUE PRINCIPAL — GESTÃO DE USUÁRIOS & ZONAS (CFR 21 / RBAC) */}
          <button
            onClick={() => selecionarAbaEFechar('GESTAO_USUARIOS_RBAC')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 border ${
              activeTab === 'GESTAO_USUARIOS_RBAC'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border-emerald-400 ring-1 ring-emerald-300/50'
                : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60 border-emerald-500/30'
            }`}
            title="Cadastro e Gestão de Usuários por Zonas de Operação & Perfis Técnicos (FDA 21 CFR Part 11 / IEC 62443)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Usuários & Zonas</span>
            <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              CFR 21
            </span>
          </button>

          {/* Item 3: Multi-Estações GIS */}
          <button
            onClick={() => selecionarAbaEFechar('DASHBOARD_MULTI_ESTACAO')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DASHBOARD_MULTI_ESTACAO'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/35 ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-slate-800/70 border border-purple-500/30'
            }`}
            title="Dashboards Multi-Estação & Grid Distribuído (Visão Macro GIS)"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
            <span>Multi-Estação</span>
          </button>

          {/* Item 4: Processo FTE (Dropdown) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('PROCESSO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                ['SINOPTICO_PID', 'RACK_16_CELULAS', 'RETROLAVAGEM_CIP', 'MANIFOLD_BALANCO'].includes(activeTab)
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Processo FTE</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${dropdownAberto === 'PROCESSO' ? 'rotate-180' : ''}`} />
            </button>

            {dropdownAberto === 'PROCESSO' && (
              <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 mb-1">
                  Subsistemas de Desfluoretação
                </div>
                {grupoProcesso.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selecionarAbaEFechar(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      activeTab === item.id ? 'bg-blue-600/20 border border-blue-500/40 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800/90 text-sky-400 shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item 5: Química & ZLD (Dropdown) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('QUIMICA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                ['PURIFYWAVE_OS', 'COMPLIANCE_PORTARIA_888', 'IA_LAUDOS'].includes(activeTab)
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-indigo-400" />
              <span>Química & ZLD</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${dropdownAberto === 'QUIMICA' ? 'rotate-180' : ''}`} />
            </button>

            {dropdownAberto === 'QUIMICA' && (
              <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 mb-1">
                  Tratamento Radicalar & Reuso
                </div>
                {grupoQuimicaZld.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selecionarAbaEFechar(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      activeTab === item.id ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800/90 text-indigo-400 shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item 6: Overflow Compacto / Mais... */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleDropdown('MAIS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                grupoMais.some(g => g.id === activeTab && g.id !== 'GESTAO_USUARIOS_RBAC')
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Mais</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${dropdownAberto === 'MAIS' ? 'rotate-180' : ''}`} />
            </button>

            {dropdownAberto === 'MAIS' && (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 mb-1">
                  Módulos de Apoio & Engenharia
                </div>
                {grupoMais.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selecionarAbaEFechar(item.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      activeTab === item.id ? 'bg-blue-600/20 border border-blue-500/40 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800/90 text-slate-400 shrink-0">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* 3. LADO DIREITO: PARADA DE EMERGÊNCIA, LAUDOS, LAYOUT E CONTA */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Botão Parada de Emergência Primário */}
          <button
            onClick={onParadaEmergencia}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-red-700/30 border border-red-500/40 transition-all active:scale-95"
            title="Parada de Emergência: Desenergização total e corte de bombas (NR-12)"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Parada Emergência</span>
          </button>

          {/* Laudo Duplo 888 + 430 */}
          {onAbrirLaudoDuplo && (
            <button
              onClick={onAbrirLaudoDuplo}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hidden sm:flex"
              title="Laudo Técnico Integrado Duplo: Portaria GM/MS 888 + CONAMA 430"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Laudo Duplo</span>
            </button>
          )}

          {/* Botão de 1 Clique: Alternar para Menu Vertical (Imagem 3) */}
          <button
            onClick={() => onAlternarLayoutNavegacao('VERTICAL_EXPANDIDO')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hidden sm:flex"
            title="Alternar para Menu Lateral Vertical (Imagem 3)"
          >
            <SidebarIcon className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">Menu Vertical</span>
          </button>

          {/* Sino de Notificações / Alarmes com Contador (Imagem 2) */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificacoesAberto(!notificacoesAberto);
                setMenuContaAberto(false);
                setDropdownAberto(null);
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all relative"
              title="Notificações e Alarmes do Sistema"
            >
              <Bell className="w-4 h-4" />
              {resumoGlobal.celulasIntertravadas > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center font-mono ring-2 ring-slate-950 animate-pulse">
                  {resumoGlobal.celulasIntertravadas}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950"></span>
              )}
            </button>

            {notificacoesAberto && (
              <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-rose-400" />
                    Alarmes & Eventos Recentes
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {resumoGlobal.celulasIntertravadas} Críticos
                  </span>
                </div>
                <div className="py-2 space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300">
                    <div className="font-bold flex items-center justify-between">
                      <span>Interlock 2.80 bar FTE-CDI</span>
                      <span className="text-[9px] font-mono">1.40 V DC</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">Pressão do manifold de 16 células normalizada em 1.80 bar.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                    <div className="font-bold flex items-center justify-between">
                      <span>Circuito ZLD T-102 Ativo</span>
                      <span className="text-[9px] font-mono">780 L/h</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">Lavagem contínua de tela e diluição CONTHEC operando 100% fechado.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Menu de Conta do Usuário / Supervisor (Imagem 2) */}
          <div className="relative">
            <button
              onClick={() => {
                setMenuContaAberto(!menuContaAberto);
                setNotificacoesAberto(false);
                setDropdownAberto(null);
              }}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
                {usuarioAtual.nome.charAt(0)}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                  {usuarioAtual.nome.split(' ')[0]} {usuarioAtual.nome.split(' ')[1] || ''}
                </div>
                <div className="text-[9px] font-mono text-slate-400 font-semibold uppercase">
                  {usuarioAtual.nivel_acesso}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuContaAberto ? 'rotate-180' : ''}`} />
            </button>

            {menuContaAberto && (
              <div className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-3 border-b border-slate-800">
                  <div className="text-sm font-bold text-white">{usuarioAtual.nome}</div>
                  <div className="text-xs text-slate-400 font-mono">{usuarioAtual.cargo}</div>
                  <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Matrícula: {usuarioAtual.matricula}
                  </div>
                </div>

                {/* Alternador Rápido de Layout de Navegação (HORIZONTAL <-> VERTICAL) */}
                <div className="py-2.5 border-b border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Modo de Navegação SCADA
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => onAlternarLayoutNavegacao('HORIZONTAL')}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        layoutAtual === 'HORIZONTAL'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>Horizontal</span>
                    </button>

                    <button
                      onClick={() => onAlternarLayoutNavegacao('VERTICAL_EXPANDIDO')}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        layoutAtual.startsWith('VERTICAL')
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <SidebarIcon className="w-3.5 h-3.5" />
                      <span>Vertical</span>
                    </button>
                  </div>
                </div>

                {/* Troca de Perfil de Usuário */}
                <div className="py-2.5 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Alternar Operador / RBAC
                  </div>
                  {usuariosDisponiveis.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onChangeUsuario(u);
                        setMenuContaAberto(false);
                      }}
                      className={`w-full p-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        u.id === usuarioAtual.id ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{u.nome}</span>
                      {u.id === usuarioAtual.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>

                {/* Ações Rápidas */}
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      selecionarAbaEFechar('GESTAO_USUARIOS_RBAC');
                      setMenuContaAberto(false);
                    }}
                    className="w-full p-2 rounded-xl text-xs text-emerald-300 hover:text-white hover:bg-emerald-950/40 flex items-center justify-between font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gestão de Usuários & Zonas</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">CFR 21</span>
                  </button>

                  <button
                    onClick={() => {
                      onAbrirParametros();
                      setMenuContaAberto(false);
                    }}
                    className="w-full p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Configurações & Interlocks</span>
                  </button>

                  <button
                    onClick={() => {
                      onAbrirLaudosOficiais();
                      setMenuContaAberto(false);
                    }}
                    className="w-full p-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Emissão de Laudos Oficiais</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botão Hambúrguer Mobile (visível em telas < lg) */}
          <button
            onClick={() => setMobileMenuAberto(!mobileMenuAberto)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all lg:hidden"
            title="Menu de Navegação Mobile"
          >
            {mobileMenuAberto ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5 text-slate-300" />}
          </button>
        </div>

      </div>

      {/* Gaveta / Drawer Mobile & Tablet (Abaixo do Header) */}
      {mobileMenuAberto && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800/90 p-4 space-y-4 max-h-[80vh] overflow-y-auto scada-scrollbar animate-in slide-in-from-top-2 duration-150 shadow-2xl">
          {/* Botão Sinóptico Híbrido Padrão Ideal */}
          <button
            onClick={() => {
              selecionarAbaEFechar('SINOPTICO_HIBRIDO');
              setMobileMenuAberto(false);
            }}
            className={`w-full p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
              activeTab === 'SINOPTICO_HIBRIDO'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/35 ring-1 ring-blue-400/50'
                : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Sinóptico Híbrido (Padrão Ideal - Imagem 1)</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          {/* Botão Gestão de Usuários & Zonas RBAC no Mobile */}
          <button
            onClick={() => {
              selecionarAbaEFechar('GESTAO_USUARIOS_RBAC');
              setMobileMenuAberto(false);
            }}
            className={`w-full p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
              activeTab === 'GESTAO_USUARIOS_RBAC'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 border-emerald-400'
                : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Gestão de Usuários & Zonas (RBAC / CFR 21)</span>
            </div>
            <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              CFR 21
            </span>
          </button>

          {/* Grupo Processo */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1">
              Processo FTE-CDI
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {grupoProcesso.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    selecionarAbaEFechar(item.id);
                    setMobileMenuAberto(false);
                  }}
                  className={`p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                    activeTab === item.id ? 'bg-blue-600/20 border border-blue-500/40 text-white font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Grupo Química & ZLD */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1">
              Química, Reagentes & ZLD T-102
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {grupoQuimicaZld.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    selecionarAbaEFechar(item.id);
                    setMobileMenuAberto(false);
                  }}
                  className={`p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                    activeTab === item.id ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Grupo Mais */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold px-1">
              Engenharia, Tags & Supabase
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {grupoMais.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    selecionarAbaEFechar(item.id);
                    setMobileMenuAberto(false);
                  }}
                  className={`p-2.5 rounded-xl text-left flex items-start gap-2.5 transition-all ${
                    activeTab === item.id ? 'bg-blue-600/20 border border-blue-500/40 text-white font-bold' : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Comutador Rápido de Layout no Mobile Drawer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Modo de Navegação:</span>
            <button
              onClick={() => {
                onAlternarLayoutNavegacao('VERTICAL_EXPANDIDO');
                setMobileMenuAberto(false);
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30"
            >
              <SidebarIcon className="w-3.5 h-3.5" />
              <span>Mudar para Menu Vertical</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
