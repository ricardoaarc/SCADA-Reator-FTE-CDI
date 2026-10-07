/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Droplets, 
  Flame, 
  Layers, 
  ShieldCheck, 
  Zap, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Settings2, 
  FileCheck, 
  ChevronRight, 
  ChevronDown,
  TrendingDown, 
  Sparkles, 
  ArrowRight, 
  Beaker, 
  Pipette, 
  Recycle, 
  Radio, 
  Sliders, 
  Share2,
  X,
  Gauge,
  SlidersHorizontal,
  Compass,
  MapPin,
  Maximize2,
  Lock,
  Workflow,
  Plus,
  Save,
  Building2
} from 'lucide-react';
import { 
  PurifyWaveState, 
  CelulaInfo, 
  BombaBiossonicaPosicao, 
  TopologiaTratamentoId,
  ValvulaMotorizadaInfo,
  ModoVisualizacaoSinoptico,
  FteCdiLayoutPosition,
  ConthecLayoutPosition,
  PipelineSectionInfo
} from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';
import { BiosonicPumpPanel } from './BiosonicPumpPanel';
import { PipelineSwitcherPanel } from './PipelineSwitcherPanel';
import { ConthecDetailModal } from './ConthecDetailModal';
import { UglZldDetailModal } from './UglZldDetailModal';
import { ValveControlModal } from './ValveControlModal';
import { WellDetailModal } from './WellDetailModal';
import { PipelineConfigModal } from './PipelineConfigModal';
import { ScadaValveNode } from './ScadaValveNode';
import { ProcessControlToolbar } from './ProcessControlToolbar';
import { AntV6SynopticView } from './AntV6SynopticView';
import { MultiStationProvisioningModal } from './MultiStationProvisioningModal';

interface HybridSynopticViewProps {
  onOpenCellDetail: (celula: CelulaInfo) => void;
  onOpenDualReportModal: () => void;
  onOpenPurifyWavePanel: () => void;
  onOpenUsuariosGestao?: () => void;
}

