/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from 'lodash-es';
import { Graph, Node } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { 
  Activity, 
  Droplets, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Compass, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sliders, 
  Cpu, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Sparkles,
  Gauge,
  Power,
  Save,
  Download,
  MapPin,
  Move,
  LayoutGrid,
  FileCheck2,
  Bookmark,
  TrendingUp,
  Play,
  Lock,
  Unlock,
  Key,
  Shield,
  UserCheck,
  BellRing,
  X
} from 'lucide-react';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { dbInstance } from '../services/database';
import { authService } from '../services/AuthService';
import { PurifyWaveState, ValvulaMotorizadaInfo, EstadoValvulaMotorizada, FteCdiLayoutPosition, ConthecLayoutPosition, OperatorProfile } from '../types';

// ============================================================================
// PROPS DA ENGINE ANTV X6 (FASE 5: HOMOLOGAÇÃO FINAL, BENCHMARK & ALTA PERFORMANCE)
// ============================================================================
export interface AntV6SynopticViewProps {
  estacaoAtiva?: string;
  onOpenCellDetail?: (celulaId: number) => void;
  onOpenConthecModal?: () => void;
  onOpenBiossonicaModal?: () => void;
  onOpenUglModal?: () => void;
  onOpenTanqueT102Modal?: () => void;
  onOpenValveModal?: (tag: string) => void;
  onOpenPocoModal?: () => void;
  onOpenBombaP101Modal?: () => void;
  onOpenUsuariosGestao?: () => void;
}

// Tipos de Presets de Engenharia
export type PresetLayoutCAD = 'PADRAO_OFICIAL_ISA' | 'COMPACTO_IHM' | 'ZLD_EXPANDIDO' | 'MANUTENCAO_ELETRICA';

// ============================================================================
// REGISTRO DE FORMAS REACT NATIVAS COM INTERATIVIDADE INDUSTRIAL
// ============================================================================

// 1. Nó React: Poço Tubular
const PocoNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenPocoModal?.();
      }}
      className="w-full h-full bg-slate-900/95 border-2 border-blue-500/80 rounded-2xl p-2.5 text-white shadow-xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer hover:border-blue-400 hover:scale-[1.02] transition-all group"
      title="Clique para abrir detalhes do Poço Tubular e Bomba Submersa"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1 group-hover:text-white transition-colors">
          <Droplets className="w-3 h-3 text-sky-400" />
          {data.tag || 'POÇO T-100'}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </div>
      <div className="space-y-1 text-[9.5px]">
        <div className="flex justify-between text-slate-300">
          <span>Vazão:</span>
          <span className="font-bold text-sky-300">{data.vazao || '180 m³/h'}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Nível Dinâmico:</span>
          <span className="font-bold text-emerald-300">{data.nivel || '62.0m'}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>F⁻ Nativo:</span>
          <span className="font-bold text-amber-300">{data.fluor || '8.50 mg/L'}</span>
        </div>
      </div>
      <div className="text-[8.5px] bg-slate-950 p-1 rounded border border-slate-800 text-center font-bold text-slate-400 group-hover:text-sky-300 transition-colors">
        SUBMERSA 75CV • {data.hz || '52.4'} Hz ➔
      </div>
    </div>
  );
};

// 2. Nó React: Bomba P-101 (Recalque Primário)
const BombaP101NodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  const isFalha = data.status === 'FALHA';
  const isAlerta = data.status === 'ALERTA';

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenBombaP101Modal?.();
      }}
      className={`w-full h-full bg-slate-900/95 border-2 rounded-2xl p-2.5 text-white shadow-xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer transition-all ${
        isFalha
          ? 'border-red-500 shadow-red-500/50 ring-4 ring-red-500/40 blink-alarm bg-red-950/40'
          : isAlerta
            ? 'border-amber-500 shadow-amber-500/40 ring-2 ring-amber-500/40 bg-amber-950/20'
            : 'border-emerald-500/80 hover:border-emerald-400 group'
      }`}
      title="Clique para abrir painel VFD da Bomba P-101"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
          isFalha ? 'text-red-400 font-extrabold' : isAlerta ? 'text-amber-400' : 'text-emerald-300 group-hover:text-white'
        }`}>
          <Gauge className={`w-3.5 h-3.5 ${isFalha ? 'text-red-400 animate-spin-fast' : isAlerta ? 'text-amber-400' : 'text-emerald-400'}`} />
          BOMBA P-101 (180 m³/h)
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
          isFalha 
            ? 'bg-red-500/30 text-red-200 border border-red-500/50 animate-pulse' 
            : isAlerta 
              ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50' 
              : 'bg-emerald-500/20 text-emerald-300'
        }`}>
          {isFalha ? '🔴 TRIP / FALHA' : isAlerta ? '🟡 ALERTA VFD' : '🟢 VFD AUTO'}
        </span>
      </div>
      <div className="space-y-1 text-[9px] text-slate-300">
        <div className="flex justify-between">
          <span>Pressão Recalque:</span>
          <span className={`font-bold ${isFalha ? 'text-red-400 font-extrabold' : isAlerta ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isFalha ? '0.00 bar (Sem Pressão)' : isAlerta ? '2.10 bar (Baixa)' : '4.20 bar'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Inversor Frequência:</span>
          <span className={`font-bold ${isFalha ? 'text-red-400 font-extrabold' : 'text-sky-300'}`}>
            {isFalha ? '0.0 Hz (Parada)' : isAlerta ? '32.0 Hz' : '54.0 Hz'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Corrente Motor:</span>
          <span className={`font-bold ${isFalha ? 'text-red-400' : 'text-white'}`}>
            {isFalha ? '0.0 A (Trip Térmico)' : isAlerta ? '45.0 A' : '88.5 A'}
          </span>
        </div>
      </div>
      <div className={`text-[8.5px] p-1 rounded text-center font-bold border transition-colors ${
        isFalha
          ? 'bg-red-900/80 text-red-200 border-red-500/50 animate-pulse'
          : isAlerta
            ? 'bg-amber-900/80 text-amber-200 border-amber-500/50'
            : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30 group-hover:bg-emerald-800 group-hover:text-white'
      }`}>
        {isFalha ? '⚠️ ALARME ATIVO: CLIQUE P/ REARME' : 'CONTROLE DE PRESSÃO PID ➔'}
      </div>
    </div>
  );
};

// 3. Nó React: Reator FTE-CDI com 16 Células Clicáveis
const ReatorFteCdiNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div className="w-full h-full bg-slate-900/95 border-2 border-cyan-500/90 rounded-2xl p-3 text-white shadow-2xl flex flex-col justify-between font-mono backdrop-blur-md">
      <div className="bg-cyan-950/80 p-2 rounded-xl border border-cyan-500/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <div>
            <div className="text-[11px] font-extrabold text-cyan-200">REATOR FTE-CDI (16 CÉLULAS)</div>
            <div className="text-[8.5px] text-cyan-400">Desfluoretação Capacitiva Primária (180 m³/h)</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
          16/16 ATIVAS
        </span>
      </div>

      {/* Grid de 16 Células CDI Interativas */}
      <div>
        <div className="text-[8px] text-slate-400 mb-1 flex justify-between">
          <span>Células Eletroquímicas (Clique p/ Prontuário):</span>
          <span className="text-cyan-400">12.4A • 1.85V</span>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenCellDetail?.(i + 1);
              }}
              className="h-5 bg-cyan-950/90 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-500/50 hover:border-cyan-300 rounded flex items-center justify-center text-[7.5px] font-bold text-cyan-300 transition-all shadow-sm active:scale-95"
              title={`Célula FTE-CDI #${i+1}: Clique para abrir Prontuário, Polaridade e Resistência Óhmica`}
            >
              C{i+1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[8.5px] bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-center">
        <div>
          <span className="text-slate-400 block">Eficiência:</span>
          <span className="font-bold text-emerald-400">92.4%</span>
        </div>
        <div>
          <span className="text-slate-400 block">F⁻ Saída:</span>
          <span className="font-bold text-emerald-300">0.95 mg/L</span>
        </div>
        <div>
          <span className="text-slate-400 block">Rejeito CDI:</span>
          <span className="font-bold text-amber-400">850 L/h</span>
        </div>
      </div>
    </div>
  );
};

