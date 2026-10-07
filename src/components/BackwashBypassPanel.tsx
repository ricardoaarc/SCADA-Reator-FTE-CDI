/**
 * Painel Especializado de Retrolavagem & Válvulas de Bypass (P&ID)
 * Supervisório SCADA Reator FTE-CDI
 * Controle hidrodinâmico de descolmatagem dos feltros de grafite e malhas de titânio (Ru-Ir)
 */

import React, { useState } from 'react';
import { 
  RotateCcw, 
  GitBranch, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Gauge, 
  Sliders, 
  ZapOff, 
  Wind, 
  Waves, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Power,
  Layers,
  History,
  Info,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { BackwashState, BackwashCicloRegistro, ValvulasEstado, SensorData, SkidHardwareState } from '../types';

interface BackwashBypassPanelProps {
  hardwareState: SkidHardwareState;
  sensorData: SensorData;
  onIniciarRetrolavagem: (duracaoS: number) => void;
  onCancelarRetrolavagem: () => void;
  onSetBypass: (ativo: boolean) => void;
  onToggleValvula: (valvulaId: keyof ValvulasEstado) => void;
  onConfigurarAuto: (parcial: Partial<BackwashState>) => void;
}

export const BackwashBypassPanel: React.FC<BackwashBypassPanelProps> = ({
  hardwareState,
  sensorData,
  onIniciarRetrolavagem,
  onCancelarRetrolavagem,
  onSetBypass,
  onToggleValvula,
  onConfigurarAuto,
}) => {
  const retrolavagem = hardwareState.retrolavagem;
  const [duracaoSelecionada, setDuracaoSelecionada] = useState<number>(45);

  const pctProgresso = retrolavagem.emAndamento && retrolavagem.duracaoTotalSegundos > 0
    ? Math.round(((retrolavagem.duracaoTotalSegundos - retrolavagem.tempoRestanteSegundos) / retrolavagem.duracaoTotalSegundos) * 100)
    : 0;

  const getFaseDescricao = (fase: BackwashState['faseAtual']) => {
    switch (fase) {
      case 'DESPOLARIZACAO':
        return {
          titulo: 'Fase 1: Despolarização e Corte de Campo (0.0 V)',
          desc: 'Tensão anulada. Relaxamento da dupla camada elétrica (EDL) para liberar ânions e matéria coloidal retida.',
          cor: 'text-amber-400',
        };
      case 'LAVAGEM_REVERSA':
        return {
          titulo: 'Fase 2: Injeção em Contracorrente + Air Scour (XV-101 / XV-105)',
          desc: 'Fluxo em sentido oposto e pulsos de ar comprimido para expulsão mecânica do biofouling e lodo dos poros do feltro de grafite.',
          cor: 'text-sky-400',
        };
      case 'ENXAGUE':
        return {
          titulo: 'Fase 3: Enxágue Hidráulico & Descarga de Finos (XV-102 / XV-103)',
          desc: 'Alimentação frontal purga os resíduos suspensos diretamente para o dreno de rejeito antes de restabelecer o permeado.',
          cor: 'text-emerald-400',
        };
      default:
        return {
          titulo: 'Em Repouso / Operação Normal',
          desc: 'Reator operando em fluxo direto normal de adsorção.',
          cor: 'text-slate-400',
        };
    }
  };

  const faseInfo = getFaseDescricao(retrolavagem.faseAtual);

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel com Status e Alertas de Colmatagem */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        retrolavagem.emAndamento
          ? 'bg-amber-950/40 border-amber-500 animate-pulse'
          : retrolavagem.bypassAtivo
            ? 'bg-purple-950/40 border-purple-500'
            : hardwareState.foulingDetectado
              ? 'bg-red-950/40 border-red-500'
              : 'bg-[#151b2b] border-[#1e293b]'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl border ${
            retrolavagem.emAndamento
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
              : retrolavagem.bypassAtivo
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
          }`}>
            <RotateCcw className={`w-7 h-7 ${retrolavagem.emAndamento ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                Sistema de Retrolavagem Hidrodinâmica & Válvulas de Bypass
              </h2>
              {retrolavagem.emAndamento ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-black animate-pulse">
                  CICLO EM ANDAMENTO ({retrolavagem.tempoRestanteSegundos}s)
                </span>
              ) : retrolavagem.bypassAtivo ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500 text-white animate-pulse">
                  BYPASS ATIVO (REATOR ISOLADO)
                </span>
              ) : hardwareState.foulingDetectado ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-600 text-white animate-bounce">
                  ALERTA: FOULING DETECTADO
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  REATOR EM LINHA (NORMAL)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Desobstrução física de canais de fluxo no feltro de grafite e malha Ti/Ru-Ir. Prevenção de sobrepressão (&le; 3.0 bar).
            </p>
          </div>
        </div>

        {/* Botões Rápidos de Ação Primária */}
        <div className="flex items-center gap-2.5">
          {!retrolavagem.emAndamento ? (
            <button
              onClick={() => onIniciarRetrolavagem(duracaoSelecionada)}
              disabled={hardwareState.interlockDisparado}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Disparar Retrolavagem ({duracaoSelecionada}s)
            </button>
          ) : (
            <button
              onClick={onCancelarRetrolavagem}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              Cancelar Retrolavagem
            </button>
          )}

          <button
            onClick={() => onSetBypass(!retrolavagem.bypassAtivo)}
            className={`px-4 py-2 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition border ${
              retrolavagem.bypassAtivo
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
                : 'bg-[#1e293b] hover:bg-[#283548] text-slate-200 border-slate-700'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            {retrolavagem.bypassAtivo ? 'Fechar Bypass (Voltar Reator)' : 'Abrir Bypass de Emergência'}
          </button>
        </div>
      </div>

      {/* 2. Barra de Progresso e Fases do Ciclo de Retrolavagem (quando ativo) */}
      {retrolavagem.emAndamento && (
        <div className="p-5 rounded-xl bg-[#151b2b] border border-amber-500/50 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
              <h3 className={`text-sm font-bold ${faseInfo.cor}`}>{faseInfo.titulo}</h3>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              Tempo Restante: <span className="text-amber-400 text-base">{retrolavagem.tempoRestanteSegundos}s</span> / {retrolavagem.duracaoTotalSegundos}s
            </div>
          </div>

          <div className="w-full bg-[#0a0e17] rounded-full h-3.5 p-0.5 border border-slate-700 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-linear shadow-lg"
              style={{ width: `${pctProgresso}%` }}
            ></div>
          </div>

          <p className="text-xs text-slate-300 italic">{faseInfo.desc}</p>

          <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] font-mono">
            <div className={`p-2 rounded border text-center ${
              retrolavagem.faseAtual === 'DESPOLARIZACAO'
                ? 'bg-amber-950/60 border-amber-400 text-amber-200 font-bold'
                : 'bg-[#0a0e17] border-slate-800 text-slate-500'
            }`}>
              1. Despolarização (0V)
            </div>
            <div className={`p-2 rounded border text-center ${
              retrolavagem.faseAtual === 'LAVAGEM_REVERSA'
                ? 'bg-sky-950/60 border-sky-400 text-sky-200 font-bold'
                : 'bg-[#0a0e17] border-slate-800 text-slate-500'
            }`}>
              2. Contracorrente + Air Scour
            </div>
            <div className={`p-2 rounded border text-center ${
              retrolavagem.faseAtual === 'ENXAGUE'
                ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 font-bold'
                : 'bg-[#0a0e17] border-slate-800 text-slate-500'
            }`}>
              3. Enxágue & Assentamento
            </div>
          </div>
        </div>
      )}

      {/* 3. Diagrama Esquemático de Tubulação e Válvulas Solenoides P&ID */}
      <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Sinóptico de Válvulas Motorizadas & Solenoides (P&ID)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Clique no botão de qualquer válvula para forçar comutação manual
          </span>
        </div>

        {/* Grade com as 5 Válvulas do Sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* XV-101: Retrolavagem */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
            retrolavagem.valvulas.xv101Retrolavagem
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
              : 'bg-[#0e1320] border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">XV-101</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  retrolavagem.valvulas.xv101Retrolavagem
                    ? 'bg-emerald-500 text-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {retrolavagem.valvulas.xv101Retrolavagem ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Injeção de Retrolavagem</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Água de contracorrente para poros do ânodo</p>
            </div>
            <button
              onClick={() => onToggleValvula('xv101Retrolavagem')}
              className="mt-3 w-full py-1.5 px-2 bg-[#1e293b] hover:bg-[#2b3952] text-xs font-mono font-bold text-white rounded border border-slate-700 transition"
            >
              Comutar XV-101
            </button>
          </div>

          {/* XV-102: Alimentação Principal */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
            retrolavagem.valvulas.xv102Alimentacao
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
              : 'bg-[#0e1320] border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">XV-102</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  retrolavagem.valvulas.xv102Alimentacao
                    ? 'bg-emerald-500 text-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {retrolavagem.valvulas.xv102Alimentacao ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Alimentação Principal</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Entrada de água bruta no rack 10 células</p>
            </div>
            <button
              onClick={() => onToggleValvula('xv102Alimentacao')}
              className="mt-3 w-full py-1.5 px-2 bg-[#1e293b] hover:bg-[#2b3952] text-xs font-mono font-bold text-white rounded border border-slate-700 transition"
            >
              Comutar XV-102
            </button>
          </div>

          {/* XV-103: Dreno de Descarte */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
            retrolavagem.valvulas.xv103Descarte
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
              : 'bg-[#0e1320] border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">XV-103</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  retrolavagem.valvulas.xv103Descarte
                    ? 'bg-emerald-500 text-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {retrolavagem.valvulas.xv103Descarte ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Dreno de Rejeito / Lodo</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Descarga de efluente sujo da retrolavagem</p>
            </div>
            <button
              onClick={() => onToggleValvula('xv103Descarte')}
              className="mt-3 w-full py-1.5 px-2 bg-[#1e293b] hover:bg-[#2b3952] text-xs font-mono font-bold text-white rounded border border-slate-700 transition"
            >
              Comutar XV-103
            </button>
          </div>

          {/* XV-104: Válvula de Bypass */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
            retrolavagem.valvulas.xv104Bypass
              ? 'bg-purple-950/40 border-purple-500 text-purple-200'
              : 'bg-[#0e1320] border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">XV-104</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  retrolavagem.valvulas.xv104Bypass
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {retrolavagem.valvulas.xv104Bypass ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Bypass de Emergência</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Desvio externo sem passar pelo reator</p>
            </div>
            <button
              onClick={() => onToggleValvula('xv104Bypass')}
              className="mt-3 w-full py-1.5 px-2 bg-[#1e293b] hover:bg-[#2b3952] text-xs font-mono font-bold text-white rounded border border-slate-700 transition"
            >
              Comutar XV-104
            </button>
          </div>

          {/* XV-105: Air Scour */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
            retrolavagem.valvulas.xv105AirScour
              ? 'bg-sky-950/40 border-sky-500 text-sky-200'
              : 'bg-[#0e1320] border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">XV-105</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  retrolavagem.valvulas.xv105AirScour
                    ? 'bg-sky-500 text-black'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {retrolavagem.valvulas.xv105AirScour ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Air Scour (Ar Comprimido)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Agitação por borbulhamento nos feltros</p>
            </div>
            <button
              onClick={() => onToggleValvula('xv105AirScour')}
              className="mt-3 w-full py-1.5 px-2 bg-[#1e293b] hover:bg-[#2b3952] text-xs font-mono font-bold text-white rounded border border-slate-700 transition"
            >
              Comutar XV-105
            </button>
          </div>
        </div>
      </div>

      {/* 4. Métricas de Eficácia e Configuração de Automação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Indicadores de Recuperação de Permeabilidade */}
        <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-3">
          <div className="flex items-center gap-2 text-sky-400">
            <Gauge className="w-5 h-5" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Eficiência da Matriz Filtrante</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#0a0e17] p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Recuperação Permeab.</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {retrolavagem.recuperacaoPermeabilidadePct}%
              </span>
            </div>
            <div className="bg-[#0a0e17] p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Ciclos Realizados</span>
              <span className="text-xl font-bold font-mono text-white">
                {retrolavagem.totalCiclosExecutados}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 space-y-1 pt-1">
            <div className="flex justify-between">
              <span>Pressão Atual no Skid:</span>
              <span className="font-mono text-white font-bold">{sensorData.pressaoBar.toFixed(2)} bar</span>
            </div>
            <div className="flex justify-between">
              <span>Status do Feltro de Grafite:</span>
              <span className={`font-bold ${hardwareState.foulingDetectado ? 'text-red-400' : 'text-emerald-400'}`}>
                {hardwareState.foulingDetectado ? 'Colmatado (Requer Lavagem)' : 'Poros Desobstruídos'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Configuração de Disparo Manual */}
        <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-5 h-5" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tempo de Ciclo Manual</h4>
          </div>
          <p className="text-xs text-slate-400">
            Selecione a duração ideal de lavagem conforme o grau de incrustação mineral:
          </p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[30, 45, 60, 90].map((seg) => (
              <button
                key={seg}
                onClick={() => setDuracaoSelecionada(seg)}
                className={`py-2 px-2 text-xs font-mono font-bold rounded-lg border transition ${
                  duracaoSelecionada === seg
                    ? 'bg-amber-500 text-black border-amber-400 shadow-md font-extrabold'
                    : 'bg-[#0a0e17] text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {seg}s {seg === 45 ? '(Padrão)' : ''}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            * 45s é o tempo estequiométrico otimizado para não desperdiçar água de lavagem.
          </p>
        </div>

        {/* Card 3: Automação Inteligente por Diferencial de Pressão */}
        <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Gatilho Automático</h4>
            </div>
            <button
              onClick={() => onConfigurarAuto({ modoAuto: !retrolavagem.modoAuto })}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-full border transition ${
                retrolavagem.modoAuto
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-slate-900 text-slate-500 border-slate-700'
              }`}
            >
              {retrolavagem.modoAuto ? 'AUTO ATIVADO' : 'AUTO DESATIVADO'}
            </button>
          </div>
          <div className="text-xs text-slate-300 space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span>Pressão Limite de Gatilho:</span>
              <span className="font-mono font-bold text-amber-400">&ge; {retrolavagem.pressaoGatilhoAutoBar.toFixed(2)} bar</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Intervalo Máximo Programado:</span>
              <span className="font-mono font-bold text-slate-200">A cada {retrolavagem.intervaloHorasAuto} horas</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Auto-Bypass por Sobrepressão:</span>
              <span className="font-mono font-bold text-emerald-400">Habilitado (&gt; 2.85 bar)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Histórico e Trilha de Auditoria dos Últimos Ciclos de Retrolavagem */}
      <div className="p-5 rounded-xl bg-[#151b2b] border border-[#1e293b] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Histórico Operacional de Ciclos de Retrolavagem & Desobstrução
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Total registrado: {retrolavagem.historicoCiclos.length} eventos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0a0e17] text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">ID Ciclo</th>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3">Motivo do Disparo</th>
                <th className="py-2.5 px-3">Pressão Pré &rarr; Pós</th>
                <th className="py-2.5 px-3">Operador / Origem</th>
                <th className="py-2.5 px-3 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {retrolavagem.historicoCiclos.map((ciclo) => (
                <tr key={ciclo.id} className="hover:bg-[#1a2236] transition">
                  <td className="py-2.5 px-3 font-bold text-white">{ciclo.id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{ciclo.timestamp}</td>
                  <td className="py-2.5 px-3 text-amber-400">{ciclo.duracaoS}s</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {ciclo.motivo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-red-400 font-bold">{ciclo.pressaoAntesBar.toFixed(2)}</span>
                    <span className="text-slate-500 mx-1">&rarr;</span>
                    <span className="text-emerald-400 font-bold">{ciclo.pressaoDepoisBar.toFixed(2)} bar</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{ciclo.operador}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Concluído
                    </span>
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
