/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  ArrowRight, 
  Share2, 
  Beaker, 
  Activity, 
  Zap, 
  ChevronDown, 
  Check, 
  Sliders, 
  ShieldCheck, 
  Info, 
  Gauge, 
  Droplets,
  Flame,
  RotateCcw
} from 'lucide-react';
import { 
  ModoVisualizacaoSinoptico, 
  TopologiaTratamentoId, 
  ConthecLayoutPosition, 
  FteCdiLayoutPosition, 
  BombaBiossonicaPosicao,
  BombaBiossonicaState 
} from '../types';

interface ProcessControlToolbarProps {
  modoVisualizacao: ModoVisualizacaoSinoptico;
  onSetModoVisualizacao: (modo: ModoVisualizacaoSinoptico) => void;
  topologiaAtiva: TopologiaTratamentoId;
  onSelecionarTopologia: (topologia: TopologiaTratamentoId) => void;
  posicaoConthec: ConthecLayoutPosition;
  onSetPosicaoConthec: (posicao: ConthecLayoutPosition) => void;
  posicaoFteCdi: FteCdiLayoutPosition;
  onSetPosicaoFteCdi: (posicao: FteCdiLayoutPosition) => void;
  posicaoBiossonica: BombaBiossonicaPosicao;
  onTrocarPosicaoBiossonica: (posicao: BombaBiossonicaPosicao) => void;
  bioState: BombaBiossonicaState;
}

/**
 * ProcessControlToolbar — Barra Horizontal Unificada de Comandos de Processo
 * Conforme ANSI/ISA-101.01-2015 e ISO 9241-110:
 * - Reduz 5 faixas empilhadas verticais para 1 barra única de 48px;
 * - Ganho de mais de 230px úteis de altura vertical no viewport;
 * - 5 Menus suspensos inteligentes com cards flutuantes (popovers) protegidos contra cliques acidentais.
 */