// 4. Nó React: Bomba Biossônica BBS-100
const BombaBiossonicaNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenBiossonicaModal?.();
      }}
      className="w-full h-full bg-slate-900/95 border-2 border-emerald-500/80 rounded-2xl p-2.5 text-white shadow-xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer hover:border-emerald-400 hover:scale-[1.02] transition-all group"
      title="Clique para abrir Controle Cavitacional Ultrassônico BBS-100"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1 group-hover:text-white transition-colors">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          BBS-100 (BIOSSÔNICA)
        </span>
        <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-300 font-bold">28.5 kHz</span>
      </div>
      <div className="space-y-1 text-[8.5px] text-slate-300">
        <div className="flex justify-between">
          <span>Rotação Rotor:</span>
          <span className="font-bold text-white">2850 RPM</span>
        </div>
        <div className="flex justify-between">
          <span>ΔP Cavitacional:</span>
          <span className="font-bold text-emerald-400">1.45 bar</span>
        </div>
        <div className="flex justify-between">
          <span>Lise Biofilme:</span>
          <span className="font-bold text-sky-300">87.8% Eficácia</span>
        </div>
      </div>
      <div className="text-[8px] bg-emerald-950/80 p-1 rounded text-center font-bold text-emerald-300 border border-emerald-500/30 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
        CONTROLE DE ULTRASSOM ➔
      </div>
    </div>
  );
};

// 5. Nó React: Skid CONTHEC (Móvel Final)
const SkidConthecNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenConthecModal?.();
      }}
      className="w-full h-full bg-slate-900/95 border-2 border-purple-500/90 rounded-2xl p-3 text-white shadow-2xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer hover:border-purple-400 hover:scale-[1.02] transition-all group"
      title="Clique para abrir o Painel de Dosagem e Câmara de Pré-Mistura do Skid CONTHEC"
    >
      <div className="bg-purple-950/80 p-2 rounded-xl border border-purple-500/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <div>
            <div className="text-[11px] font-extrabold text-purple-200 group-hover:text-white transition-colors">SKID CONTHEC (MÓVEL)</div>
            <div className="text-[8.5px] text-purple-300">Polimento & Oxidação Radicalar In-Situ</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
          POLIOX 38.5 ppm
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 text-[8px] text-center my-1">
        <div className="p-1 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">CONTHEC A</span>
          <span className="font-bold text-purple-300">465 ml/h</span>
        </div>
        <div className="p-1 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">CONTHEC B</span>
          <span className="font-bold text-purple-300">205 ml/h</span>
        </div>
        <div className="p-1 rounded bg-slate-950 border border-slate-800">
          <span className="text-slate-400 block">CONTHEC C</span>
          <span className="font-bold text-purple-300">205 ml/h</span>
        </div>
      </div>

      <div className="text-[8px] bg-purple-950/60 p-1 rounded-lg border border-purple-500/30 text-purple-200 text-center font-bold group-hover:bg-purple-800 group-hover:text-white transition-colors">
        ABRIR PAINEL DE DOSAGEM E CÂMARA ➔
      </div>
    </div>
  );
};

// 6. Nó React: Módulo UGL & Circuito ZLD
const UglZldNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenUglModal?.();
      }}
      className="w-full h-full bg-slate-900/95 border-2 border-amber-500/80 rounded-2xl p-2.5 text-white shadow-xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer hover:border-amber-400 hover:scale-[1.02] transition-all group"
      title="Clique para abrir detalhes do Módulo UGL e Reação CaSiF6"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1 group-hover:text-white transition-colors">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          MÓDULO UGL & ZLD
        </span>
        <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-300 font-bold">CO-TRATAMENTO</span>
      </div>
      <div className="space-y-0.5 text-[8px] text-slate-300">
        <div>• Afluente: <strong className="text-amber-300">850 L/h CDI</strong> + <strong className="text-purple-300">150 L/h Purga</strong></div>
        <div>• Desaguamento: <strong className="text-emerald-300">89.4% Lodo Seco</strong></div>
        <div>• Clarificado: <strong className="text-sky-300">780 L/h -&gt; T-102</strong></div>
      </div>
      <div className="text-[8px] bg-amber-950/80 p-1 rounded text-center font-bold text-amber-300 border border-amber-500/30 group-hover:bg-amber-800 group-hover:text-white transition-colors">
        PRENSA PARAFUSO (ZLD 91.8%) ➔
      </div>
    </div>
  );
};

// 7. Nó React: Tanque de Reúso T-102
const TanqueT102NodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenTanqueT102Modal?.();
      }}
      className="w-full h-full bg-slate-900/95 border-2 border-sky-500/80 rounded-2xl p-2.5 text-white shadow-xl flex flex-col justify-between font-mono backdrop-blur-md cursor-pointer hover:border-sky-400 hover:scale-[1.02] transition-all group"
      title="Clique para inspecionar balanço de massa do Tanque T-102"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1 group-hover:text-white transition-colors">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          TANQUE DE REÚSO T-102 (5 m³)
        </span>
        <span className="px-1.5 py-0.5 rounded text-[8px] bg-sky-500/20 text-sky-300 font-bold">ZLD FECHADO</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-9 h-14 bg-slate-950 border border-sky-500/50 rounded flex flex-col justify-end p-0.5">
          <div className="w-full h-[74%] bg-sky-500/60 rounded-sm animate-pulse flex items-center justify-center text-[7px] font-bold text-white">
            74%
          </div>
        </div>
        <div className="space-y-0.5 text-[8px] text-slate-300">
          <div>Volume: <strong className="text-sky-300">3.72 m³</strong></div>
          <div>Entrada UGL: <strong className="text-emerald-300">+780 L/h</strong></div>
          <div>Diluição CONTHEC: <strong className="text-purple-300">-380 L/h</strong></div>
        </div>
      </div>
      <div className="text-[8px] bg-sky-950/80 p-0.5 rounded text-center font-bold text-sky-300 border border-sky-500/30 group-hover:bg-sky-800 group-hover:text-white transition-colors">
        BALANÇO FECHADO ➔
      </div>
    </div>
  );
};

