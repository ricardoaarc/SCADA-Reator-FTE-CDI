/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Activity, 
  Layers, 
  RotateCw, 
  Gauge, 
  Volume2, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  Pause, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  MoveRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  Flame,
  Radio,
  Share2
} from 'lucide-react';
import { PurifyWaveState, BombaBiossonicaPosicao, BombaBiossonicaState } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';

interface BiosonicPumpPanelProps {
  onClose?: () => void;
}

export const BiosonicPumpPanel: React.FC<BiosonicPumpPanelProps> = ({ onClose }) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const bio = pwState.biossonica;

  const [rotacaoInput, setRotacaoInput] = useState<number>(bio.rotacaoRpm);
  const [freqInput, setFreqInput] = useState<number>(bio.frequenciaUltrassonicaKhz);
  const [vazaoInput, setVazaoInput] = useState<number>(bio.vazaoProcessadaM3h);
  const [pressaoInInput, setPressaoInInput] = useState<number>(bio.pressaoEntradaBar);
  const [pressaoOutInput, setPressaoOutInput] = useState<number>(bio.pressaoSaidaBar);

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });
    return unsub;
  }, []);

  const handleAplicarParametros = () => {
    purifyWaveService.ajustarBiossonica(Number(rotacaoInput), Number(freqInput));
    purifyWaveService.ajustarHidraulicaBiossonica(
      Number(vazaoInput), 
      Number(pressaoInInput), 
      Number(pressaoOutInput)
    );
  };

  const handleMudarPosicao = (pos: BombaBiossonicaPosicao) => {
    purifyWaveService.trocarPosicaoBiossonica(pos);
  };

  const handleAlternarEstado = () => {
    purifyWaveService.alternarBiossonica();
  };

  const handleAlternarModo = () => {
    purifyWaveService.alternarModoBiossonica();
  };

  const posicoesDisponiveis: { 
    id: BombaBiossonicaPosicao; 
    nome: string; 
    slot: string; 
    descricao: string; 
    beneficio: string;
    cor: string;
  }[] = [
    {
      id: 'POS_1_PRIMARIO_ENTRADA',
      nome: '1. Tratamento Primário (Entrada T-100)',
      slot: 'Entrada Bruta ➔ Reator PuriFyWave',
      descricao: 'Desaglomeração mecânica profunda, quebra de micelas de óleos/graxas e cisalhamento de sólidos suspensos.',
      beneficio: 'Aumenta a área de contato dos reagentes CONTHEC em até 340%.',
      cor: 'amber'
    },
    {
      id: 'POS_2_INTERMEDIARIO_POA',
      nome: '2. Tratamento Intermediário (Pós-POA)',
      slot: 'Reator CONTHEC ➔ Bomba P-101 / FTE-CDI',
      descricao: 'Homogeneização radicalar em alta frequência e clivagem final de compostos orgânicos refratários.',
      beneficio: 'Amplifica a produção de radicais livres hidroxila (•OH) e sulfato (SO₄•⁻).',
      cor: 'indigo'
    },
    {
      id: 'POS_3_RETROLAVAGEM_UGL',
      nome: '3. Circuito ZLD (Retrolavagem ➔ UGL)',
      slot: 'Linha XV-103 ➔ Prensa Desaguadora',
      descricao: 'Lise celular de lodo biológico, descolamento de biofilmes minerais e condicionamento acústico.',
      beneficio: 'Acelera a imobilização de fluorossilicatos (SiF₆²⁻) e reduz a umidade da torta.',
      cor: 'rose'
    },
    {
      id: 'POS_4_POLIMENTO_TERMINAL',
      nome: '4. Polimento Terminal (Saída Potável T-201)',
      slot: 'Saída FTE-CDI ➔ Reservatório Final',
      descricao: 'Esterilização física terminal por cavitação acústica sem adição de químicos residuais.',
      beneficio: 'Garante barreira física adicional (100% esterilização microbiológica).',
      cor: 'emerald'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Card Principal de Monitoramento da Bomba Biossônica */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <span className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400">
              <Zap className={`w-8 h-8 ${bio.ativa ? 'animate-pulse text-purple-300' : 'text-slate-500'}`} />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white font-display">
                  BOMBA BIOSSÔNICA INDUSTRIAL — BBS-100
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                  bio.ativa 
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {bio.ativa ? '● CAVITAÇÃO ATIVA' : '○ STANDBY'}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  {bio.modoOperacao}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Reator de Cavitação Hidrodinâmica & Acústica Integrada (1.200 a 3.600 RPM | 20.0 a 40.0 kHz | Vazão até 180 m³/h).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAlternarModo}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              Modo: {bio.modoOperacao === 'AUTOMATICO_ADAPTATIVO' ? 'Automático' : 'Manual'}
            </button>

            <button
              onClick={handleAlternarEstado}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                bio.ativa 
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40' 
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {bio.ativa ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {bio.ativa ? 'Desativar BBS-100' : 'Acionar BBS-100'}
            </button>
          </div>
        </div>

        {/* 2. KPIs de Telemetria Dinâmica da Bomba Biossônica */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
          {/* Rotação RPM */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-purple-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Velocidade Rotor</span>
              <RotateCw className={`w-3 h-3 text-purple-400 ${bio.ativa ? 'animate-spin' : ''}`} />
            </div>
            <div className="text-xl font-bold text-purple-300 font-mono">
              {bio.rotacaoRpm} <span className="text-xs text-purple-400/70">RPM</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Hidrodinâmica</div>
          </div>

          {/* Frequência Ultrassônica */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-pink-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Ultrassom Acústico</span>
              <Radio className="w-3 h-3 text-pink-400" />
            </div>
            <div className="text-xl font-bold text-pink-300 font-mono">
              {bio.frequenciaUltrassonicaKhz.toFixed(1)} <span className="text-xs text-pink-400/70">kHz</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Piezoelétrico</div>
          </div>

          {/* Intensidade de Cavitação */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Índice Cavitação</span>
              <Gauge className="w-3 h-3 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-indigo-300 font-mono">
              {bio.intensidadeCavitacaoPct}%
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">Ótimo Operacional</div>
          </div>

          {/* Pressão Diferencial (Delta P) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-sky-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Pressão Diferencial</span>
              <Activity className="w-3 h-3 text-sky-400" />
            </div>
            <div className="text-xl font-bold text-sky-300 font-mono">
              ΔP {bio.deltaPBar} <span className="text-xs text-sky-400/70">bar</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{bio.pressaoEntradaBar}b ➔ {bio.pressaoSaidaBar}b</div>
          </div>

          {/* Eficiência de Lise Celular */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Lise Celular / Biofilme</span>
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {bio.eficienciaLiseCelularPct}%
            </div>
            <div className="text-[10px] text-emerald-300 mt-1">Ruptura Física</div>
          </div>

          {/* Temperatura & Potência */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-mono mb-1">
              <span>Temp / Potência</span>
              <Cpu className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-200 font-mono">
              {bio.temperaturaCamaraC}°C | {bio.potenciaAcusticaKw}kW
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Horímetro: {bio.horimetroHoras.toFixed(1)}h</div>
          </div>
        </div>
      </div>

      {/* 3. Seletor de Topologias Inteligentes: 4 Posições de Encaixe no Processo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
              <Share2 className="w-5 h-5 text-purple-400" />
              Slots de Topologia de Processo (Reordenação Flexível em 1 Clique)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha a posição em que a Bomba Biossônica atuará no trem de tratamento. O P&ID e o barramento do Supabase se adaptam em tempo real.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-purple-300 px-3 py-1 rounded-lg bg-purple-950/50 border border-purple-500/30">
            Posição Atual: {bio.posicaoAtual}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {posicoesDisponiveis.map((p) => {
            const isSelected = bio.posicaoAtual === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handleMudarPosicao(p.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                      SLOT {p.nome.slice(0, 2)}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-purple-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> ATIVO
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{p.nome}</h4>
                  <div className="text-[11px] font-mono text-purple-300/80 mb-2">{p.slot}</div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-3">{p.descricao}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-medium">
                  ✓ {p.beneficio}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Painel de Controle de Precisão: Sliders de Cavitação, Rotação e Hidráulica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 1: Controle de Cavitação (RPM e Frequência kHz) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Controle de Cavitação Acústica & Hidrodinâmica
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono font-semibold border border-purple-500/20">
              VFD + Inversor Piezo
            </span>
          </div>

          {/* Slider de Rotação RPM */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                Velocidade do Rotor Cavitacional:
              </span>
              <span className="font-mono font-bold text-purple-300 text-sm">{rotacaoInput} RPM</span>
            </div>
            <input
              type="range"
              min="1200"
              max="3600"
              step="50"
              value={rotacaoInput}
              onChange={(e) => setRotacaoInput(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1.200 RPM (Baixa)</span>
              <span>2.850 RPM (Nominal)</span>
              <span>3.600 RPM (Máx Cavitação)</span>
            </div>
          </div>

          {/* Slider de Frequência Ultrassônica kHz */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-pink-400" />
                Frequência de Ressonância Acústica:
              </span>
              <span className="font-mono font-bold text-pink-300 text-sm">{Number(freqInput).toFixed(1)} kHz</span>
            </div>
            <input
              type="range"
              min="20.0"
              max="40.0"
              step="0.5"
              value={freqInput}
              onChange={(e) => setFreqInput(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>20.0 kHz (Ondas Longas)</span>
              <span>28.5 kHz (Padrão Lise)</span>
              <span>40.0 kHz (Micro-Jatos)</span>
            </div>
          </div>

          <button
            onClick={handleAplicarParametros}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Aplicar Parâmetros de Cavitação na BBS-100
          </button>
        </div>

        {/* Bloco 2: Controle Hidráulico e Pressão Diferencial */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Balanço Hidráulico & Pressões de Linha
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono font-semibold border border-sky-500/20">
              DN200 PN10
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Pressão de Entrada */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Pressão de Sucção (P_in):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="4.0"
                  value={pressaoInInput}
                  onChange={(e) => setPressaoInInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-sky-300 focus:outline-none focus:border-sky-500"
                />
                <span className="text-xs text-slate-400 font-mono">bar</span>
              </div>
            </div>

            {/* Pressão de Saída */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Pressão de Descarga (P_out):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="6.0"
                  value={pressaoOutInput}
                  onChange={(e) => setPressaoOutInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-slate-400 font-mono">bar</span>
              </div>
            </div>
          </div>

          {/* Vazão Processada */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Vazão Hidráulica Passante:</span>
              <span className="font-mono font-bold text-sky-300 text-sm">{vazaoInput} m³/h</span>
            </div>
            <input
              type="range"
              min="30"
              max="200"
              step="5"
              value={vazaoInput}
              onChange={(e) => setVazaoInput(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>30 m³/h</span>
              <span>180 m³/h (Nominal)</span>
              <span>200 m³/h</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-500/20 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Pressão Diferencial Resultante:</span>
            <span className="text-sky-300 font-bold">ΔP = {(pressaoOutInput - pressaoInInput).toFixed(2)} bar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