export const ProcessControlToolbar: React.FC<ProcessControlToolbarProps> = ({
  modoVisualizacao,
  onSetModoVisualizacao,
  topologiaAtiva,
  onSelecionarTopologia,
  posicaoConthec,
  onSetPosicaoConthec,
  posicaoFteCdi,
  onSetPosicaoFteCdi,
  posicaoBiossonica,
  onTrocarPosicaoBiossonica,
  bioState
}) => {
  const [menuAberto, setMenuAberto] = useState<'VIS' | 'TOPOLOGIA' | 'CONTHEC' | 'FTE' | 'BBS' | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Fecha qualquer popover ao clicar fora
  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setMenuAberto(null);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const toggleMenu = (menu: 'VIS' | 'TOPOLOGIA' | 'CONTHEC' | 'FTE' | 'BBS') => {
    setMenuAberto(prev => prev === menu ? null : menu);
  };

  // Labels e Badges Dinâmicos
  const labelModoVis = modoVisualizacao === 'LAYOUT_FISICO_PLANTA' 
    ? 'Planta Física & Manifold' 
    : 'Dynamic PFD Sequencial';

  const labelTopologia = {
    'TOPOLOGIA_A_PRE_OXIDACAO': 'TOP-A: Pré-Oxidação (Padrão)',
    'TOPOLOGIA_B_POS_OXIDACAO': 'TOP-B: Pós-Oxidação',
    'TOPOLOGIA_C_LINHAS_PARALELAS': 'TOP-C: Split Paralelo (50/50)',
    'TOPOLOGIA_D_FTE_DIRETO_BYPASS': 'TOP-D: Bypass POA (FTE Direto)'
  }[topologiaAtiva];

  const labelConthec = {
    'POS_1_INICIO': '1. Início (Pré-Oxidação)',
    'POS_2_MEIO': '2. Meio (Pós-Oxidação)',
    'POS_3_FINAL': '3. Final (Polimento Terminal)'
  }[posicaoConthec];

  const labelFte = {
    'POS_1_INICIO': '1. Início (Montante)',
    'POS_2_MEIO': '2. Meio (Série Central)',
    'POS_3_FINAL': '3. Final (Jusante)'
  }[posicaoFteCdi];

  const labelBbs = {
    'POS_1_PRIMARIO_ENTRADA': 'Slot 1: Entrada Poço T-100',
    'POS_2_INTERMEDIARIO_POA': 'Slot 2: Intermediário POA',
    'POS_3_RETROLAVAGEM_UGL': 'Slot 3: Retrolavagem UGL',
    'POS_4_POLIMENTO_TERMINAL': 'Slot 4: Polimento Terminal'
  }[posicaoBiossonica];

  return (
    <div ref={toolbarRef} className="w-full mt-3 relative z-30">
      {/* BARRA HORIZONTAL UNIFICADA (TOOLBAR DE COMANDOS DE PROCESSO) */}
      <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-1.5 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-1.5 text-xs select-none">
        
        {/* Identificador Nodal de Comandos */}
        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-400 font-mono text-[11px] font-bold uppercase tracking-wider hidden lg:flex border-r border-slate-800 shrink-0">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>Controles de Processo:</span>
        </div>

        {/* CONTAINER DOS 5 MENUS DROPDOWN HORIZONTAIS */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          
          {/* 1. MENU: MODO DE VISUALIZAÇÃO */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('VIS')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all border ${
                menuAberto === 'VIS'
                  ? 'bg-sky-600/20 text-white border-sky-400 shadow-md ring-1 ring-sky-400/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Modo de Exibição do Sinóptico (Planta Física vs Diagrama PFD)"
            >
              <Layers className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono leading-none">Exibição:</span>
                <span className="font-bold text-xs truncate max-w-[140px] block">{labelModoVis}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuAberto === 'VIS' ? 'rotate-180' : ''}`} />
            </button>

            {menuAberto === 'VIS' && (
              <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-slate-950/98 border border-slate-700 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Modos de Visualização (ISO 10628)</span>
                  <span className="text-sky-400">P&ID Web</span>
                </div>

                <button
                  onClick={() => {
                    onSetModoVisualizacao('LAYOUT_FISICO_PLANTA');
                    setMenuAberto(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 mb-1 ${
                    modoVisualizacao === 'LAYOUT_FISICO_PLANTA'
                      ? 'bg-sky-600/20 border border-sky-500/50 text-white font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">1. Layout Físico & Manifolds</span>
                      {modoVisualizacao === 'LAYOUT_FISICO_PLANTA' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Representação espacial dos equipamentos, blocos modulares, tubulações PEAD e válvulas em escala relativa.</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onSetModoVisualizacao('DIAGRAMA_FLUXO_SEQUENCIAL');
                    setMenuAberto(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                    modoVisualizacao === 'DIAGRAMA_FLUXO_SEQUENCIAL'
                      ? 'bg-indigo-600/20 border border-indigo-500/50 text-white font-bold'
                      : 'hover:bg-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">2. Fluxo Sequencial (Dynamic PFD)</span>
                      {modoVisualizacao === 'DIAGRAMA_FLUXO_SEQUENCIAL' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Diagrama unifilar linear contínuo evidenciando a lógica sequencial de tratamento químico e desmineralização.</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. MENU: TOPOLOGIA DE PROCESSO (1-CLICK SWITCHER) */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('TOPOLOGIA')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all border ${
                menuAberto === 'TOPOLOGIA'
                  ? 'bg-blue-600/20 text-white border-blue-400 shadow-md ring-1 ring-blue-400/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Comutador de Topologias Dinâmicas de Processo"
            >
              <Share2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono leading-none">Topologia:</span>
                <span className="font-bold text-xs truncate max-w-[150px] block">{labelTopologia}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuAberto === 'TOPOLOGIA' ? 'rotate-180' : ''}`} />
            </button>

            {menuAberto === 'TOPOLOGIA' && (
              <div className="absolute top-full left-0 mt-2 w-96 rounded-2xl bg-slate-950/98 border border-slate-700 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Topologias de Processo (180 m³/h)</span>
                  <span className="text-blue-400">PEAD DN200</span>
                </div>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto scada-scrollbar pr-1">
                  {/* TOP-A */}
                  <button
                    onClick={() => {
                      onSelecionarTopologia('TOPOLOGIA_A_PRE_OXIDACAO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      topologiaAtiva === 'TOPOLOGIA_A_PRE_OXIDACAO'
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px] mt-0.5 shrink-0">
                      TOP-A
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Pré-Oxidação (Padrão Homologado)</span>
                        {topologiaAtiva === 'TOPOLOGIA_A_PRE_OXIDACAO' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">T-100 ➔ CONTHEC (POA) ➔ FTE-CDI ➔ T-201. Menor perda de carga (0.35 bar), clivagem prévia de matéria orgânica.</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-emerald-400">
                        <span>XV-101 / XV-201 / XV-301 ABERTAS</span>
                      </div>
                    </div>
                  </button>

                  {/* TOP-B */}
                  <button
                    onClick={() => {
                      onSelecionarTopologia('TOPOLOGIA_B_POS_OXIDACAO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      topologiaAtiva === 'TOPOLOGIA_B_POS_OXIDACAO'
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px] mt-0.5 shrink-0">
                      TOP-B
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Pós-Oxidação (Invertida)</span>
                        {topologiaAtiva === 'TOPOLOGIA_B_POS_OXIDACAO' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">T-100 ➔ FTE-CDI ➔ CONTHEC (Polimento) ➔ T-201. Desmineralização prioritária com desinfecção terminal reforçada.</p>
                    </div>
                  </button>

                  {/* TOP-C */}
                  <button
                    onClick={() => {
                      onSelecionarTopologia('TOPOLOGIA_C_LINHAS_PARALELAS');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      topologiaAtiva === 'TOPOLOGIA_C_LINHAS_PARALELAS'
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] mt-0.5 shrink-0">
                      TOP-C
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Split Paralelo (50/50)</span>
                        {topologiaAtiva === 'TOPOLOGIA_C_LINHAS_PARALELAS' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Linha 1 POA (90 m³/h) e Linha 2 FTE-CDI (90 m³/h) com mistura equilibrada antes de T-201.</p>
                    </div>
                  </button>

                  {/* TOP-D */}
                  <button
                    onClick={() => {
                      onSelecionarTopologia('TOPOLOGIA_D_FTE_DIRETO_BYPASS');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      topologiaAtiva === 'TOPOLOGIA_D_FTE_DIRETO_BYPASS'
                        ? 'bg-amber-600/20 border border-amber-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] mt-0.5 shrink-0">
                      TOP-D
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Bypass POA (FTE Direto)</span>
                        {topologiaAtiva === 'TOPOLOGIA_D_FTE_DIRETO_BYPASS' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">T-100 direto para o FTE-CDI (isolamento do Skid CONTHEC para manutenção ou reabastecimento químico).</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. MENU: POSIÇÃO OPERACIONAL SKID CONTHEC */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('CONTHEC')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all border ${
                menuAberto === 'CONTHEC'
                  ? 'bg-indigo-600/20 text-white border-indigo-400 shadow-md ring-1 ring-indigo-400/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Posição Operacional do Skid Quádruplo CONTHEC (A+B+C)"
            >
              <Beaker className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono leading-none">Skid CONTHEC:</span>
                <span className="font-bold text-xs truncate max-w-[150px] block">{labelConthec}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuAberto === 'CONTHEC' ? 'rotate-180' : ''}`} />
            </button>

            {menuAberto === 'CONTHEC' && (
              <div className="absolute top-full left-0 mt-2 w-88 rounded-2xl bg-slate-950/98 border border-slate-700 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Posição do Skid CONTHEC</span>
                  <span className="text-indigo-400">Frascos A+B+C</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      onSetPosicaoConthec('POS_1_INICIO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoConthec === 'POS_1_INICIO'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">1. Início (Pré-Oxidação)</span>
                        {posicaoConthec === 'POS_1_INICIO' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado a montante (x=260). Oxidação primária e proteção das membranas/eletrodos do FTE-CDI.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSetPosicaoConthec('POS_2_MEIO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoConthec === 'POS_2_MEIO'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">2. Meio (Pós-Oxidação)</span>
                        {posicaoConthec === 'POS_2_MEIO' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado entre módulos (x=690). Reoxidação de intermediários e quebra de complexos químicos.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSetPosicaoConthec('POS_3_FINAL');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoConthec === 'POS_3_FINAL'
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">3. Final (Polimento — Padrão Ideal)</span>
                        {posicaoConthec === 'POS_3_FINAL' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado a jusante (x=1140). Cloração residual de potabilidade (Portaria 888) e diluição via Tanque T-102.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. MENU: POSIÇÃO OPERACIONAL REATOR FTE-CDI */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('FTE')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all border ${
                menuAberto === 'FTE'
                  ? 'bg-emerald-600/20 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Posição Operacional do Reator Modular FTE-CDI (16 Células)"
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono leading-none">Reator FTE-CDI:</span>
                <span className="font-bold text-xs truncate max-w-[150px] block">{labelFte}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuAberto === 'FTE' ? 'rotate-180' : ''}`} />
            </button>

            {menuAberto === 'FTE' && (
              <div className="absolute top-full left-0 mt-2 w-88 rounded-2xl bg-slate-950/98 border border-slate-700 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Estágio do Reator FTE-CDI</span>
                  <span className="text-emerald-400">16 Células</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      onSetPosicaoFteCdi('POS_1_INICIO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoFteCdi === 'POS_1_INICIO'
                        ? 'bg-emerald-600/20 border border-emerald-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">1. Início (Montante Poço T-100)</span>
                        {posicaoFteCdi === 'POS_1_INICIO' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado logo após o poço (x=260). Desmineralização capacitiva primária com XV-103 reposicionada.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSetPosicaoFteCdi('POS_2_MEIO');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoFteCdi === 'POS_2_MEIO'
                        ? 'bg-emerald-600/20 border border-emerald-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">2. Meio (Série — Padrão Ideal)</span>
                        {posicaoFteCdi === 'POS_2_MEIO' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado centralmente (x=690). Alimentado após cavitação e pré-oxidação; rejeito de 850 L/h para UGL.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onSetPosicaoFteCdi('POS_3_FINAL');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoFteCdi === 'POS_3_FINAL'
                        ? 'bg-emerald-600/20 border border-emerald-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">3. Final (Jusante Manifold)</span>
                        {posicaoFteCdi === 'POS_3_FINAL' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posicionado no estágio final (x=1140). Polimento condutimétrico terminal de sais residuais.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. MENU: POSIÇÃO ACOPLADA BBS-100 */}
          <div className="relative">
            <button
              onClick={() => toggleMenu('BBS')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-all border ${
                menuAberto === 'BBS'
                  ? 'bg-purple-600/20 text-white border-purple-400 shadow-md ring-1 ring-purple-400/30'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
              title="Posição Acoplada da Bomba Biossônica de Cavitação BBS-100"
            >
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] text-slate-400 block font-mono leading-none">BBS-100 ({bioState.rotacaoRpm} RPM):</span>
                <span className="font-bold text-xs truncate max-w-[150px] block">{labelBbs}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${menuAberto === 'BBS' ? 'rotate-180' : ''}`} />
            </button>

            {menuAberto === 'BBS' && (
              <div className="absolute top-full right-0 lg:left-0 mt-2 w-96 rounded-2xl bg-slate-950/98 border border-slate-700 shadow-2xl backdrop-blur-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Acoplamento Acústico BBS-100</span>
                  <span className="text-purple-400 font-bold">{bioState.frequenciaUltrassonicaKhz} kHz</span>
                </div>

                {/* Telemetria Compacta no Topo do Card */}
                <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/20 mb-2 grid grid-cols-3 gap-1 text-center font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Rotação:</span>
                    <span className="text-xs font-bold text-purple-300">{bioState.rotacaoRpm} RPM</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Delta P:</span>
                    <span className="text-xs font-bold text-purple-300">{bioState.deltaPBar} bar</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Lise Celular:</span>
                    <span className="text-xs font-bold text-emerald-400">{bioState.eficienciaLiseCelularPct}%</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto scada-scrollbar pr-1">
                  <button
                    onClick={() => {
                      onTrocarPosicaoBiossonica('POS_1_PRIMARIO_ENTRADA');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoBiossonica === 'POS_1_PRIMARIO_ENTRADA'
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Slot 1: Entrada Poço T-100</span>
                        {posicaoBiossonica === 'POS_1_PRIMARIO_ENTRADA' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Desaglomeração coloidal de água bruta e quebra primária de macromoléculas.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTrocarPosicaoBiossonica('POS_2_INTERMEDIARIO_POA');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoBiossonica === 'POS_2_INTERMEDIARIO_POA'
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Slot 2: Intermediário POA (Padrão Ideal)</span>
                        {posicaoBiossonica === 'POS_2_INTERMEDIARIO_POA' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Homogeneização radicalar da mistura de reagentes CONTHEC e cavitação acústica.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTrocarPosicaoBiossonica('POS_3_RETROLAVAGEM_UGL');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoBiossonica === 'POS_3_RETROLAVAGEM_UGL'
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Slot 3: Retrolavagem ZLD (Módulo UGL)</span>
                        {posicaoBiossonica === 'POS_3_RETROLAVAGEM_UGL' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Descolamento ultrassônico de biofilmes nos eletrodos e condicionamento de lodo.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTrocarPosicaoBiossonica('POS_4_POLIMENTO_TERMINAL');
                      setMenuAberto(null);
                    }}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 ${
                      posicaoBiossonica === 'POS_4_POLIMENTO_TERMINAL'
                        ? 'bg-purple-600/20 border border-purple-500/50 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Slot 4: Polimento Terminal (Pré T-201)</span>
                        {posicaoBiossonica === 'POS_4_POLIMENTO_TERMINAL' && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Esterilização física terminal por sonólise celular antes da entrega no reservatório.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