export const HybridSynopticView: React.FC<HybridSynopticViewProps> = ({
  onOpenCellDetail,
  onOpenDualReportModal,
  onOpenPurifyWavePanel,
  onOpenUsuariosGestao,
}) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const [celulas, setCelulas] = useState<CelulaInfo[]>(controllerV2Instance.celulas);
  
  // Modais de Controle e Supervisão
  const [modalBiossonicaAberto, setModalBiossonicaAberto] = useState(false);
  const [modalTopologiasAberto, setModalTopologiasAberto] = useState(false);
  const [modalConthecAberto, setModalConthecAberto] = useState(false);
  const [modalUglZldAberto, setModalUglZldAberto] = useState(false);
  const [modalPocoAberto, setModalPocoAberto] = useState(false);
  const [valvulaSelecionada, setValvulaSelecionada] = useState<ValvulaMotorizadaInfo | null>(null);
  const [modalValvulaAberto, setModalValvulaAberto] = useState(false);

  // Estados Multi-Site / Grid SCADA ISA-95 & Bomba P-101
  const [estacaoAtiva, setEstacaoAtiva] = useState('ETA Central - Reator FTE-CDI (Principal)');
  const [modalBombaP101Aberto, setModalBombaP101Aberto] = useState(false);
  const [modalAdicionarPocoAberto, setModalAdicionarPocoAberto] = useState(false);
  const [modalEdgeTelemetriaAberto, setModalEdgeTelemetriaAberto] = useState(false);
  const [modalProvisionamentoEstacoesAberto, setModalProvisionamentoEstacoesAberto] = useState(false);
  const [mostrarControlesProcesso, setMostrarControlesProcesso] = useState(false);

  // VFD Bomba P-101 State
  const [bombaP101State, setBombaP101State] = useState({
    status: 'LIGADA' as 'LIGADA' | 'DESLIGADA' | 'TRIP_FALHA',
    frequenciaHz: 54.0,
    vazaoM3h: 180,
    pressaoRecalqueBar: 4.2,
    pressaoSucaoBar: 1.8,
    correnteAmp: 88.5,
    setpointBar: 4.0,
    modo: 'AUTOMATICO_VFD' as 'AUTOMATICO_VFD' | 'MANUAL' | 'INTERTRAVADO',
    succaoPoco1: true,
    succaoPoco2: true,
  });

  // Poços do Grid
  const [pocosGrid, setPocosGrid] = useState([
    { id: 'POCO-100', tag: 'POÇO T-100', desc: 'Manancial Puro Principal', vazao: 180, nivel: 62.0, fluoreto: 8.5, ativo: true },
    { id: 'POCO-101', tag: 'POÇO T-101', desc: 'Manancial Auxiliar Secundário', vazao: 120, nivel: 58.5, fluoreto: 6.2, ativo: true }
  ]);

  // Modal de Telemetria de Tubulações
  const [modalTubulacaoAberta, setModalTubulacaoAberta] = useState(false);
  const [tubulacaoSelecionada, setTubulacaoSelecionada] = useState<PipelineSectionInfo | null>(null);

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });

    const interval = setInterval(() => {
      setCelulas([...controllerV2Instance.celulas]);
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const [modoEngine, setModoEngine] = useState<'SVG_DIRECT' | 'ANTV_X6'>(() => {
    try {
      const saved = localStorage.getItem('scada_default_engine_mode');
      if (saved === 'SVG_DIRECT' || saved === 'ANTV_X6') return saved;
    } catch (e) {
      // fallback
    }
    return 'ANTV_X6'; // Padrão Oficial na Fase 5 Homologada
  });

  const alternarEngine = () => {
    const novo = modoEngine === 'SVG_DIRECT' ? 'ANTV_X6' : 'SVG_DIRECT';
    setModoEngine(novo);
    try {
      localStorage.setItem('scada_default_engine_mode', novo);
    } catch (e) {
      // fallback
    }
  };
  const skid = pwState.skidConthec;
  const bio = pwState.biossonica;
  const poco = pwState.pocoT100;
  const t102 = pwState.tanqueReusoT102;
  const valvulas = pwState.valvulas;
  const modoVis = pwState.modoVisualizacao || 'LAYOUT_FISICO_PLANTA';
  const posFte = pwState.posicaoFteCdi || 'POS_1_INICIO';   // Padrão Oficial: FTE-CDI no Início
  const posConthec = pwState.posicaoConthec || 'POS_3_FINAL'; // Padrão Oficial: Skid CONTHEC no Final

  const abrirValvulaModal = (tag: string) => {
    if (valvulas && valvulas[tag]) {
      setValvulaSelecionada(valvulas[tag]);
      setModalValvulaAberto(true);
    }
  };

  const abrirTubulacaoModal = (tag: string) => {
    const tub = purifyWaveService.getTubulacoesInfo().find((t: any) => t.tag === tag);
    if (tub) {
      setTubulacaoSelecionada(tub);
      setModalTubulacaoAberta(true);
    }
  };

  const handleAtualizarSentidoTubulacao = (tag: string, sentido: 'NORMAL' | 'REVERSO' | 'BLOQUEADO') => {
    purifyWaveService.atualizarSentidoFluxoTubulacao(tag, sentido);
  };

  // =========================================================================
  // CINEMÁTICA PARAMÉTRICA EXPANDIDA E ESPAÇADA (GRAFO SCADA WEB INDUSTRIAL)
  // Canvas: viewBox="0 0 1800 680" (Zero Colisões, Zero Tremores)
  // =========================================================================
  // - Poço T-100: x = 25, y = 50, w = 100, h = 240. Bocal N1: (125, 165)
  // - Válvula Cabeçote XV-100: (165, 165)
  // - Tanque Potável Final T-201: x = 1680, y = 85, w = 95, h = 160
  // - Válvula Saída XV-401: (1610, 165)
  // - Tanque de Reuso T-102 (5 m³): x = 240, y = 415, w = 185, h = 175
  // - Módulo UGL & Circuito ZLD: x = 620, y = 415, w = 310, h = 175
  
  let skidX = 260;
  let fteX = 690;
  let manifoldX = 1140;
  let uglX = 690;
  let t102X = 260;

  // Lógica de Posições Relativas Não-Conflitantes (Início, Meio, Final)
  if (posConthec === 'POS_1_INICIO') {
    skidX = 260;
    if (posFte === 'POS_3_FINAL') {
      manifoldX = 680;
      fteX = 1140;
      uglX = 990;
      t102X = 260;
    } else {
      fteX = 690;
      manifoldX = 1160;
      uglX = 690;
      t102X = 260;
    }
  } else if (posConthec === 'POS_2_MEIO') {
    if (posFte === 'POS_1_INICIO') {
      fteX = 260;
      skidX = 690;
      manifoldX = 1160;
      uglX = 260;
      t102X = 690;
    } else {
      manifoldX = 260;
      skidX = 690;
      fteX = 1140;
      uglX = 990;
      t102X = 420;
    }
  } else if (posConthec === 'POS_3_FINAL') {
    if (posFte === 'POS_1_INICIO') {
      fteX = 260;
      manifoldX = 690;
      skidX = 1140;
      uglX = 260;
      t102X = 690;
    } else {
      manifoldX = 260;
      fteX = 690;
      skidX = 1140;
      uglX = 690;
      t102X = 260;
    }
  }

  // Posição Dinâmica da Bomba Biossônica BBS-100 nos 4 Slots
  let bioPosX = manifoldX + 30;
  let bioPosY = 165;

  if (bio.posicaoAtual === 'POS_1_PRIMARIO_ENTRADA') {
    bioPosX = 165;
    bioPosY = 85;
  } else if (bio.posicaoAtual === 'POS_2_INTERMEDIARIO_POA') {
    bioPosX = manifoldX + 30;
    bioPosY = 165;
  } else if (bio.posicaoAtual === 'POS_3_RETROLAVAGEM_UGL') {
    bioPosX = uglX + 240;
    bioPosY = 480;
  } else if (bio.posicaoAtual === 'POS_4_POLIMENTO_TERMINAL') {
    bioPosX = 1530;
    bioPosY = 95;
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Unificado do Sinóptico Híbrido (Padrão Cockpit Compacto ISA-101) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md space-y-2.5">
        
        {/* Linha Principal de Controle */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
          
          {/* Lado Esquerdo: Identificação & Estação Selecionada */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-indigo-500/30 text-sky-400 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-black text-white tracking-wide font-display">
                  Sinóptico Híbrido
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  180 m³/h
                </span>
              </div>
            </div>

            {/* Seletor de Estação Compacto */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <select
                value={estacaoAtiva}
                onChange={(e) => setEstacaoAtiva(e.target.value)}
                className="bg-transparent font-mono text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="ETA Central - Reator FTE-CDI (Principal)">🏢 ETA Central (180 m³/h)</option>
                <option value="ETA Bairro X 01 - Grid Poços 27/28">🏢 ETA Bairro X 01</option>
                <option value="Poço Secundário 27 - Bairro X 01">🏢 Poço Secundário 27</option>
                <option value="ETE Central - Reúso ZLD & Prensa UGL">🏢 ETE Central ZLD</option>
                <option value="ETE Estrada X Km01 - Desinfecção">🏢 ETE Estrada X</option>
              </select>
            </div>

            {/* Badges de Status Compactos */}
            <div className="hidden lg:flex items-center gap-1.5">
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ZLD Ativo
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                BBS-100: {bio.rotacaoRpm} RPM
              </span>
            </div>
          </div>

          {/* Lado Direito: Ações Rápidas & Alternador de Processo */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onOpenUsuariosGestao && (
              <button
                type="button"
                onClick={onOpenUsuariosGestao}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-emerald-500/40 transition shadow-sm"
                title="Cadastrar e gerenciar usuários por Zonas de Operação & Perfis Técnicos (FDA 21 CFR Part 11 / IEC 62443)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Usuários & Zonas</span>
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  CFR 21
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMostrarControlesProcesso(!mostrarControlesProcesso)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                mostrarControlesProcesso
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Expandir/Recolher Controles de Processo das 5 Posições (Topologias e Manobras)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Controles Processo</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${mostrarControlesProcesso ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setModalTopologiasAberto(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Topologias</span>
            </button>

            <button
              type="button"
              onClick={onOpenDualReportModal}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Laudo Duplo</span>
            </button>

            <button
              type="button"
              onClick={alternarEngine}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-sm ${
                modoEngine === 'ANTV_X6'
                  ? 'bg-purple-600 text-white border-purple-400'
                  : 'bg-purple-600/20 text-purple-300 border-purple-500/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Engine AntV X6</span>
            </button>
          </div>

        </div>

        {/* Drawer Expansível de Controles de Processo */}
        {mostrarControlesProcesso && (
          <div className="pt-2.5 border-t border-slate-800/80 animate-in fade-in duration-200">
            <ProcessControlToolbar
              modoVisualizacao={modoVis}
              onSetModoVisualizacao={(modo) => purifyWaveService.setModoVisualizacao(modo)}
              topologiaAtiva={pwState.topologiaAtiva}
              onSelecionarTopologia={(top) => purifyWaveService.selecionarTopologia(top)}
              posicaoConthec={posConthec}
              onSetPosicaoConthec={(pos) => purifyWaveService.setPosicaoConthec(pos)}
              posicaoFteCdi={posFte}
              onSetPosicaoFteCdi={(pos) => purifyWaveService.setPosicaoFteCdi(pos)}
              posicaoBiossonica={bio.posicaoAtual}
              onTrocarPosicaoBiossonica={(pos) => purifyWaveService.trocarPosicaoBiossonica(pos)}
              bioState={bio}
            />
          </div>
        )}

      </div>

        {/* RENDERIZAÇÃO CONDICIONAL DA ENGINE ANTV X6 OU VISUALIZAÇÃO SVG PADRÃO */}
        {modoEngine === 'ANTV_X6' ? (
          <div className="mt-4">
            <AntV6SynopticView 
              estacaoAtiva={estacaoAtiva}
              onOpenCellDetail={(celulaId) => {
                const c = celulas.find(cell => cell.id === celulaId) || celulas[0];
                if (c) onOpenCellDetail(c);
              }}
              onOpenConthecModal={() => setModalConthecAberto(true)}
              onOpenBiossonicaModal={() => setModalBiossonicaAberto(true)}
              onOpenUglModal={() => setModalUglZldAberto(true)}
              onOpenTanqueT102Modal={() => setModalUglZldAberto(true)}
              onOpenValveModal={(tag) => abrirValvulaModal(tag)}
              onOpenPocoModal={() => setModalPocoAberto(true)}
              onOpenBombaP101Modal={() => setModalBombaP101Aberto(true)}
              onOpenUsuariosGestao={onOpenUsuariosGestao}
            />
          </div>
        ) : (
          /* Contêiner do Sinóptico Gráfico em SVG Responsivo e Espaçado (viewBox 0 0 1800 680) */
          <div className="w-full overflow-x-auto scada-scrollbar pb-2 mt-4 space-y-3">
            <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-2 border-purple-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0 animate-bounce" />
                <div className="text-xs">
                  <span className="font-extrabold text-white block">MODO ATUAL: SVG DIRECT (2D CLÁSSICO)</span>
                  <span className="text-purple-300">As novidades de Roteamento Manhattan, Trava RBAC CFR 21 e Mudança Cromática em Falha estão ativas na Engine AntV X6.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModoEngine('ANTV_X6');
                  try { localStorage.setItem('scada_default_engine_mode', 'ANTV_X6'); } catch (e) {}
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 shrink-0 transition active:scale-95"
              >
                <span>Ativar Engine AntV X6 Oficial ➔</span>
              </button>
            </div>
            <div className="min-w-[1800px] bg-slate-950/95 rounded-xl border border-slate-800/80 p-6 relative">
              <svg viewBox="0 0 1800 680" className="w-full h-auto select-none font-sans">
              <defs>
                {/* Marcadores Vetoriais de Sentido de Fluxo (W3C SVG & ISO 10628) */}
                <marker id="arrowAguaBruta" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24" />
                </marker>

                <marker id="arrowAguaOxidada" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#818cf8" />
                </marker>

                <marker id="arrowAguaPotavel" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
                </marker>

                <marker id="arrowRejeitoSalino" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                </marker>

                <marker id="arrowReusoZld" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
                </marker>

                <marker id="arrowLodo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#b45309" />
                </marker>

                {/* Gradientes Industriais */}
                <linearGradient id="fluxoBrutoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>

                <linearGradient id="fluxoOxidadoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>

                <linearGradient id="fluxoPotavelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>

                <linearGradient id="fluxoZldRejeitoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                <linearGradient id="fluxoZldRecuperadoGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>

                <linearGradient id="pocoProfundoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="60%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <linearGradient id="tanqueT102Grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#022c22" />
                </linearGradient>
              </defs>

              {/* ============================================================== */}
              {/* 1. BARRAMENTO DE TUBULAÇÕES FÍSICAS (ESTRUTURA BASE PASSIVA)   */}
              {/* ============================================================== */}
              <g opacity="0.25" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round">
                {/* Linha Principal Geral */}
                <path d="M 125 165 L 1680 165" />
                {/* Linha Superior de Bypass */}
                <path d="M 165 165 L 165 35 L 1380 35 L 1380 165" />
                {/* Linha de Dessorção e Dreno ZLD do FTE para UGL */}
                <path d={`M ${fteX + 155} 345 L ${fteX + 155} 415 L ${uglX + 160} 415`} />
                {/* Linha de Dreno de Lodo Químico do CONTHEC para UGL */}
                <path d={`M ${skidX + 120} 300 L ${skidX + 120} 380 L ${uglX + 70} 380 L ${uglX + 70} 415`} />
                {/* Linha de Clarificado ZLD da UGL para Tanque T-102 (Solução 1B) */}
                <path d={`M ${uglX} 475 L ${t102X + 185} 475`} />
                {/* Linha de Reuso de Lavagem da Prensa Parafuso */}
                <path d={`M ${t102X + 185} 540 L ${uglX} 540`} />
              </g>

              {/* ============================================================== */}
              {/* 2. TUBULAÇÕES ATIVAS INTERATIVAS COM VETORES DE FLUXO E TELEMETRIA */}
              {/* ============================================================== */}

              {/* Linha 1: Alimentação de Água Bruta L-101-DN200-PEAD */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-101-DN200-PEAD')}
              >
                <path 
                  d={`M 125 165 L ${posConthec === 'POS_1_INICIO' ? skidX : fteX} 165`} 
                  stroke="url(#fluxoBrutoGrad)" 
                  strokeWidth="7" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowAguaBruta)"
                  className="group-hover:stroke-amber-300 transition-colors"
                />
                <path 
                  d={`M 125 165 L ${posConthec === 'POS_1_INICIO' ? skidX - 12 : fteX - 12} 165`} 
                  stroke="#ffffff" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 14" 
                  fill="none" 
                  className="animate-[dash_1.2s_linear_infinite] pointer-events-none opacity-75"
                />
                {/* Badge de TAG da Linha L-101 */}
                <rect x="75" y="138" width="92" height="15" rx="3" fill="#090d16" stroke="#fbbf24" strokeWidth="0.8" />
                <text x="121" y="149" fill="#fde68a" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-101 (180m³/h)
                </text>
              </g>

              {/* Linha Intermediária entre Unidades 1 e 2 (L-201-DN200-PEAD) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-201-DN200-PEAD')}
              >
                <path 
                  d={posConthec === 'POS_1_INICIO'
                    ? `M ${skidX + 240} 165 L ${fteX} 165`
                    : `M ${fteX + 310} 165 L ${skidX} 165`
                  } 
                  stroke="url(#fluxoOxidadoGrad)" 
                  strokeWidth="7" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowAguaOxidada)"
                  className="group-hover:stroke-indigo-300 transition-colors"
                />
                <path 
                  d={posConthec === 'POS_1_INICIO'
                    ? `M ${skidX + 240} 165 L ${fteX - 12} 165`
                    : `M ${fteX + 310} 165 L ${skidX - 12} 165`
                  } 
                  stroke="#c7d2fe" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 14" 
                  fill="none" 
                  className="animate-[dash_1.2s_linear_infinite] pointer-events-none opacity-75"
                />
                <rect 
                  x={posConthec === 'POS_1_INICIO' ? (skidX + 240 + fteX) / 2 - 46 : (fteX + 310 + skidX) / 2 - 46} 
                  y="138" 
                  width="92" 
                  height="15" 
                  rx="3" 
                  fill="#090d16" 
                  stroke="#818cf8" 
                  strokeWidth="0.8" 
                />
                <text 
                  x={posConthec === 'POS_1_INICIO' ? (skidX + 240 + fteX) / 2 : (fteX + 310 + skidX) / 2} 
                  y="149" 
                  fill="#c7d2fe" 
                  fontSize="7.5" 
                  fontWeight="bold" 
                  fontFamily="monospace" 
                  textAnchor="middle"
                >
                  L-201 (1.76 m/s)
                </text>
              </g>

              {/* Linha Intermediária para Manifold e Saída (L-301-DN200-PEAD e L-401) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-301-DN200-PEAD')}
              >
                <path 
                  d={`M ${Math.max(fteX + 310, skidX + 240)} 165 L 1680 165`} 
                  stroke="url(#fluxoPotavelGrad)" 
                  strokeWidth="7" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowAguaPotavel)"
                  className="group-hover:stroke-emerald-300 transition-colors"
                />
                <path 
                  d={`M ${Math.max(fteX + 310, skidX + 240)} 165 L 1670 165`} 
                  stroke="#a7f3d0" 
                  strokeWidth="2.5" 
                  strokeDasharray="6 14" 
                  fill="none" 
                  className="animate-[dash_1s_linear_infinite] pointer-events-none opacity-80"
                />
                <rect 
                  x="1420" 
                  y="138" 
                  width="98" 
                  height="15" 
                  rx="3" 
                  fill="#090d16" 
                  stroke="#10b981" 
                  strokeWidth="0.8" 
                />
                <text 
                  x="1469" 
                  y="149" 
                  fill="#6ee7b7" 
                  fontSize="7.5" 
                  fontWeight="bold" 
                  fontFamily="monospace" 
                  textAnchor="middle"
                >
                  L-401 (Portaria 888)
                </text>
              </g>

              {/* Linha de Dessorção e Rejeito Salino XV-103 para UGL (L-103-DN100-INOX-ZLD) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-103-DN100-INOX-ZLD')}
              >
                <path 
                  d={`M ${fteX + 155} 345 L ${fteX + 155} 415 L ${uglX + 160} 415`} 
                  stroke="url(#fluxoZldRejeitoGrad)" 
                  strokeWidth="5.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowRejeitoSalino)"
                  className="group-hover:stroke-rose-400 transition-colors"
                />
                <path 
                  d={`M ${fteX + 155} 345 L ${fteX + 155} 415 L ${uglX + 160} 415`} 
                  stroke="#fca5a5" 
                  strokeWidth="2" 
                  strokeDasharray="5 10" 
                  fill="none" 
                  className="animate-[dash_2s_linear_infinite] pointer-events-none opacity-80"
                />
                <rect x={fteX + 165} y="360" width="112" height="15" rx="3" fill="#090d16" stroke="#ef4444" strokeWidth="0.8" />
                <text x={fteX + 221} y="371" fill="#fca5a5" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-103 (850 L/h Rejeito CDI)
                </text>
              </g>

              {/* Linha de Purga e Dreno de Lodo Químico do Skid CONTHEC para UGL (L-LODO-CONTHEC-DN50) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-LODO-CONTHEC-DN50')}
              >
                <path 
                  d={`M ${skidX + 120} 300 L ${skidX + 120} 380 L ${uglX + 70} 380 L ${uglX + 70} 415`} 
                  stroke="#b45309" 
                  strokeWidth="4.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowLodo)"
                  className="group-hover:stroke-amber-400 transition-colors"
                />
                <path 
                  d={`M ${skidX + 120} 300 L ${skidX + 120} 380 L ${uglX + 70} 380 L ${uglX + 70} 415`} 
                  stroke="#fde68a" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 8" 
                  fill="none" 
                  className="animate-[dash_2.5s_linear_infinite] pointer-events-none opacity-80"
                />
                <rect x={skidX + 130} y="335" width="115" height="15" rx="3" fill="#090d16" stroke="#b45309" strokeWidth="0.8" />
                <text x={skidX + 187} y="346" fill="#fde68a" fontSize="6.8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-LODO (150 L/h CONTHEC)
                </text>
              </g>

              {/* ============================================================== */}
              {/* SOLUÇÃO 1B: CIRCUITO FECHADO ZLD — TANQUE T-102 (SEM RETORNO AO POÇO) */}
              {/* ============================================================== */}

              {/* Linha de Clarificado ZLD da Prensa UGL para Tanque T-102 (L-ZLD-CLARIF-T102-DN80) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-ZLD-CLARIF-T102-DN80')}
              >
                <path 
                  d={`M ${uglX} 475 L ${t102X + 185} 475`} 
                  stroke="url(#fluxoZldRecuperadoGrad)" 
                  strokeWidth="5" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowReusoZld)"
                  className="group-hover:stroke-cyan-300 transition-colors"
                />
                <path 
                  d={`M ${uglX} 475 L ${t102X + 185} 475`} 
                  stroke="#67e8f9" 
                  strokeWidth="2" 
                  strokeDasharray="6 12" 
                  fill="none" 
                  className="animate-[dash_1.8s_linear_infinite] pointer-events-none opacity-85"
                />
                <rect x={(uglX + t102X + 185) / 2 - 58} y="458" width="116" height="15" rx="3" fill="#090d16" stroke="#06b6d4" strokeWidth="0.8" />
                <text x={(uglX + t102X + 185) / 2} y="469" fill="#a5f3fc" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-ZLD-CLARIF (780 L/h ➔ T-102)
                </text>
              </g>

              {/* Linha de Reuso: Lavagem Contínua da Prensa Parafuso UGL (L-REUSO-LAVAGEM-DN40) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-REUSO-LAVAGEM-DN40')}
              >
                <path 
                  d={`M ${t102X + 185} 540 L ${uglX} 540`} 
                  stroke="#0284c7" 
                  strokeWidth="4.5" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowReusoZld)"
                  className="group-hover:stroke-sky-300 transition-colors"
                />
                <path 
                  d={`M ${t102X + 185} 540 L ${uglX} 540`} 
                  stroke="#bae6fd" 
                  strokeWidth="1.8" 
                  strokeDasharray="5 10" 
                  fill="none" 
                  className="animate-[dash_1.5s_linear_infinite] pointer-events-none opacity-85"
                />
                <rect x={(uglX + t102X + 185) / 2 - 62} y="525" width="124" height="15" rx="3" fill="#090d16" stroke="#0ea5e9" strokeWidth="0.8" />
                <text x={(uglX + t102X + 185) / 2} y="536" fill="#bae6fd" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-LAVAGEM (400 L/h Tela UGL)
                </text>
              </g>

              {/* Linha de Reuso: Diluição Reagentes Skid CONTHEC (L-REUSO-DILUICAO-DN40) */}
              <g 
                className="cursor-pointer group"
                onClick={() => abrirTubulacaoModal('L-REUSO-DILUICAO-DN40')}
              >
                <path 
                  d={`M ${t102X + 90} 415 L ${t102X + 90} 340 L ${skidX + 85} 340 L ${skidX + 85} 300`} 
                  stroke="#0ea5e9" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeLinecap="round" 
                  markerEnd="url(#arrowAguaOxidada)"
                  className="group-hover:stroke-sky-300 transition-colors"
                />
                <path 
                  d={`M ${t102X + 90} 415 L ${t102X + 90} 340 L ${skidX + 85} 340 L ${skidX + 85} 300`} 
                  stroke="#7dd3fc" 
                  strokeWidth="1.8" 
                  strokeDasharray="5 10" 
                  fill="none" 
                  className="animate-[dash_1.6s_linear_infinite] pointer-events-none opacity-80"
                />
                <rect x={t102X + 5} y="365" width="125" height="15" rx="3" fill="#090d16" stroke="#0ea5e9" strokeWidth="0.8" />
                <text x={t102X + 67} y="376" fill="#bae6fd" fontSize="6.8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  L-DILUIÇÃO (380 L/h CONTHEC)
                </text>
              </g>

              {/* ============================================================== */}
              {/* 3. MANIFOLD DE SUCÇÃO DUPLA: POÇO T-100 + POÇO T-101 & BOMBA P-101 REPOSICIONADA */}
              {/* ============================================================== */}

              {/* POÇO T-100 (Manancial Principal 180 m³/h) */}
              <g 
                transform="translate(15, 30)" 
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setModalPocoAberto(true)}
              >
                <rect x="0" y="0" width="85" height="155" rx="8" fill="url(#pocoProfundoGrad)" stroke="#d97706" strokeWidth="2" className="group-hover:stroke-amber-400 filter drop-shadow-[0_0_10px_rgba(217,119,6,0.3)]" />
                <rect x="0" y="0" width="85" height="20" rx="6" fill="#78350f" fillOpacity="0.6" />
                <text x="42.5" y="14" fill="#fef3c7" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  POÇO T-100 ⚙️
                </text>

                <rect x="4" y="24" width="77" height="13" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.6" />
                <text x="42.5" y="33" fill="#a7f3d0" fontSize="6" fontWeight="bold" textAnchor="middle">
                  ✓ MANANCIAL PURO
                </text>

                <rect x="4" y="42" width="77" height="105" rx="4" fill="#0284c7" fillOpacity="0.25" />
                <line x1="4" y1="52" x2="81" y2="52" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="42.5" y="50" fill="#38bdf8" fontSize="7" fontWeight="bold" textAnchor="middle">
                  ND: {poco?.nivelDinamicoM || 62.0}m
                </text>

                <g transform="translate(15, 60)">
                  <rect x="0" y="0" width="55" height="42" rx="4" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                  <circle cx="27.5" cy="16" r="10" fill="#0369a1" stroke="#38bdf8" strokeWidth="1" />
                  <text x="27.5" y="32" fill="#e0f2fe" fontSize="7" fontWeight="bold" textAnchor="middle">B-100 (75CV)</text>
                  <text x="27.5" y="39" fill="#34d399" fontSize="6.5" fontWeight="bold" textAnchor="middle">{poco?.bombaSubmersa?.frequenciaHz || 52.4} Hz</text>
                </g>

                <g transform="translate(5, 110)">
                  <rect x="0" y="0" width="75" height="22" rx="3" fill="#1e1b4b" stroke="#6366f1" strokeWidth="0.8" />
                  <text x="37.5" y="9" fill="#c7d2fe" fontSize="6.5" fontWeight="bold" textAnchor="middle">FIT-100: 180m³/h</text>
                  <text x="37.5" y="18" fill="#38bdf8" fontSize="6" textAnchor="middle">F⁻ Nat: 8.50mg/L</text>
                </g>
              </g>

              {/* POÇO T-101 (Manancial Auxiliar Secundário 120 m³/h) */}
              <g 
                transform="translate(15, 200)" 
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setModalAdicionarPocoAberto(true)}
              >
                <rect x="0" y="0" width="85" height="115" rx="8" fill="url(#pocoProfundoGrad)" stroke="#38bdf8" strokeWidth="1.5" className="group-hover:stroke-sky-300" />
                <rect x="0" y="0" width="85" height="20" rx="6" fill="#0369a1" fillOpacity="0.6" />
                <text x="42.5" y="14" fill="#e0f2fe" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                  POÇO T-101 ⚙️
                </text>

                <rect x="4" y="24" width="77" height="85" rx="4" fill="#0284c7" fillOpacity="0.2" />
                <text x="42.5" y="36" fill="#38bdf8" fontSize="7" fontWeight="bold" textAnchor="middle">
                  ND: 58.5m | FIT-101
                </text>

                <g transform="translate(15, 42)">
                  <rect x="0" y="0" width="55" height="38" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                  <text x="27.5" y="15" fill="#e0f2fe" fontSize="7" fontWeight="bold" textAnchor="middle">B-101 (50CV)</text>
                  <text x="27.5" y="28" fill="#34d399" fontSize="6.5" fontWeight="bold" textAnchor="middle">120 m³/h</text>
                </g>

                <text x="42.5" y="98" fill="#94a3b8" fontSize="6" textAnchor="middle">
                  F⁻ Nat: 6.20 mg/L
                </text>
              </g>

              {/* Linhas de Sucção do Manifold de Entrada */}
              <path d="M 100 105 L 130 105" stroke="#fbbf24" strokeWidth="3.5" fill="none" />
              <path d="M 100 250 L 130 250 L 130 105" stroke="#38bdf8" strokeWidth="3.5" fill="none" />

              {/* Válvulas de Isolamento do Manifold de Sucção Dupla */}
              <ScadaValveNode
                valvula={valvulas?.['XV-100']}
                tagDefault="XV-100A"
                x={125}
                y={105}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              <ScadaValveNode
                valvula={valvulas?.['XV-100B'] || { tag: 'XV-100B', nome: 'Válvula Sucção Poço 2', estado: 'ABERTA', posicaoPct: 100, interlockOk: true, modoControlador: 'AUTOMATICO' }}
                tagDefault="XV-100B"
                x={125}
                y={245}
                onClick={abrirValvulaModal}
                labelPosition="ABAIXO"
              />

              {/* BOMBA P-101 REPOSICIONADA NA SAÍDA DO POÇO (ADUTORA DE ENTRADA) */}
              <g 
                transform="translate(175, 70)"
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setModalBombaP101Aberto(true)}
              >
                <rect x="0" y="0" width="70" height="75" rx="8" fill="#0b1322" stroke="#0ea5e9" strokeWidth="2" className="group-hover:stroke-sky-300 filter drop-shadow-[0_0_10px_rgba(14,165,233,0.4)]" />
                <circle cx="35" cy="28" r="16" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 27 28 L 43 28 M 35 20 L 35 36" stroke="#ffffff" strokeWidth="2" className="animate-spin origin-[35px_28px]" />
                <text x="35" y="52" fill="#e0f2fe" fontSize="8" fontWeight="bold" textAnchor="middle">
                  BOMBA P-101
                </text>
                <text x="35" y="62" fill="#34d399" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  {bombaP101State.vazaoM3h} m³/h
                </text>
                <text x="35" y="70" fill="#38bdf8" fontSize="6.5" textAnchor="middle">
                  {bombaP101State.frequenciaHz} Hz | {bombaP101State.pressaoRecalqueBar}b
                </text>
              </g>

              {/* ============================================================== */}
              {/* 4. SKID QUÁDRUPLO CONTHEC (3 POSIÇÕES DINÂMICAS: INÍCIO, MEIO, FINAL) */}
              {/* ============================================================== */}
              <g 
                transform={`translate(${skidX}, 50)`}
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setModalConthecAberto(true)}
              >
                <rect 
                  x="0" 
                  y="0" 
                  width="240" 
                  height="250" 
                  rx="12" 
                  fill={pwState.topologiaAtiva === 'TOPOLOGIA_D_FTE_DIRETO_BYPASS' ? '#0f172a' : '#0b1120'} 
                  stroke={pwState.topologiaAtiva === 'TOPOLOGIA_D_FTE_DIRETO_BYPASS' ? '#475569' : '#6366f1'} 
                  strokeWidth="2.5" 
                  strokeDasharray={pwState.topologiaAtiva === 'TOPOLOGIA_D_FTE_DIRETO_BYPASS' ? '6 6' : 'none'}
                  className="filter drop-shadow-[0_0_15px_rgba(99,102,241,0.25)] group-hover:stroke-indigo-400"
                />
                <rect x="0" y="0" width="240" height="28" rx="10" fill="#4338ca" fillOpacity="0.4" />
                <text x="120" y="19" fill="#e0e7ff" fontSize="10.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                  SKID CONTHEC (MÓVEL {posConthec === 'POS_1_INICIO' ? 'INÍCIO' : posConthec === 'POS_2_MEIO' ? 'MEIO' : 'FINAL'}) ⚙️
                </text>

                {/* Os 3 Frascos CONTHEC */}
                {/* Frasco A */}
                <g transform="translate(12, 38)">
                  <rect x="0" y="0" width="66" height="62" rx="4" fill="#1c1917" stroke="#f43f5e" strokeWidth="1.5" />
                  <rect x="2" y={62 - (62 * skid.componenteA.volumeAtualML) / 500} width="62" height={(62 * skid.componenteA.volumeAtualML) / 500} rx="2" fill="#e11d48" fillOpacity="0.35" />
                  <text x="33" y="14" fill="#fecdd3" fontSize="8" fontWeight="bold" textAnchor="middle">CONTHEC A</text>
                  <text x="33" y="29" fill="#fda4af" fontSize="10" fontWeight="bold" textAnchor="middle">{skid.componenteA.volumeAtualML}ml</text>
                  <text x="33" y="42" fill="#94a3b8" fontSize="7" textAnchor="middle">500ml Base</text>
                  <text x="33" y="54" fill="#fb7185" fontSize="7" fontWeight="bold" textAnchor="middle">{skid.componenteA.vazaoDosagemMLh}ml/h</text>
                </g>

                {/* Frasco B */}
                <g transform="translate(87, 38)">
                  <rect x="0" y="0" width="66" height="62" rx="4" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
                  <rect x="2" y={62 - (62 * skid.componenteB.volumeAtualML) / 220} width="62" height={(62 * skid.componenteB.volumeAtualML) / 220} rx="2" fill="#0284c7" fillOpacity="0.35" />
                  <text x="33" y="14" fill="#bae6fd" fontSize="8" fontWeight="bold" textAnchor="middle">CONTHEC B</text>
                  <text x="33" y="29" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">{skid.componenteB.volumeAtualML}ml</text>
                  <text x="33" y="42" fill="#94a3b8" fontSize="7" textAnchor="middle">220ml Silício</text>
                  <text x="33" y="54" fill="#7dd3fc" fontSize="7" fontWeight="bold" textAnchor="middle">{skid.componenteB.vazaoDosagemMLh}ml/h</text>
                </g>

                {/* Frasco C */}
                <g transform="translate(162, 38)">
                  <rect x="0" y="0" width="66" height="62" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                  <rect x="2" y={62 - (62 * skid.componenteC.volumeAtualML) / 220} width="62" height={(62 * skid.componenteC.volumeAtualML) / 220} rx="2" fill="#6366f1" fillOpacity="0.35" />
                  <text x="33" y="14" fill="#c7d2fe" fontSize="8" fontWeight="bold" textAnchor="middle">CONTHEC C</text>
                  <text x="33" y="29" fill="#818cf8" fontSize="10" fontWeight="bold" textAnchor="middle">{skid.componenteC.volumeAtualML}ml</text>
                  <text x="33" y="42" fill="#94a3b8" fontSize="7" textAnchor="middle">220ml Cat.</text>
                  <text x="33" y="54" fill="#a5b4fc" fontSize="7" fontWeight="bold" textAnchor="middle">{skid.componenteC.vazaoDosagemMLh}ml/h</text>
                </g>

                {/* Câmara de Pré-Mistura In-Situ */}
                <g transform="translate(12, 108)">
                  <rect x="0" y="0" width="216" height="42" rx="6" fill="#131d36" stroke="#4f46e5" strokeWidth="1.5" />
                  <text x="108" y="14" fill="#c7d2fe" fontSize="8" fontWeight="bold" textAnchor="middle">
                    CÂMARA DE PRÉ-MISTURA IN-SITU (BLENDING A + B + C)
                  </text>
                  <text x="108" y="26" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {skid.camaraMistura.statusReacao === 'PRONTO_PARA_INJECAO' ? '✓ Complexo Ativado' : 'Homogeneizando...'} ({skid.camaraMistura.tempoRestanteS}s)
                  </text>
                  <text x="108" y="37" fill="#94a3b8" fontSize="7" textAnchor="middle">
                    Proporção Estequiométrica 500:220:220 Conforme
                  </text>
                </g>

                {/* 4º Injetor / Diluição com Reuso de T-102 */}
                <g transform="translate(12, 158)">
                  <rect x="0" y="0" width="216" height="40" rx="6" fill="#042f2e" stroke="#14b8a6" strokeWidth="1.5" />
                  <text x="108" y="14" fill="#99f6e4" fontSize="8" fontWeight="bold" textAnchor="middle">
                    4º INJETOR: DILUIÇÃO EM ÁGUA T-102 & APLICAÇÃO DN200
                  </text>
                  <text x="108" y="30" fill="#2dd4bf" fontSize="9" fontWeight="bold" textAnchor="middle">
                    Reuso: {skid.injetorDiluicao4.vazaoAguaDiluicaoLh} L/h | {skid.injetorDiluicao4.concentracaoFinalPpm} ppm ({skid.injetorDiluicao4.pressaoInjecaoBar} bar)
                  </text>
                </g>

                {/* Botão de Ação */}
                <rect x="12" y="206" width="216" height="26" rx="5" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                <text x="108" y="223" fill="#a5b4fc" fontSize="9" fontWeight="bold" textAnchor="middle">
                  ⚙️ Configurar Skid CONTHEC (A+B+C)
                </text>
              </g>

              {/* Válvulas do Skid CONTHEC */}
              <ScadaValveNode
                valvula={valvulas?.['XV-101']}
                tagDefault="XV-101"
                x={skidX - 42}
                y={165}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              <ScadaValveNode
                valvula={valvulas?.['XV-201']}
                tagDefault="XV-201"
                x={skidX + 282}
                y={165}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              <ScadaValveNode
                valvula={valvulas?.['XV-202']}
                tagDefault="XV-202"
                x={skidX + 120}
                y={18}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              {/* ============================================================== */}
              {/* 5. REATOR MODULAR FTE-CDI (16 CÉLULAS — 3 POSIÇÕES DINÂMICAS)  */}
              {/* ============================================================== */}
              <g transform={`translate(${fteX}, 45)`}>
                <rect 
                  x="0" 
                  y="0" 
                  width="310" 
                  height="270" 
                  rx="12" 
                  fill="#0c1322" 
                  stroke="#0284c7" 
                  strokeWidth="2.5" 
                  className="filter drop-shadow-[0_0_15px_rgba(2,132,199,0.3)]"
                />
                <rect x="0" y="0" width="310" height="28" rx="10" fill="#0369a1" fillOpacity="0.4" />
                <text x="155" y="19" fill="#e0f2fe" fontSize="10.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
                  REATOR FTE-CDI (16 CÉLULAS — {posFte === 'POS_1_INICIO' ? 'INÍCIO' : posFte === 'POS_2_MEIO' ? 'MEIO' : 'FINAL'}) ⚙️
                </text>
                
                {/* Rodapé Técnico FTE-CDI Seguro no Topo */}
                <text x="155" y="42" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
                  1.40 V DC | Interlock 2.80 bar | PEAD DN200 PN10
                </text>

                {/* Grid Visual de 16 Células */}
                <g transform="translate(18, 50)">
                  {celulas.slice(0, 16).map((c, i) => {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const isOk = c.status === 'ADSORCAO';
                    return (
                      <g 
                        key={c.id} 
                        transform={`translate(${col * 69}, ${row * 36})`}
                        className="cursor-pointer hover:opacity-80 transition-all"
                        onClick={() => onOpenCellDetail(c)}
                      >
                        <rect 
                          x="0" 
                          y="0" 
                          width="63" 
                          height="28" 
                          rx="4" 
                          fill={c.interlockDisparado ? "#7f1d1d" : isOk ? "#064e3b" : "#1e293b"} 
                          stroke={c.interlockDisparado ? "#ef4444" : isOk ? "#10b981" : "#0284c7"} 
                          strokeWidth="1.5"
                        />
                        <text x="31.5" y="12" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                          {c.codigo}
                        </text>
                        <text x="31.5" y="22" fill={isOk ? "#6ee7b7" : "#fca5a5"} fontSize="7" textAnchor="middle">
                          {c.pressaoBar.toFixed(1)}b | {(c.fluoretoOutPPM ?? 0).toFixed(1)}F
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Dessorção Indicador na Base */}
                <text x="155" y="210" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
                  Dessorção Rejeito Salino ➔ Bocal N3 (XV-103)
                </text>
              </g>

              {/* Válvula de Entrada do FTE-CDI XV-301 (Posicionamento Dinâmico sem Colisão com Bomba P-101) */}
              <ScadaValveNode
                valvula={valvulas?.['XV-301']}
                tagDefault="XV-301"
                x={fteX === 260 ? 320 : fteX - 42}
                y={fteX === 260 ? 25 : 165}
                onClick={abrirValvulaModal}
                labelPosition={fteX === 260 ? "ACIMA" : "ACIMA"}
              />

              {/* Válvula de Retrolavagem e Dessorção XV-103 para UGL (Isolada da Linha Alaranjada de Rejeito) */}
              <ScadaValveNode
                valvula={valvulas?.['XV-103']}
                tagDefault="XV-103"
                tipoVisual="ESFERA"
                x={fteX + 155}
                y={320}
                rotacaoDeg={90}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              {/* ============================================================== */}
              {/* 6. BOMBA BIOSSÔNICA INDUSTRIAL BBS-100 (4 SLOTS PARAMÉTRICOS)  */}
              {/* ============================================================== */}

              {/* Bomba Biossônica Industrial BBS-100 (4 Slots Paramétricos) */}
              <g 
                transform={`translate(${bioPosX}, ${bioPosY})`}
                className="cursor-pointer hover:opacity-90 transition-all filter drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                onClick={() => setModalBiossonicaAberto(true)}
              >
                <rect 
                  x="-25" 
                  y="-25" 
                  width="50" 
                  height="50" 
                  rx="10" 
                  fill="#1e1b4b" 
                  stroke="#a855f7" 
                  strokeWidth="2.5" 
                />
                
                {bio.ativa && (
                  <>
                    <circle cx="0" cy="0" r="18" fill="none" stroke="#ec4899" strokeWidth="1" strokeDasharray="3 3" className="animate-ping" opacity="0.6" />
                    <circle cx="0" cy="0" r="14" fill="none" stroke="#c084fc" strokeWidth="1.5" className="animate-pulse" />
                  </>
                )}

                <circle cx="0" cy="0" r="12" fill="#581c87" stroke="#e879f9" strokeWidth="1.5" />
                <path 
                  d="M -7 0 L 7 0 M 0 -7 L 0 7 M -5 -5 L 5 5 M -5 5 L 5 -5" 
                  stroke="#fdf4ff" 
                  strokeWidth="1.8" 
                  strokeLinecap="round" 
                />

                <rect x="-35" y="-40" width="70" height="13" rx="3" fill="#090d16" stroke="#c084fc" strokeWidth="1" />
                <text x="0" y="-31" fill="#f5d0fe" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  BBS-100 (BIO)
                </text>

                <rect x="-40" y="27" width="80" height="20" rx="4" fill="#090d16" stroke="#a855f7" strokeWidth="1" />
                <text x="0" y="36" fill="#fdf4ff" fontSize="7" fontWeight="bold" textAnchor="middle">
                  {bio.rotacaoRpm} RPM | {bio.frequenciaUltrassonicaKhz}kHz
                </text>
                <text x="0" y="44" fill="#4ade80" fontSize="6.5" fontWeight="bold" textAnchor="middle">
                  ΔP {bio.deltaPBar}b | Lise {bio.eficienciaLiseCelularPct}%
                </text>
              </g>

              {/* Válvula de Saída Potável Final XV-401 */}
              <ScadaValveNode
                valvula={valvulas?.['XV-401']}
                tagDefault="XV-401"
                x={1610}
                y={165}
                onClick={abrirValvulaModal}
                labelPosition="ACIMA"
              />

              {/* ============================================================== */}
              {/* 7. TANQUE DE ÁGUA DE REUSO T-102 (5 m³ — SOLUÇÃO 1B ZLD ISOLADO) */}
              {/* ============================================================== */}
              <g 
                transform={`translate(${t102X}, 415)`}
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => abrirTubulacaoModal('L-ZLD-CLARIF-T102-DN80')}
              >
                <rect 
                  x="0" 
                  y="0" 
                  width="215" 
                  height="175" 
                  rx="10" 
                  fill="url(#tanqueT102Grad)" 
                  stroke="#06b6d4" 
                  strokeWidth="2.5" 
                  className="group-hover:stroke-cyan-300 transition-all filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                />
                
                {/* Header Tanque T-102 */}
                <rect x="0" y="0" width="215" height="28" rx="8" fill="#0e7490" fillOpacity="0.4" />
                <text x="107.5" y="18" fill="#cffafe" fontSize="10" fontWeight="bold" textAnchor="middle">
                  TANQUE DE REUSO T-102 (5 m³) 🛡️
                </text>

                {/* Badge Sanitário: 100% Circuito Fechado */}
                <rect x="10" y="32" width="195" height="15" rx="3" fill="#042f2e" stroke="#14b8a6" strokeWidth="0.8" />
                <text x="107.5" y="43" fill="#5eead4" fontSize="6.8" fontWeight="bold" textAnchor="middle">
                  CIRCUITO FECHADO ZLD ISOLADO DO POÇO
                </text>

                {/* Indicador de Nível Líquido com Animação */}
                <g transform="translate(12, 52)">
                  <rect x="0" y="0" width="36" height="85" rx="4" fill="#082f49" stroke="#0ea5e9" strokeWidth="1" />
                  {/* Líquido proporcional a nivelPct (74.4%) */}
                  <rect 
                    x="2" 
                    y={85 - (85 * (t102?.nivelPct || 74.4)) / 100} 
                    width="32" 
                    height={(85 * (t102?.nivelPct || 74.4)) / 100} 
                    rx="2" 
                    fill="#06b6d4" 
                    fillOpacity="0.5" 
                    className="animate-pulse"
                  />
                  <line x1="0" y1="22" x2="36" y2="22" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 2" />
                  <text x="18" y="48" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                    {t102?.nivelPct || 74.4}%
                  </text>
                </g>

                {/* Telemetria de Volume e Qualidade Expandida */}
                <g transform="translate(54, 52)">
                  <rect x="0" y="0" width="150" height="85" rx="4" fill="#090d16" stroke="#0891b2" strokeWidth="0.8" />
                  
                  <text x="8" y="15" fill="#94a3b8" fontSize="7.5">Volume Atual:</text>
                  <text x="142" y="15" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="end">
                    {t102?.volumeAtualM3 || 3.72} m³ / 5.0m³
                  </text>

                  <text x="8" y="32" fill="#94a3b8" fontSize="7.5">Entrada UGL:</text>
                  <text x="142" y="32" fill="#34d399" fontSize="8.5" fontWeight="bold" textAnchor="end">
                    +{t102?.vazaoEntradaFiltradoLh || 780} L/h
                  </text>

                  <text x="8" y="48" fill="#94a3b8" fontSize="7.5">Lavagem Tela:</text>
                  <text x="142" y="48" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="end">
                    -{t102?.vazaoSaidaLavagemTelaLh || 400} L/h
                  </text>

                  <text x="8" y="64" fill="#94a3b8" fontSize="7.5">Diluição CONTHEC:</text>
                  <text x="142" y="64" fill="#818cf8" fontSize="8" fontWeight="bold" textAnchor="end">
                    -{t102?.vazaoSaidaDiluicaoReagentesLh || 380} L/h
                  </text>

                  <text x="8" y="78" fill="#94a3b8" fontSize="6.8">Condutividade:</text>
                  <text x="107" y="78" fill="#a5f3fc" fontSize="7.5" fontWeight="bold" textAnchor="end">
                    {t102?.qualidadeCondutividadeUsCm || 320} µS/cm | pH 7.2
                  </text>
                </g>

                {/* Rodapé de Balanço ZLD */}
                <rect x="10" y="145" width="165" height="20" rx="3" fill="#164e63" stroke="#0891b2" strokeWidth="0.8" />
                <text x="92.5" y="158" fill="#e0f2fe" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                  Balanço Fechado: 780 = 400 + 380 L/h (ZLD 100%)
                </text>
              </g>

              {/* ============================================================== */}
              {/* 8. MÓDULO UGL (CO-TRATAMENTO: RETROLAVAGEM CDI + LODO CONTHEC)  */}
              {/* ============================================================== */}
              <g 
                transform={`translate(${uglX}, 415)`}
                className="cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setModalUglZldAberto(true)}
              >
                <rect 
                  x="0" 
                  y="0" 
                  width="310" 
                  height="175" 
                  rx="10" 
                  fill="#1e1308" 
                  stroke="#b45309" 
                  strokeWidth="2.5" 
                  className="group-hover:stroke-amber-400 transition-all filter drop-shadow-[0_0_12px_rgba(180,83,9,0.3)]"
                />
                
                {/* Header Módulo UGL */}
                <rect x="0" y="0" width="310" height="28" rx="8" fill="#78350f" fillOpacity="0.5" />
                <text x="155" y="18" fill="#fde68a" fontSize="10.5" fontWeight="bold" textAnchor="middle">
                  MÓDULO UGL & CIRCUITO ZLD (CO-TRATAMENTO) ⚙️
                </text>

                {/* Subcabeçalho de Processo */}
                <rect x="12" y="32" width="286" height="16" rx="3" fill="#291b0c" stroke="#d97706" strokeWidth="0.8" />
                <text x="155" y="43" fill="#fde68a" fontSize="7" fontWeight="bold" textAnchor="middle">
                  Recebimento: Rejeito CDI (850 L/h) + Purga CONTHEC (150 L/h) ➔ CaSiF₆↓
                </text>

                {/* Painel Duplo: Desaguamento e Umidade */}
                <g transform="translate(12, 54)">
                  <rect x="0" y="0" width="138" height="42" rx="4" fill="#181109" stroke="#78350f" />
                  <text x="69" y="14" fill="#d97706" fontSize="7.5" textAnchor="middle">Desaguamento Lodo</text>
                  <text x="69" y="32" fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">
                    {pwState.ugl.taxaDesaguamentoPct}%
                  </text>
                </g>

                <g transform="translate(160, 54)">
                  <rect x="0" y="0" width="138" height="42" rx="4" fill="#181109" stroke="#78350f" />
                  <text x="69" y="14" fill="#d97706" fontSize="7.5" textAnchor="middle">Umidade Torta Seca</text>
                  <text x="69" y="32" fill="#34d399" fontSize="12" fontWeight="bold" textAnchor="middle">
                    {pwState.ugl.umidadeTortaPct}%
                  </text>
                </g>

                {/* Bloco de Destinação Sanitária ZLD */}
                <rect x="12" y="102" width="286" height="38" rx="4" fill="#0f172a" stroke="#059669" />
                <text x="155" y="116" fill="#6ee7b7" fontSize="8" fontWeight="bold" textAnchor="middle">
                  Clarificado: {pwState.ugl.vazaoFiltradoRecuperadoLh} L/h ➔ Destinado ao Tanque T-102 (91.8% ZLD)
                </text>
                <text x="155" y="130" fill="#94a3b8" fontSize="7" textAnchor="middle">
                  Precipitação CaSiF₆: {pwState.ugl.massaFluorossilicatoPrecipitadaKgH} kg/h | Biossólido Agrícola Conforme
                </text>

                {/* Botão de Ação */}
                <rect x="12" y="145" width="286" height="20" rx="4" fill="#2e1065" stroke="#a855f7" strokeWidth="1" />
                <text x="155" y="158" fill="#e9d5ff" fontSize="8" fontWeight="bold" textAnchor="middle">
                  ⚙️ Clique para Configurar Prensa Parafuso & Precipitação UGL
                </text>
              </g>

              {/* ============================================================== */}
              {/* 9. TANQUE DE DISTRIBUIÇÃO DE ÁGUA POTÁVEL FINAL T-201          */}
              {/* ============================================================== */}
              <g transform="translate(1680, 85)">
                <rect x="0" y="0" width="95" height="160" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2.5" />
                <rect x="4" y="15" width="87" height="140" rx="5" fill="#10b981" fillOpacity="0.25" />
                <text x="47.5" y="65" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">POTÁVEL</text>
                <text x="47.5" y="88" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">T-201</text>
                <text x="47.5" y="112" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">F⁻: 1.08 ppm</text>
                <text x="47.5" y="130" fill="#6ee7b7" fontSize="7.5" textAnchor="middle">Portaria 888 OK</text>
                <circle cx="47.5" cy="20" r="4" fill="#34d399" className="animate-ping" />
              </g>
            </svg>
          </div>
        </div>
        )}

      {/* 3. Rodapé com Resumo de Sinergia e Acesso Rápido às Matrizes Normativas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Painel 1: Skid Quádruplo CONTHEC */}
        <div 
          onClick={() => setModalConthecAberto(true)}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 cursor-pointer hover:border-indigo-500/60 hover:bg-slate-900/90 transition-all shadow-lg group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
              <Beaker className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Skid Quádruplo CONTHEC</h4>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-mono">3 POSIÇÕES SCADA</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dosagem estequiométrica (500ml A, 220ml B, 220ml C) com câmara in-situ, 4º injetor com reuso do Tanque T-102 e dreno para UGL.
              </p>
            </div>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-indigo-600/20 group-hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-all">
            <Sliders className="w-3.5 h-3.5" /> Abrir Configuração do Skid CONTHEC ➔
          </button>
        </div>

        {/* Painel 2: Bomba Biossônica BBS-100 */}
        <div 
          onClick={() => setModalBiossonicaAberto(true)}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 cursor-pointer hover:border-purple-500/60 hover:bg-slate-900/90 transition-all shadow-lg group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Bomba Biossônica BBS-100</h4>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded font-mono">CAVITAÇÃO 28.5 kHz</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Rotor de 2.850 RPM e transdutor piezoelétrico para lise celular (99,8%), cisalhamento de cadeias complexas e amplificação oxidativa.
              </p>
            </div>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-purple-600/20 group-hover:bg-purple-600/40 text-purple-300 text-xs font-bold border border-purple-500/30 flex items-center justify-center gap-1.5 transition-all">
            <Sliders className="w-3.5 h-3.5" /> Abrir Controle Cavitacional BBS-100 ➔
          </button>
        </div>

        {/* Painel 3: Circuito Fechado ZLD e Tanque T-102 */}
        <div 
          onClick={() => setModalUglZldAberto(true)}
          className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 cursor-pointer hover:border-cyan-500/60 hover:bg-slate-900/90 transition-all shadow-lg group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Tanque T-102 & Circuito Fechado</h4>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-mono">PORTARIA 888 CONFORME</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clarificado da UGL (780 L/h) armazenado no Tanque T-102 (5 m³): 400 L/h para tela da prensa e 380 L/h para o Skid CONTHEC. Zero contato com o Poço T-100.
              </p>
            </div>
          </div>
          <button className="w-full py-1.5 rounded-lg bg-cyan-600/20 group-hover:bg-cyan-600/40 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-all">
            <Sliders className="w-3.5 h-3.5" /> Abrir Supervisão UGL & Tanque T-102 ➔
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAIS DEDICADOS DO SISTEMA SCADA WEB INDUSTRIAL                      */}
      {/* ===================================================================== */}

      {/* Modal Dedicado da Válvula Motorizada Selecionada */}
      <ValveControlModal 
        valvula={valvulaSelecionada}
        isOpen={modalValvulaAberto}
        onClose={() => setModalValvulaAberto(false)}
        onComandarValvula={(tag, comando, modo) => purifyWaveService.comandarValvula(tag, comando, modo)}
      />

      {/* Modal Dedicado do Poço Tubular Profundo T-100 & Bomba B-100 */}
      <WellDetailModal
        poco={poco}
        isOpen={modalPocoAberto}
        onClose={() => setModalPocoAberto(false)}
        onAtualizarPoco={(dados) => purifyWaveService.atualizarPoco(dados)}
      />

      {/* Modal Dedicado de Telemetria e Calibração de Tubulações */}
      <PipelineConfigModal
        tubulacao={tubulacaoSelecionada}
        isOpen={modalTubulacaoAberta}
        onClose={() => setModalTubulacaoAberta(false)}
        onAtualizarSentido={handleAtualizarSentidoTubulacao}
      />

      {/* Modal Dedicado da Bomba Biossônica BBS-100 */}
      {modalBiossonicaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                SUPERVISÃO E CONTROLE CAVITACIONAL — BOMBA BIOSSÔNICA BBS-100
              </span>
              <button
                onClick={() => setModalBiossonicaAberto(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <BiosonicPumpPanel onClose={() => setModalBiossonicaAberto(false)} />
          </div>
        </div>
      )}

      {/* Modal Dedicado do 1-Click Pipeline Switcher */}
      {modalTopologiasAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Share2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    Seletor de Topologias Dinâmicas — 1-Click Pipeline Switcher
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuração de Rotas Hidráulicas, Válvulas Motorizadas, Balanço de Carga e Perdas de Carga
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalTopologiasAberto(false)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PipelineSwitcherPanel onClose={() => setModalTopologiasAberto(false)} />
          </div>
        </div>
      )}

      {/* Modal Dedicado do Skid Quádruplo CONTHEC */}
      <ConthecDetailModal 
        isOpen={modalConthecAberto} 
        onClose={() => setModalConthecAberto(false)} 
      />

      {/* Modal Dedicado do Módulo UGL & Circuito ZLD */}
      <UglZldDetailModal 
        isOpen={modalUglZldAberto} 
        onClose={() => setModalUglZldAberto(false)} 
      />

      {/* Modal 1: Configuração Paramétrica da Bomba P-101 (VFD / Inversor de Frequência) */}
      {modalBombaP101Aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white font-display text-base">
                  Supervisão & Inversor VFD — BOMBA P-101 (Adutora de Entrada)
                </h3>
              </div>
              <button
                onClick={() => setModalBombaP101Aberto(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-[#050914] p-3 rounded-xl border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Vazão Recalque:</span>
                  <span className="text-emerald-400 font-bold text-lg">{bombaP101State.vazaoM3h} m³/h</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Frequência Inversor:</span>
                  <span className="text-sky-300 font-bold text-lg">{bombaP101State.frequenciaHz} Hz</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Pressão Saída:</span>
                  <span className="text-purple-300 font-bold text-lg">{bombaP101State.pressaoRecalqueBar} bar</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1 flex items-center justify-between">
                  <span>Setpoint de Frequência do Inversor (Hz):</span>
                  <span className="text-sky-400 font-bold">{bombaP101State.frequenciaHz} Hz</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="60"
                  step="0.5"
                  value={bombaP101State.frequenciaHz}
                  onChange={(e) => {
                    const freq = parseFloat(e.target.value);
                    const vazaoCalc = Math.round((freq / 60) * 200);
                    setBombaP101State(prev => ({
                      ...prev,
                      frequenciaHz: freq,
                      vazaoM3h: vazaoCalc
                    }));
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="bg-[#080e1a] p-3 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                <span className="text-slate-300 font-bold block mb-1">Coletor de Sucção Dupla Ativo:</span>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                    <input
                      type="checkbox"
                      checked={bombaP101State.succaoPoco1}
                      onChange={(e) => setBombaP101State(p => ({ ...p, succaoPoco1: e.target.checked }))}
                      className="accent-amber-500 rounded"
                    />
                    <span>Sucção Poço T-100 (Principal 180 m³/h - XV-100A)</span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sky-300">
                    <input
                      type="checkbox"
                      checked={bombaP101State.succaoPoco2}
                      onChange={(e) => setBombaP101State(p => ({ ...p, succaoPoco2: e.target.checked }))}
                      className="accent-sky-500 rounded"
                    />
                    <span>Sucção Poço T-101 (Auxiliar 120 m³/h - XV-100B)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalBombaP101Aberto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-lg"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    alert('Setpoints do Inversor da Bomba P-101 salvos com sucesso no CLP!');
                    setModalBombaP101Aberto(false);
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Parâmetros CLP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Adicionar Novo Poço ao Grid de Trabalho */}
      {modalAdicionarPocoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white font-display text-base">
                  Adicionar Novo Poço Tubular ao Grid
                </h3>
              </div>
              <button
                onClick={() => setModalAdicionarPocoAberto(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Tag do Poço:</label>
                <input
                  type="text"
                  defaultValue={`POÇO T-10${pocosGrid.length}`}
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vazão Nominal (m³/h):</label>
                <input
                  type="number"
                  defaultValue="150"
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Endereço Modbus / IP CLP:</label>
                <input
                  type="text"
                  defaultValue="192.168.1.105:502 (Holding Reg 40020)"
                  className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalAdicionarPocoAberto(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setPocosGrid(prev => [
                      ...prev,
                      {
                        id: `POCO-10${prev.length}`,
                        tag: `POÇO T-10${prev.length}`,
                        desc: 'Novo Manancial Cadastrado',
                        vazao: 150,
                        nivel: 55.0,
                        fluoreto: 7.0,
                        ativo: true
                      }
                    ]);
                    alert('Novo poço adicionado com sucesso ao Grid e salvo no Supabase!');
                    setModalAdicionarPocoAberto(false);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Cadastrar no Grid</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Telemetria Edge Rádio/4G & SCADA Master (Siemens / Schneider) */}
      {modalEdgeTelemetriaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="font-bold text-white font-display text-base">
                  Telemetria Edge Rádio / 4G — PuriFyWave OS vs Siemens / Schneider
                </h3>
              </div>
              <button
                onClick={() => setModalEdgeTelemetriaAberto(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-slate-300">
              <div className="p-3 bg-[#050914] rounded-xl border border-purple-800/80 space-y-1.5">
                <span className="text-purple-300 font-bold block">✓ Status da Conexão Telemétrica:</span>
                <p className="text-emerald-400 font-semibold">● Link Rádio 900MHz / LoRaWAN: CONECTADO (RSSI -68 dBm)</p>
                <p className="text-sky-300">● Gateway CLP Siemens S7-1200 / Schneider Modicon M221: ONLINE (Modbus TCP)</p>
                <p className="text-amber-300">● Buffer Local Store-and-Forward: 0 Pacotes Pendentes (100% Sincronizado)</p>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Esta arquitetura híbrida combina o rigor determinístico de CLPs industriais Siemens/Schneider no campo com a facilidade e liberdade do IHM PuriFyWave OS Edge, eliminando custos de licença por tag e fornecendo sincronia em tempo real via rádio/internet para o servidor central.
              </p>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setModalEdgeTelemetriaAberto(false)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg"
                >
                  OK / Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Provisionamento Relacional & Gestão de Estações Remotas Multi-Site (ISA-95) */}
      <MultiStationProvisioningModal
        isOpen={modalProvisionamentoEstacoesAberto}
        onClose={() => setModalProvisionamentoEstacoesAberto(false)}
        onSelectEstacaoAtiva={(nome) => setEstacaoAtiva(nome)}
      />
    </div>
  );
};