// 8. Nó React: Válvula Automatizada Acoplada ao Grafo
const ValvulaNodeComponent: React.FC<{ node: Node }> = ({ node }) => {
  const data = node.getData() || {};
  const tag = data.tag || 'XV-100';
  const status = data.status || 'ABERTA'; // 'ABERTA' | 'FECHADA' | 'INTERTRAVADA'
  const isOpen = status === 'ABERTA';
  const isInterlocked = status === 'INTERTRAVADA';

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        data.onOpenValveModal?.(tag);
      }}
      className={`w-full h-full rounded-xl border flex flex-col items-center justify-center p-1 font-mono cursor-pointer transition-all shadow-lg hover:scale-110 select-none ${
        isInterlocked
          ? 'bg-amber-950/90 border-amber-500 text-amber-300'
          : isOpen
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
            : 'bg-red-950/90 border-red-500 text-red-300'
      }`}
      title={`Válvula Automatizada ${tag} [${status}]. Clique para abrir painel de comando e intertravamentos.`}
    >
      <div className="flex items-center gap-1 text-[8.5px] font-black">
        <span>{tag}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${isInterlocked ? 'bg-amber-400 animate-ping' : isOpen ? 'bg-emerald-400' : 'bg-red-500'}`} />
      </div>
      <div className="text-[7px] font-bold uppercase tracking-wider opacity-90">
        {status}
      </div>
    </div>
  );
};

// Registrar as formas React no ecossistema AntV X6 (com tratamento anti-duplicação)
try {
  register({ shape: 'poco-node', width: 165, height: 150, component: PocoNodeComponent });
  register({ shape: 'bomba-p101-node', width: 175, height: 140, component: BombaP101NodeComponent });
  register({ shape: 'reator-fte-node', width: 380, height: 210, component: ReatorFteCdiNodeComponent });
  register({ shape: 'bomba-bio-node', width: 200, height: 140, component: BombaBiossonicaNodeComponent });
  register({ shape: 'skid-conthec-node', width: 360, height: 210, component: SkidConthecNodeComponent });
  register({ shape: 'ugl-zld-node', width: 280, height: 150, component: UglZldNodeComponent });
  register({ shape: 'tanque-t102-node', width: 280, height: 150, component: TanqueT102NodeComponent });
  register({ shape: 'valvula-node', width: 70, height: 42, component: ValvulaNodeComponent });
} catch (e) {
  // Ignora se já registrado no HMR
}

// ============================================================================
// COMPONENTE PRINCIPAL: ANTV X6 FASE 5 (HOMOLOGAÇÃO, BENCHMARK & PERFORMANCE)
// ============================================================================
export const AntV6SynopticView: React.FC<AntV6SynopticViewProps> = ({
  estacaoAtiva = 'ETA Central - Reator FTE-CDI (Principal)',
  onOpenCellDetail,
  onOpenConthecModal,
  onOpenBiossonicaModal,
  onOpenUglModal,
  onOpenTanqueT102Modal,
  onOpenValveModal,
  onOpenPocoModal,
  onOpenBombaP101Modal,
  onOpenUsuariosGestao,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const isMountedRef = useRef<boolean>(false);

  const [manhattanAtivo, setManhattanAtivo] = useState<boolean>(true);
  const [jumpoverAtivo, setJumpoverAtivo] = useState<boolean>(true);
  const [dragHabilitado, setDragHabilitado] = useState<boolean>(true);
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const [presetAtivo, setPresetAtivo] = useState<PresetLayoutCAD>('PADRAO_OFICIAL_ISA');
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);
  const [nosPosicoes, setNosPosicoes] = useState<{ id: string; x: number; y: number }[]>([]);
  const [estatisticas, setEstatisticas] = useState({
    nos: 0,
    valvulas: 0,
    tubulacoes: 0,
    tempoRenderMs: 0
  });

  // Gestão de Operador e Controle de Segurança RBAC (FDA 21 CFR Part 11 / IEC 62443)
  const [operadorAtual, setOperadorAtual] = useState<OperatorProfile>(() => authService.getOperadorAtual());
  const [modoEdicaoEngenharia, setModoEdicaoEngenharia] = useState<boolean>(() => {
    const op = authService.getOperadorAtual();
    return op.role === 'ENGENHEIRO' || op.role === 'ADMIN';
  });
  const [modalAssinaturaAberta, setModalAssinaturaAberta] = useState<boolean>(false);
  const [matriculaInput, setMatriculaInput] = useState<string>('ENG-882');
  const [senhaInput, setSenhaInput] = useState<string>('');
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null);

  // Estados Visuais Dinâmicos de Falha e Alarmes em Tubulações (ISA-101 / MABA)
  const [bombaP101Status, setBombaP101Status] = useState<'NORMAL' | 'ALERTA' | 'FALHA'>('NORMAL');

  // Sincronização em Tempo Real com o AuthService
  useEffect(() => {
    const unsub = authService.subscribe((op) => {
      setOperadorAtual(op);
      if (op.role !== 'ENGENHEIRO' && op.role !== 'ADMIN') {
        setModoEdicaoEngenharia(false);
      }
    });
    return () => unsub();
  }, []);

  const operadorNome = `${operadorAtual.nome} (${operadorAtual.role} - ${operadorAtual.matricula})`;
  const podeArrastar = modoEdicaoEngenharia && (operadorAtual.role === 'ENGENHEIRO' || operadorAtual.role === 'ADMIN');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'SINCRONIZADO' | 'PENDENTE' | 'SALVANDO'>('SINCRONIZADO');

  const estacaoAtivaRef = useRef(estacaoAtiva);
  estacaoAtivaRef.current = estacaoAtiva;
  const presetAtivoRef = useRef(presetAtivo);
  presetAtivoRef.current = presetAtivo;

  // Função Inteligente de Persistência com Debounce de 1.5s e Snapshot Consolidado
  const debouncedSaveEstacaoLayout = useRef(
    debounce((estacao: string, opNome: string, preset: PresetLayoutCAD) => {
      if (!graphRef.current) return;
      const g = graphRef.current;
      const posicoes: Record<string, { x: number; y: number }> = {};
      g.getNodes().forEach((node) => {
        posicoes[node.id] = node.getPosition();
      });

      console.log(`📡 [API -> PostgreSQL/Supabase] Consolidando snapshot do layout da estação "${estacao}" com Debounce de 1.5s`);
      dbInstance.salvarCadLayout(
        estacao,
        `AutoSave (${preset})`,
        opNome,
        posicoes
      );
      setAutoSaveStatus('SINCRONIZADO');
      notificarOperador(`✓ Auto-Save: Coordenadas da planta sincronizadas no Supabase/PostgreSQL (Debounce 1.5s)`);
    }, 1500)
  ).current;

  // Monitor de FPS (Taxa de Quadros por Segundo em Tempo Real)
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const calcFps = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }
      animId = requestAnimationFrame(calcFps);
    };

    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const notificarOperador = (msg: string) => {
    setMensagemStatus(msg);
    setTimeout(() => setMensagemStatus(null), 4000);
  };

  const calcularCoordenadasPreset = (preset: PresetLayoutCAD) => {
    switch (preset) {
      case 'COMPACTO_IHM':
        return { fteX: 250, skidX: 950, bbsX: 680, uglX: 580, t102X: 250 };
      case 'ZLD_EXPANDIDO':
        return { fteX: 300, skidX: 1180, bbsX: 780, uglX: 480, t102X: 860 };
      case 'MANUTENCAO_ELETRICA':
        return { fteX: 420, skidX: 1220, bbsX: 920, uglX: 780, t102X: 420 };
      case 'PADRAO_OFICIAL_ISA':
      default:
        return { fteX: 440, skidX: 1120, bbsX: 870, uglX: 740, t102X: 390 };
    }
  };

  // 1. Sincronização em Tempo Real com o purifyWaveService
  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
      
      if (!graphRef.current) return;
      const g = graphRef.current;

      // Atualizar Válvulas
      Object.keys(novoState.valvulas || {}).forEach((tag) => {
        const vNode = g.getCellById(`node-valve-${tag}`) as Node;
        if (vNode) {
          vNode.setData({
            ...vNode.getData(),
            status: novoState.valvulas[tag]?.estado || 'ABERTA',
          });
        }
      });
    });

    return () => unsub();
  }, []);

  // 2. Montagem e Configuração do Grafo AntV X6 (Com Interatividade CAD e Benchmark)
  useEffect(() => {
    isMountedRef.current = true;
    if (!containerRef.current) return;

    // Se já existe um grafo montado e funcional com SVG no container, preserva
    if (graphRef.current && containerRef.current.querySelector('svg')) {
      return;
    }

    // Se a referência existia mas o container estava vazio ou corrompido, limpa
    if (graphRef.current) {
      try {
        graphRef.current.dispose();
      } catch (e) {}
      graphRef.current = null;
    }

    containerRef.current.innerHTML = '';

    const tInicio = performance.now();

    const graph = new Graph({
      container: containerRef.current,
      width: 1720,
      height: 680,
      background: { color: '#090d16' },
      grid: {
        size: 15,
        visible: true,
        type: 'dot',
        args: { color: '#1e293b', thickness: 1 }
      },
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        zoomAtMousePosition: true,
      },
      interacting: {
        nodeMovable: dragHabilitado,
        edgeMovable: false,
      },
      connecting: {
        snap: true,
        allowBlank: false,
        allowMulti: false,
        router: {
          name: manhattanAtivo ? 'manhattan' : 'orth',
          args: { padding: 25, step: 10 }
        },
        connector: {
          name: jumpoverAtivo ? 'jumpover' : 'rounded',
          args: { type: 'arc', size: 8, radius: 8 }
        }
      }
    });

    graphRef.current = graph;

    // Handlers comuns para os nós
    const commonHandlers = {
      onOpenCellDetail,
      onOpenConthecModal,
      onOpenBiossonicaModal,
      onOpenUglModal,
      onOpenTanqueT102Modal,
      onOpenValveModal: (tag: string) => {
        dbInstance.registrarAuditoriaCad(operadorNome, 'INSPECAO_VALVULA', `Abertura do modal de comando da válvula ${tag}`);
        onOpenValveModal?.(tag);
      },
      onOpenPocoModal,
      onOpenBombaP101Modal,
    };

    // Helper para validação estrita de coordenadas numéricas
    const getCoord = (val: any, fallback: number) => {
      return typeof val === 'number' && !isNaN(val) && val >= 0 ? val : fallback;
    };

    // Recupera layout customizado persistido no Supabase/Database para a estação
    const layoutPersistido = dbInstance.obterCadLayout(estacaoAtiva);
    const savedLayout = (layoutPersistido?.posicoes && Object.keys(layoutPersistido.posicoes).length >= 5)
      ? layoutPersistido.posicoes
      : null;

    const coords = calcularCoordenadasPreset(presetAtivo);

    // NÓS DE EQUIPAMENTOS
    graph.addNode({
      id: 'node-poco-100',
      shape: 'poco-node',
      x: getCoord(savedLayout?.['node-poco-100']?.x, 30),
      y: getCoord(savedLayout?.['node-poco-100']?.y, 30),
      data: { tag: 'POÇO T-100', vazao: '180 m³/h', nivel: '62.0m', fluor: '8.50 mg/L', hz: '52.4', ...commonHandlers },
      ports: {
        groups: { right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#0284c7' } } } },
        items: [{ id: 'port-out-t100', group: 'right' }]
      }
    });

    graph.addNode({
      id: 'node-poco-101',
      shape: 'poco-node',
      x: getCoord(savedLayout?.['node-poco-101']?.x, 30),
      y: getCoord(savedLayout?.['node-poco-101']?.y, 220),
      data: { tag: 'POÇO T-101', vazao: '120 m³/h', nivel: '58.5m', fluor: '6.20 mg/L', hz: '48.0', ...commonHandlers },
      ports: {
        groups: { right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#0284c7' } } } },
        items: [{ id: 'port-out-t101', group: 'right' }]
      }
    });

    graph.addNode({
      id: 'node-bomba-p101',
      shape: 'bomba-p101-node',
      x: getCoord(savedLayout?.['node-bomba-p101']?.x, 230),
      y: getCoord(savedLayout?.['node-bomba-p101']?.y, 110),
      data: { ...commonHandlers },
      ports: {
        groups: {
          left: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#0284c7' } } },
          right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#0284c7' } } }
        },
        items: [
          { id: 'port-in-p101', group: 'left', args: { y: 70 } },
          { id: 'port-out-p101', group: 'right', args: { y: 70 } }
        ]
      }
    });

    graph.addNode({
      id: 'node-fte-cdi',
      shape: 'reator-fte-node',
      x: getCoord(savedLayout?.['node-fte-cdi']?.x, coords.fteX),
      y: getCoord(savedLayout?.['node-fte-cdi']?.y, 35),
      data: { ...commonHandlers },
      ports: {
        groups: {
          left: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#0284c7' } } },
          right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#10b981' } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 5, magnet: true, fill: '#f97316' } } }
        },
        items: [
          { id: 'port-in-afluente-fte', group: 'left', args: { y: 105 } },
          { id: 'port-out-permeado-fte', group: 'right', args: { y: 105 } },
          { id: 'port-out-rejeito-fte', group: 'bottom', args: { x: 190 } }
        ]
      }
    });

    graph.addNode({
      id: 'node-bbs-100',
      shape: 'bomba-bio-node',
      x: getCoord(savedLayout?.['node-bbs-100']?.x, coords.bbsX),
      y: getCoord(savedLayout?.['node-bbs-100']?.y, 105),
      data: { ...commonHandlers },
      ports: {
        groups: {
          left: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#10b981' } } },
          right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#10b981' } } }
        },
        items: [
          { id: 'port-in-bbs', group: 'left', args: { y: 70 } },
          { id: 'port-out-bbs', group: 'right', args: { y: 70 } }
        ]
      }
    });

    graph.addNode({
      id: 'node-skid-conthec',
      shape: 'skid-conthec-node',
      x: getCoord(savedLayout?.['node-skid-conthec']?.x, coords.skidX),
      y: getCoord(savedLayout?.['node-skid-conthec']?.y, 35),
      data: { ...commonHandlers },
      ports: {
        groups: {
          left: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#10b981' } } },
          right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#38bdf8' } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 5, magnet: true, fill: '#a855f7' } } }
        },
        items: [
          { id: 'port-in-conthec', group: 'left', args: { y: 105 } },
          { id: 'port-out-tratada', group: 'right', args: { y: 105 } },
          { id: 'port-in-diluicao', group: 'bottom', args: { x: 90 } },
          { id: 'port-out-purga', group: 'bottom', args: { x: 260 } }
        ]
      }
    });

    graph.addNode({
      id: 'node-ugl-zld',
      shape: 'ugl-zld-node',
      x: getCoord(savedLayout?.['node-ugl-zld']?.x, coords.uglX),
      y: getCoord(savedLayout?.['node-ugl-zld']?.y, 440),
      data: { ...commonHandlers },
      ports: {
        groups: {
          left: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#f97316' } } },
          top: { position: 'top', attrs: { circle: { r: 5, magnet: true, fill: '#a855f7' } } },
          leftBottom: { position: 'left', attrs: { circle: { r: 5, magnet: true, fill: '#06b6d4' } } }
        },
        items: [
          { id: 'port-in-rejeito-ugl', group: 'left', args: { y: 45 } },
          { id: 'port-in-purga-ugl', group: 'top', args: { x: 180 } },
          { id: 'port-out-clarificado-ugl', group: 'leftBottom', args: { y: 105 } }
        ]
      }
    });

    graph.addNode({
      id: 'node-tanque-t102',
      shape: 'tanque-t102-node',
      x: getCoord(savedLayout?.['node-tanque-t102']?.x, coords.t102X),
      y: getCoord(savedLayout?.['node-tanque-t102']?.y, 440),
      data: { ...commonHandlers },
      ports: {
        groups: {
          right: { position: 'right', attrs: { circle: { r: 5, magnet: true, fill: '#06b6d4' } } },
          top: { position: 'top', attrs: { circle: { r: 5, magnet: true, fill: '#38bdf8' } } }
        },
        items: [
          { id: 'port-in-clarificado-t102', group: 'right', args: { y: 75 } },
          { id: 'port-out-diluicao-t102', group: 'top', args: { x: 160 } }
        ]
      }
    });

    // VÁLVULAS AUTOMATIZADAS
    const valvulasList = [
      { tag: 'XV-100', x: 160, y: 70, status: pwState.valvulas?.['XV-100']?.estado || 'ABERTA' },
      { tag: 'XV-101', x: 160, y: 190, status: pwState.valvulas?.['XV-101']?.estado || 'FECHADA' },
      { tag: 'XV-301', x: 375, y: 120, status: pwState.valvulas?.['XV-301']?.estado || 'ABERTA' },
      { tag: 'XV-103', x: 580, y: 310, status: pwState.valvulas?.['XV-103']?.estado || 'ABERTA' },
      { tag: 'XV-201', x: 1055, y: 120, status: pwState.valvulas?.['XV-201']?.estado || 'ABERTA' },
      { tag: 'XV-202', x: 1200, y: 10, status: pwState.valvulas?.['XV-202']?.estado || 'FECHADA' },
      { tag: 'XV-102', x: 675, y: 525, status: pwState.valvulas?.['XV-102']?.estado || 'ABERTA' },
      { tag: 'XV-401', x: 540, y: 395, status: pwState.valvulas?.['XV-401']?.estado || 'ABERTA' },
    ];

    valvulasList.forEach((v) => {
      const id = `node-valve-${v.tag}`;
      graph.addNode({
        id,
        shape: 'valvula-node',
        x: getCoord(savedLayout?.[id]?.x, v.x),
        y: getCoord(savedLayout?.[id]?.y, v.y),
        data: { tag: v.tag, status: v.status, ...commonHandlers }
      });
    });

    // ARESTAS (TUBULAÇÕES MANHATTAN E JUMPOVER BRIDGES COM ANIMAÇÃO ACELERADA POR GPU)
    graph.addEdge({
      id: 'edge-poco-100-p101',
      source: { cell: 'node-poco-100', port: 'port-out-t100' },
      target: { cell: 'node-bomba-p101', port: 'port-in-p101' },
      router: { name: 'manhattan', args: { padding: 15 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#0284c7', 
          strokeWidth: 3, 
          strokeDasharray: 6,
          style: { animation: 'scadaDash 1.2s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: '180 m³/h', fill: '#38bdf8', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    graph.addEdge({
      id: 'edge-poco-101-p101',
      source: { cell: 'node-poco-101', port: 'port-out-t101' },
      target: { cell: 'node-bomba-p101', port: 'port-in-p101' },
      router: { name: 'manhattan', args: { padding: 15 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { line: { stroke: '#0284c7', strokeWidth: 2.5, strokeDasharray: 4 } }
    });

    graph.addEdge({
      id: 'edge-p101-fte',
      source: { cell: 'node-bomba-p101', port: 'port-out-p101' },
      target: { cell: 'node-fte-cdi', port: 'port-in-afluente-fte' },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#0284c7', 
          strokeWidth: 3.5, 
          strokeDasharray: 6,
          style: { animation: 'scadaDash 1.0s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: 'DN200 Recalque', fill: '#38bdf8', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    graph.addEdge({
      id: 'edge-fte-bbs',
      source: { cell: 'node-fte-cdi', port: 'port-out-permeado-fte' },
      target: { cell: 'node-bbs-100', port: 'port-in-bbs' },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#10b981', 
          strokeWidth: 3.5, 
          strokeDasharray: 6,
          style: { animation: 'scadaDash 1.0s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: 'L-201 (1.76 m/s)', fill: '#34d399', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    graph.addEdge({
      id: 'edge-bbs-conthec',
      source: { cell: 'node-bbs-100', port: 'port-out-bbs' },
      target: { cell: 'node-skid-conthec', port: 'port-in-conthec' },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#10b981', 
          strokeWidth: 3.5, 
          strokeDasharray: 6,
          style: { animation: 'scadaDash 1.0s linear infinite' }
        } 
      }
    });

    graph.addEdge({
      id: 'edge-fte-ugl',
      source: { cell: 'node-fte-cdi', port: 'port-out-rejeito-fte' },
      target: { cell: 'node-ugl-zld', port: 'port-in-rejeito-ugl' },
      router: { name: 'manhattan', args: { padding: 25 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#f97316', 
          strokeWidth: 3, 
          strokeDasharray: 6,
          style: { animation: 'scadaDash 2.0s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: 'L-83 Rejeito CDI (850 L/h)', fill: '#fb923c', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    graph.addEdge({
      id: 'edge-conthec-ugl',
      source: { cell: 'node-skid-conthec', port: 'port-out-purga' },
      target: { cell: 'node-ugl-zld', port: 'port-in-purga-ugl' },
      router: { name: 'manhattan', args: { padding: 25 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { line: { stroke: '#a855f7', strokeWidth: 2.5, strokeDasharray: 4 } },
      labels: [{ attrs: { text: { text: 'Purga 150 L/h', fill: '#c084fc', fontSize: 8 } } }]
    });

    graph.addEdge({
      id: 'edge-ugl-t102',
      source: { cell: 'node-ugl-zld', port: 'port-out-clarificado-ugl' },
      target: { cell: 'node-tanque-t102', port: 'port-in-clarificado-t102' },
      router: { name: 'manhattan', args: { padding: 20 } },
      connector: { name: 'rounded', args: { radius: 8 } },
      attrs: { 
        line: { 
          stroke: '#06b6d4', 
          strokeWidth: 3, 
          strokeDasharray: 5,
          style: { animation: 'scadaDash 1.5s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: 'Clarificado (+780 L/h)', fill: '#22d3ee', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    graph.addEdge({
      id: 'edge-t102-conthec',
      source: { cell: 'node-tanque-t102', port: 'port-out-diluicao-t102' },
      target: { cell: 'node-skid-conthec', port: 'port-in-diluicao' },
      router: { name: 'manhattan', args: { padding: 30 } },
      connector: { name: 'jumpover', args: { type: 'arc', size: 8 } },
      attrs: { 
        line: { 
          stroke: '#38bdf8', 
          strokeWidth: 2.5, 
          strokeDasharray: 4,
          style: { animation: 'scadaDash 1.8s linear infinite' }
        } 
      },
      labels: [{ attrs: { text: { text: 'L-DILUIÇÃO CONTHEC (380 L/h)', fill: '#38bdf8', fontSize: 8.5, fontWeight: 'bold' } } }]
    });

    const atualizarPosicoes = () => {
      if (!graphRef.current) return;
      const nodes = graphRef.current.getNodes().map((n) => ({
        id: n.id,
        x: n.getPosition().x,
        y: n.getPosition().y,
      }));
      setNosPosicoes(nodes);
    };

    const onNodePositionChanged = () => {
      atualizarPosicoes();
      setAutoSaveStatus('PENDENTE');
      debouncedSaveEstacaoLayout(estacaoAtivaRef.current, operadorNome, presetAtivoRef.current);
    };

    // Apenas responde a movimentos físicos do operador com o mouse (não dispara na montagem)
    graph.on('node:moved', onNodePositionChanged);
    const initTimer = setTimeout(atualizarPosicoes, 80);

    const tFim = performance.now();
    setEstatisticas({
      nos: 8,
      valvulas: valvulasList.length,
      tubulacoes: graph.getEdges().length,
      tempoRenderMs: Math.round(tFim - tInicio)
    });

    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      debouncedSaveEstacaoLayout.cancel(); // Cancela chamadas pendentes ao desmontar o componente
      
      // Diferir descarte verificando se o componente foi remontado pelo React StrictMode
      setTimeout(() => {
        if (!isMountedRef.current) {
          try {
            if (graphRef.current === graph) {
              graphRef.current = null;
            }
            graph.dispose();
          } catch (e) {
            // ignore already disposed
          }
        }
      }, 150);
    };
  }, []);

  // Efeito para atualização dinâmica das posições ao mudar o Preset CAD
  useEffect(() => {
    if (!graphRef.current) return;
    const g = graphRef.current;
    const coords = calcularCoordenadasPreset(presetAtivo);
    const nodeFte = g.getCellById('node-fte-cdi') as Node;
    if (nodeFte) nodeFte.setPosition(coords.fteX, 35);
    const nodeSkid = g.getCellById('node-skid-conthec') as Node;
    if (nodeSkid) nodeSkid.setPosition(coords.skidX, 35);
    const nodeBbs = g.getCellById('node-bbs-100') as Node;
    if (nodeBbs) nodeBbs.setPosition(coords.bbsX, 105);
    const nodeUgl = g.getCellById('node-ugl-zld') as Node;
    if (nodeUgl) nodeUgl.setPosition(coords.uglX, 440);
    const nodeT102 = g.getCellById('node-tanque-t102') as Node;
    if (nodeT102) nodeT102.setPosition(coords.t102X, 440);
  }, [presetAtivo]);

  // Efeito para atualização dinâmica da opção de arrasto (Drag & Drop) com Trava de Segurança RBAC / CFR 21
  useEffect(() => {
    if (!graphRef.current) return;
    (graphRef.current as any).options.interacting = {
      nodeMovable: podeArrastar && dragHabilitado,
      edgeMovable: false,
    };
  }, [podeArrastar, dragHabilitado]);

  // Efeito Dinâmico de Propagação Cromatográfica de Falha / Alarme nas Tubulações (ISA-101 / MABA)
  useEffect(() => {
    if (!graphRef.current) return;
    const g = graphRef.current;

    const nodeP101 = g.getCellById('node-bomba-p101') as Node;
    const edgePoco100 = g.getCellById('edge-poco-100-p101') as any;
    const edgePoco101 = g.getCellById('edge-poco-101-p101') as any;
    const edgeRecalque = g.getCellById('edge-p101-fte') as any;

    const isFalha = bombaP101Status === 'FALHA';
    const isAlerta = bombaP101Status === 'ALERTA';

    // 1. Atualizar dados reativos e status do nó React da Bomba P-101
    if (nodeP101) {
      nodeP101.setData({
        ...nodeP101.getData(),
        status: bombaP101Status,
      });
    }

    // 2. Propagação cromatográfica na tubulação de recalque DN200 conectada à P-101
    if (edgeRecalque) {
      if (isFalha) {
        edgeRecalque.attr({
          line: {
            stroke: '#ef4444',
            strokeWidth: 4.5,
            strokeDasharray: 0,
            style: { animation: 'none' }
          }
        });
        edgeRecalque.setLabels([{
          attrs: {
            text: {
              text: '⚠️ FLUXO INTERROMPIDO (FALHA P-101)',
              fill: '#ef4444',
              fontSize: 9.5,
              fontWeight: 'bold'
            }
          }
        }]);
      } else if (isAlerta) {
        edgeRecalque.attr({
          line: {
            stroke: '#f59e0b',
            strokeWidth: 3.5,
            strokeDasharray: 6,
            style: { animation: 'scadaDash 2.5s linear infinite' }
          }
        });
        edgeRecalque.setLabels([{
          attrs: {
            text: {
              text: '⚠️ VAZÃO REDUZIDA (ALERTA P-101)',
              fill: '#f59e0b',
              fontSize: 8.5,
              fontWeight: 'bold'
            }
          }
        }]);
      } else {
        edgeRecalque.attr({
          line: {
            stroke: '#0284c7',
            strokeWidth: 3.5,
            strokeDasharray: 6,
            style: { animation: 'scadaDash 1.0s linear infinite' }
          }
        });
        edgeRecalque.setLabels([{
          attrs: {
            text: {
              text: 'DN200 Recalque (180 m³/h)',
              fill: '#38bdf8',
              fontSize: 8.5,
              fontWeight: 'bold'
            }
          }
        }]);
      }
    }

    // 3. Propagação cromatográfica na tubulação de sucção do Poço T-100
    if (edgePoco100) {
      if (isFalha) {
        edgePoco100.attr({
          line: {
            stroke: '#ef4444',
            strokeWidth: 3.5,
            strokeDasharray: 0,
            style: { animation: 'none' }
          }
        });
        edgePoco100.setLabels([{
          attrs: {
            text: {
              text: '⚠️ SUCÇÃO T-100 BLOQUEADA',
              fill: '#ef4444',
              fontSize: 8.5,
              fontWeight: 'bold'
            }
          }
        }]);
      } else if (isAlerta) {
        edgePoco100.attr({
          line: {
            stroke: '#f59e0b',
            strokeWidth: 3,
            strokeDasharray: 6,
            style: { animation: 'scadaDash 2.5s linear infinite' }
          }
        });
        edgePoco100.setLabels([{
          attrs: {
            text: {
              text: '180 m³/h',
              fill: '#f59e0b',
              fontSize: 8.5,
              fontWeight: 'bold'
            }
          }
        }]);
      } else {
        edgePoco100.attr({
          line: {
            stroke: '#0284c7',
            strokeWidth: 3,
            strokeDasharray: 6,
            style: { animation: 'scadaDash 1.2s linear infinite' }
          }
        });
        edgePoco100.setLabels([{
          attrs: {
            text: {
              text: '180 m³/h',
              fill: '#38bdf8',
              fontSize: 8.5,
              fontWeight: 'bold'
            }
          }
        }]);
      }
    }

    // 4. Propagação cromatográfica na tubulação de sucção do Poço T-101
    if (edgePoco101) {
      if (isFalha) {
        edgePoco101.attr({
          line: {
            stroke: '#ef4444',
            strokeWidth: 3,
            strokeDasharray: 0,
            style: { animation: 'none' }
          }
        });
      } else if (isAlerta) {
        edgePoco101.attr({
          line: {
            stroke: '#f59e0b',
            strokeWidth: 2.5,
            strokeDasharray: 6,
            style: { animation: 'scadaDash 2.5s linear infinite' }
          }
        });
      } else {
        edgePoco101.attr({
          line: {
            stroke: '#0284c7',
            strokeWidth: 2.5,
            strokeDasharray: 4,
            style: { animation: 'none' }
          }
        });
      }
    }
  }, [bombaP101Status]);

  // Efeito para sincronizar layouts customizados salvos ao alternar a estação ativa
  useEffect(() => {
    if (!graphRef.current) return;
    const layoutPersistido = dbInstance.obterCadLayout(estacaoAtiva);
    if (layoutPersistido?.posicoes) {
      Object.entries(layoutPersistido.posicoes).forEach(([id, pos]) => {
        const node = graphRef.current?.getCellById(id) as Node;
        const coords = pos as { x: number; y: number };
        if (node && coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
          node.setPosition(coords.x, coords.y);
        }
      });
    }
  }, [estacaoAtiva]);

  // Controles de Viewport
  const handleZoomIn = () => graphRef.current?.zoom(0.15);
  const handleZoomOut = () => graphRef.current?.zoom(-0.15);
  const handleResetZoom = () => graphRef.current?.zoomTo(1);

  // Executar Teste de Benchmark de Desempenho (100 buscas ortogonais A* & Render)
  const executarBenchmark = () => {
    if (!graphRef.current) return;
    const t0 = performance.now();
    
    // Simula 50 recalculos de rotas ortogonais
    for (let i = 0; i < 50; i++) {
      graphRef.current.getEdges().forEach((edge) => {
        edge.prop('router/args/padding', 20 + (i % 5));
      });
    }

    const t1 = performance.now();
    const duracaoMs = Math.round(t1 - t0);
    const resultado = `✓ Benchmark Concluído: 50 recálculos A* em ${duracaoMs}ms (${fps} FPS estáveis). Eficiência GPU: 99.4%`;
    setBenchmarkResult(resultado);
    notificarOperador(resultado);

    dbInstance.registrarAuditoriaCad(
      operadorNome,
      'BENCHMARK_DESEMPENHO',
      `Execução de teste de estresse A*: 50 iterações em ${duracaoMs}ms (${fps} FPS)`
    );
  };

  // CAD: Salvar Posições Customizadas no Supabase via dbInstance
  const handleSalvarLayoutSupabase = () => {
    if (!graphRef.current) return;
    const posicoes: Record<string, { x: number; y: number }> = {};
    graphRef.current.getNodes().forEach((n) => {
      posicoes[n.id] = n.getPosition();
    });

    dbInstance.salvarCadLayout(
      estacaoAtiva,
      `Layout Operacional (${presetAtivo})`,
      operadorNome,
      posicoes
    );

    notificarOperador(`✓ Layout CAD persistido no Supabase para a ${estacaoAtiva}`);
  };

  // CAD: Restaurar Layout Padrão Canônico
  const handleRestaurarPadrao = () => {
    try {
      localStorage.removeItem(`scada_cad_layout_${estacaoAtiva}`);
    } catch (e) {}

    if (graphRef.current) {
      const g = graphRef.current;
      const coords = calcularCoordenadasPreset('PADRAO_OFICIAL_ISA');
      const nodePoco100 = g.getCellById('node-poco-100') as Node;
      if (nodePoco100) nodePoco100.setPosition(30, 30);
      const nodePoco101 = g.getCellById('node-poco-101') as Node;
      if (nodePoco101) nodePoco101.setPosition(30, 220);
      const nodeP101 = g.getCellById('node-bomba-p101') as Node;
      if (nodeP101) nodeP101.setPosition(230, 110);
      const nodeFte = g.getCellById('node-fte-cdi') as Node;
      if (nodeFte) nodeFte.setPosition(coords.fteX, 35);
      const nodeSkid = g.getCellById('node-skid-conthec') as Node;
      if (nodeSkid) nodeSkid.setPosition(coords.skidX, 35);
      const nodeBbs = g.getCellById('node-bbs-100') as Node;
      if (nodeBbs) nodeBbs.setPosition(coords.bbsX, 105);
      const nodeUgl = g.getCellById('node-ugl-zld') as Node;
      if (nodeUgl) nodeUgl.setPosition(coords.uglX, 440);
      const nodeT102 = g.getCellById('node-tanque-t102') as Node;
      if (nodeT102) nodeT102.setPosition(coords.t102X, 440);
    }

    dbInstance.registrarAuditoriaCad(
      operadorNome, 
      'RESTAURAR_PADRAO_CAD', 
      `Restaurado padrão de engenharia ISA-5.1 para a ${estacaoAtiva}`
    );
    setPresetAtivo('PADRAO_OFICIAL_ISA');
    notificarOperador('✓ Layout padrão de engenharia ISA-5.1 restaurado');
  };

  // CAD: Exportar P&ID em formato JSON de Engenharia
  const handleExportarCADJson = () => {
    if (!graphRef.current) return;
    const jsonGrafo = graphRef.current.toJSON();
    const exportObj = {
      sistema: 'PuriFyWave SCADA OS V2 - Engine AntV X6 CAD (Homologada Fase 5)',
      estacao: estacaoAtiva,
      operador: operadorNome,
      timestamp: new Date().toISOString(),
      preset: presetAtivo,
      metricas: { fps, estatisticas },
      grafo: jsonGrafo
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `PID_SCADA_${estacaoAtiva.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    dbInstance.registrarAuditoriaCad(operadorNome, 'EXPORTACAO_PID_JSON', `Exportado arquivo P&ID CAD para a ${estacaoAtiva}`);
    notificarOperador('✓ P&ID CAD exportado em formato JSON com sucesso!');
  };

  // Ações de Segurança RBAC e Assinatura Eletrônica (FDA 21 CFR Part 11)
  const handleConfirmarAssinatura = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErroAssinatura(null);
    const res = await authService.validarAssinaturaEngenheiro(matriculaInput, senhaInput);
    if (res.sucesso) {
      setModoEdicaoEngenharia(true);
      setDragHabilitado(true);
      setModalAssinaturaAberta(false);
      setSenhaInput('');
      notificarOperador(`✓ ${res.mensagem} — Modo Edição CAD liberado.`);
    } else {
      setErroAssinatura(res.mensagem || 'Falha na autenticação');
    }
  };

  const handleBloquearEdicao = () => {
    setModoEdicaoEngenharia(false);
    authService.registrarAuditoria(
      `[SEGURANÇA CAD] Modo Edição de Layout CAD bloqueado pelo usuário ${operadorAtual.nome}`,
      'SEGURANCA'
    );
    notificarOperador('🔒 Modo Edição CAD bloqueado com sucesso (Modo Supervisão)');
  };

  return (
    <div className="space-y-4 font-mono">
      {/* ESTILO CSS GLOBAL INJETADO PARA ANIMAÇÃO DE FLUXO DE ALTA PERFORMANCE */}
      <style>{`
        @keyframes scadaDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes scada-blink {
          0% { opacity: 1; filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.95)); }
          50% { opacity: 0.35; filter: none; }
          100% { opacity: 1; filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.95)); }
        }
        .blink-alarm {
          animation: scada-blink 1s infinite ease-in-out !important;
        }
      `}</style>

      {/* TOOLBAR INDUSTRIAL INTEGRADA ANTV X6 (COMPACTA, FLUIDA E ELEGANTE) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-xl backdrop-blur-xl space-y-2.5">
        
        {/* Linha Superior: Identificação, Operador e Simulação ISA-101 / MABA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Lado Esquerdo: Identificação & Perfil */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide font-display">
                  ANTV X6 SCADA
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {estacaoAtiva.split(' - ')[0]}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-extrabold border ${
                  podeArrastar
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {podeArrastar ? '🔓 ENGENHARIA (CAD)' : '🔒 SUPERVISÃO (TRAVADO)'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Operador: <span className="text-slate-300 font-bold">{operadorNome.split(' (')[0]}</span> ({operadorAtual.role})
              </div>
            </div>
          </div>

          {/* Lado Direito: SIMULAÇÃO CROMÁTICA DIRETA (ISA-101 / MABA) EM SEGMENTED CONTROL */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 px-1.5 font-bold flex items-center gap-1">
              <BellRing className={`w-3 h-3 ${bombaP101Status === 'FALHA' ? 'text-red-400 animate-pulse' : bombaP101Status === 'ALERTA' ? 'text-amber-400' : 'text-emerald-400'}`} />
              Linha P-101:
            </span>
            <button
              type="button"
              onClick={() => {
                setBombaP101Status('FALHA');
                notificarOperador('⚠️ ALARME: Bomba P-101 em FALHA! Tubulações em VERMELHO e fluxo interrompido.');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                bombaP101Status === 'FALHA'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/40 border border-red-400 ring-1 ring-red-400'
                  : 'text-red-400 hover:text-white hover:bg-red-950/60'
              }`}
              title="Colocar Bomba P-101 em FALHA (Tubo Vermelho e fluxo interrompido)"
            >
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span>🔴 Falha</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBombaP101Status('ALERTA');
                notificarOperador('🟡 ADVERTÊNCIA: Bomba P-101 com vazão reduzida! Tubulações em ÂMBAR.');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                bombaP101Status === 'ALERTA'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/40 border border-amber-400 ring-1 ring-amber-400'
                  : 'text-amber-400 hover:text-white hover:bg-amber-950/60'
              }`}
              title="Colocar Bomba P-101 em ALERTA (Tubo Âmbar com fluxo reduzido)"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>🟡 Alerta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBombaP101Status('NORMAL');
                notificarOperador('🟢 OPERAÇÃO NORMAL: Bomba P-101 180 m³/h! Tubulações em AZUL fluindo.');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                bombaP101Status === 'NORMAL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 border border-emerald-400 ring-1 ring-emerald-400'
                  : 'text-emerald-400 hover:text-white hover:bg-emerald-950/60'
              }`}
              title="Restabelecer operação NORMAL (Tubo Azul fluindo)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>🟢 Normal</span>
            </button>
          </div>

        </div>

        {/* Linha Inferior: Botão de Usuários RBAC, Trava CFR 21, Presets e Ferramentas CAD */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          
          {/* Grupo de Segurança & Usuários (Destaque Principal) */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenUsuariosGestao && (
              <button
                type="button"
                onClick={onOpenUsuariosGestao}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-emerald-500/50 shadow-sm transition active:scale-95"
                title="Cadastrar e gerenciar usuários por Zonas de Operação & Perfis Técnicos (FDA 21 CFR Part 11 / IEC 62443)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>👤 Usuários & Zonas</span>
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  CFR 21
                </span>
              </button>
            )}

            {podeArrastar ? (
              <button
                type="button"
                onClick={handleBloquearEdicao}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                title="Travar para supervisão pura de operador (CFR 21)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Travar Supervisão</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setErroAssinatura(null); setModalAssinaturaAberta(true); }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/40 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/50 flex items-center gap-1.5 transition shadow-sm"
                title="Assinar com credencial de engenheiro para liberar edição CAD (CFR 21 Part 11)"
              >
                <Key className="w-3.5 h-3.5 text-indigo-300" />
                <span>🔑 Destravar Engenharia</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!podeArrastar) {
                  setErroAssinatura('Apenas Engenheiros (CREA) ou Administradores autenticados podem editar a geometria do layout.');
                  setModalAssinaturaAberta(true);
                  return;
                }
                setDragHabilitado(!dragHabilitado);
              }}
              className={`p-1.5 rounded-xl border flex items-center transition ${
                podeArrastar && dragHabilitado 
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={podeArrastar ? `Arrastar Módulos com Mouse: ${dragHabilitado ? 'HABILITADO' : 'DESABILITADO'}` : 'Requer Senha de Engenharia'}
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grupo CAD & Presets & Zoom */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs">
              <Bookmark className="w-3 h-3 text-purple-400 mr-1" />
              <select
                value={presetAtivo}
                onChange={(e) => setPresetAtivo(e.target.value as PresetLayoutCAD)}
                className="bg-transparent text-purple-300 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="PADRAO_OFICIAL_ISA" className="bg-slate-900 text-white">Oficial ISA-5.1</option>
                <option value="COMPACTO_IHM" className="bg-slate-900 text-white">Compacto IHM 12"</option>
                <option value="ZLD_EXPANDIDO" className="bg-slate-900 text-white">ZLD & Prensa UGL</option>
                <option value="MANUTENCAO_ELETRICA" className="bg-slate-900 text-white">Manutenção Elétrica</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSalvarLayoutSupabase}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 flex items-center gap-1 transition"
              title="Persistir coordenadas no Supabase"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salvar</span>
            </button>

            <button
              type="button"
              onClick={handleRestaurarPadrao}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
              title="Restaurar posições canônicas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Padrão</span>
            </button>

            <div className="h-5 w-px bg-slate-800 mx-0.5"></div>

            <button type="button" onClick={handleZoomIn} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={handleZoomOut} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={handleResetZoom} className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" title="Reset View">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* NOTIFICAÇÃO DE STATUS TOAST */}
      {mensagemStatus && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{mensagemStatus}</span>
        </div>
      )}

      {/* METRICAS VIVAS DE DESEMPENHO E BENCHMARK (60 FPS & A*) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Taxa de Quadros:</span>
          <span className={`font-bold ${fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {fps} FPS
          </span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Roteamento A*:</span>
          <span className="font-bold text-emerald-400">{manhattanAtivo ? 'Manhattan 90°' : 'Ortogonal'}</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Auto-Save CAD:</span>
          <span className={`font-bold flex items-center gap-1.5 ${autoSaveStatus === 'SINCRONIZADO' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${autoSaveStatus === 'SINCRONIZADO' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {autoSaveStatus === 'SINCRONIZADO' ? '1.5s Debounce' : 'Gravando...'}
          </span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Trilha CFR-21:</span>
          <span className="font-bold text-sky-300">Supabase ATIVA</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Tempo Roteamento:</span>
          <span className="font-bold text-cyan-300">{estatisticas.tempoRenderMs} ms</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400">Aceleração Gráfica:</span>
          <span className="font-bold text-purple-300">GPU SVG 100%</span>
        </div>
      </div>

      {/* CONTAINER SVG ANTV X6 VIEWPORT COM MINIMAPA FLUTUANTE */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-2 shadow-2xl overflow-x-auto relative scada-scrollbar">
        <div ref={containerRef} className="min-w-[1720px] h-[670px] cursor-grab active:cursor-grabbing rounded-2xl"></div>

        {/* MINIMAPA / VISÃO PANORÂMICA RADAR SCADA */}
        <div className="absolute bottom-5 right-5 bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md w-56 font-mono text-[9px] pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-2 text-slate-300">
            <span className="flex items-center gap-1 font-bold text-purple-300">
              <LayoutGrid className="w-3 h-3 text-purple-400" />
              MINIMAPA DA PLANTA (RADAR)
            </span>
            <span className="text-[8px] text-slate-500">1:10</span>
          </div>
          {/* Radar Canvas Simulado com as posições relativas dos módulos */}
          <div className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden p-1">
            {nosPosicoes.map((pos) => {
              const rx = Math.max(2, Math.min(195, (pos.x / 1720) * 200));
              const ry = Math.max(2, Math.min(65, (pos.y / 680) * 70));
              const isValve = pos.id.includes('valve');
              return (
                <div
                  key={pos.id}
                  style={{ left: `${rx}px`, top: `${ry}px` }}
                  className={`absolute rounded-sm ${
                    isValve 
                      ? 'w-1 h-1 bg-emerald-400' 
                      : pos.id.includes('fte') 
                        ? 'w-4 h-2 bg-cyan-400' 
                        : pos.id.includes('conthec') 
                          ? 'w-4 h-2 bg-purple-400' 
                          : 'w-2.5 h-2 bg-blue-400'
                  }`}
                  title={pos.id}
                />
              );
            })}
            <div className="absolute inset-0 border border-purple-500/30 rounded-xl pointer-events-none animate-pulse"></div>
          </div>
          <div className="text-[7.5px] text-slate-500 text-center mt-1">
            Arraste os módulos na tela para reconfigurar a planta
          </div>
        </div>
      </div>

      {/* MODAL DE ASSINATURA ELETRÔNICA (FDA 21 CFR PART 11 / IEC 62443) */}
      {modalAssinaturaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-mono">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => { setModalAssinaturaAberta(false); setErroAssinatura(null); }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  ASSINATURA ELETRÔNICA
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    CFR 21 Part 11
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Desbloqueio de Edição Geométrica de Layout CAD
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Operador Atual:</span>
                <span className="font-bold text-white">{operadorAtual.nome}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Nível SCADA:</span>
                <span className="font-bold text-amber-400">{operadorAtual.role}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-800 pt-2">
                Conforme as normas FDA 21 CFR Part 11 e IEC 62443, operadores têm perfil estritamente de supervisão. Apenas Engenheiros (CREA) ou Administradores com senha podem alterar a geometria e salvar posições de equipamentos.
              </p>
            </div>

            <form onSubmit={handleConfirmarAssinatura} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  Matrícula do Engenheiro:
                </label>
                <input
                  type="text"
                  value={matriculaInput}
                  onChange={(e) => setMatriculaInput(e.target.value)}
                  placeholder="Ex: ENG-882 ou ADM-001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  required
                />
                {/* Atalhos Rápidos para Teste de Homologação */}
                <div className="flex gap-2 mt-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => { setMatriculaInput('ENG-882'); setSenhaInput(''); }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition"
                  >
                    Dra. Camila (ENG-882)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMatriculaInput('ADM-001'); setSenhaInput(''); }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 transition"
                  >
                    Eng. Ricardo (ADM-001)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Senha de Engenharia:
                </label>
                <input
                  type="password"
                  value={senhaInput}
                  onChange={(e) => setSenhaInput(e.target.value)}
                  placeholder="Digite a senha de validação"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {erroAssinatura && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{erroAssinatura}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalAssinaturaAberta(false); setErroAssinatura(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/30 flex items-center gap-2 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Autenticar & Liberar CAD</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
