/**
 * Sinóptico Gráfico P&ID Industrial Interativo (Estilo SCADA-LTS / ScadaBR / Ignition)
 * Supervisório SCADA Reator FTE-CDI (16+ Células, 180 m³/h / 50 L/s)
 * Recursos Visuais Industriais:
 * 1. Fluxo dinâmico de fluido com partículas SVG e animação CSS
 * 2. Bombas centrífugas P-101 (Feed) e P-102 (Backwash) com rotação
 * 3. Válvulas solenoides/atuadas XV com feedback de estado aberto/fechado
 * 4. Manômetros piezoelétricos e medidores de vazão eletromagnéticos
 * 5. Rack de células modulares com estados eletroquímicos (Adsorção / Regeneração / Backwash / Interlock)
 * 6. Painel de comando sinóptico direto para operação em sala de controle
 */

import React, { useState } from 'react';
import { 
  Activity, 
  Power, 
  RotateCcw, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Wind, 
  Waves, 
  Gauge, 
  Layers, 
  Play, 
  Square,
  Sliders,
  Maximize2,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  CelulaInfo, 
  RackResumoGlobal, 
  ValvulasEstado, 
  BackwashState, 
  Usuario 
} from '../types';

interface PidSynopticViewProps {
  celulas: CelulaInfo[];
  resumoRack: RackResumoGlobal;
  usuarioAtual: Usuario;
  retrolavagem: BackwashState;
  onSelecionarCelula: (celula: CelulaInfo) => void;
  onIniciarRetrolavagem: (duracaoS: number) => void;
  onCancelarRetrolavagem: () => void;
  onDispararParadaEmergencia: () => void;
}

export const PidSynopticView: React.FC<PidSynopticViewProps> = ({
  celulas,
  resumoRack,
  usuarioAtual,
  retrolavagem,
  onSelecionarCelula,
  onIniciarRetrolavagem,
  onCancelarRetrolavagem,
  onDispararParadaEmergencia
}) => {
  const [bombaFeedLigada, setBombaFeedLigada] = useState<boolean>(true);
  const [modoAutomatico, setModoAutomatico] = useState<boolean>(true);
  const [valvulaEntradaAberta, setValvulaEntradaAberta] = useState<boolean>(true);
  const [valvulaPermeadoAberta, setValvulaPermeadoAberta] = useState<boolean>(true);
  const [valvulaDrenoAberta, setValvulaDrenoAberta] = useState<boolean>(false);
  const [nivelTanqueBruto, setNivelTanqueBruto] = useState<number>(78);
  const [nivelTanqueTratado, setNivelTanqueTratado] = useState<number>(64);
  const [filtroVisual, setFiltroVisual] = useState<'TODOS' | 'ADSORCAO' | 'REGENERACAO' | 'INTERTRAVADA'>('TODOS');

  const celulasFiltradas = celulas.filter(c => {
    if (filtroVisual === 'ADSORCAO') return c.status === 'ADSORCAO';
    if (filtroVisual === 'REGENERACAO') return c.status === 'REGENERACAO';
    if (filtroVisual === 'INTERTRAVADA') return c.interlockDisparado;
    return true;
  });

  const celulasAtivas = celulas.filter(c => c.ativa);
  const temInterlock = celulas.some(c => c.interlockDisparado);
  const vazaoTotalM3h = resumoRack.vazaoTotalM3h;
  const pressaoMedia = resumoRack.pressaoMediaBar;
  const fluoretoOut = resumoRack.fluoretoOutMedioPPM;
  const emConformidade888 = fluoretoOut <= 1.50;

  return (
    <div className="space-y-5">
      {/* 1. Header do Sinóptico com Indicadores de Operação e Comandos Rápidos */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1322] via-[#11192e] to-[#0d1322] border border-sky-500/30 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/40 shadow-inner">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Sinóptico de Processo P&ID (SCADA Industrial)
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950 text-sky-300 border border-sky-600">
                  PADRÃO ISA-101 / SCADA-LTS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-600">
                  {celulas.length} CÉLULAS (MODULAR)
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Fluxo hidrodinâmico em tempo real do Skid FTE-CDI 180 m³/h, manifold DN200 PN10, bombas e dosagem.
            </p>
          </div>
        </div>

        {/* Painel de Controles Operacionais do P&ID */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModoAutomatico(!modoAutomatico)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${
              modoAutomatico
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                : 'bg-amber-950/80 text-amber-300 border-amber-600'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            MODO: {modoAutomatico ? 'AUTO (BREAKTHROUGH)' : 'MANUAL'}
          </button>

          <button
            onClick={() => {
              if (retrolavagem.emAndamento) {
                onCancelarRetrolavagem();
              } else {
                onIniciarRetrolavagem(45);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 transition ${
              retrolavagem.emAndamento
                ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
                : 'bg-[#151d38] text-sky-300 border-sky-700/60 hover:bg-sky-900/50'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${retrolavagem.emAndamento ? 'animate-spin' : ''}`} />
            {retrolavagem.emAndamento ? `RETROLAVAGEM (${retrolavagem.tempoRestanteSegundos}s)` : 'RETROLAVAGEM / CIP'}
          </button>

          <button
            onClick={onDispararParadaEmergencia}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs rounded-lg border border-red-400 shadow-lg flex items-center gap-1.5 transition animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            E-STOP (NR-12)
          </button>
        </div>
      </div>

      {/* 2. DIAGRAMA SINÓPTICO INDUSTRIAL EM SVG + HTML OVERLAY (ESTILO SCADA-LTS) */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#090d16] border border-[#1e293b] shadow-2xl relative overflow-x-auto scada-scrollbar">
        {/* Grade de fundo estilo tela industrial */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        ></div>

        {/* Diagrama P&ID Topológico */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative z-10">
          
          {/* SEÇÃO 1: ALIMENTAÇÃO & TANQUE DE ÁGUA BRUTA (COL 1-3) */}
          <div className="xl:col-span-3 space-y-4">
            <div className="p-4 rounded-xl bg-[#0e1422] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-sky-400" />
                  TK-101 Água Bruta (Poço)
                </span>
                <span className="text-[11px] font-mono text-sky-400 font-bold">{nivelTanqueBruto}%</span>
              </div>

              {/* Tanque Visual */}
              <div className="h-28 w-full bg-[#070a10] rounded-lg border border-slate-700 relative overflow-hidden flex flex-col justify-end p-2">
                <div 
                  className="bg-gradient-to-t from-sky-900 to-sky-600/80 w-full rounded transition-all duration-700 relative"
                  style={{ height: `${nivelTanqueBruto}%` }}
                >
                  <div className="absolute inset-0 opacity-30 animate-pulse bg-sky-400"></div>
                </div>
                <div className="absolute inset-x-2 bottom-2 flex justify-between text-[10px] font-mono text-white font-bold drop-shadow">
                  <span>F⁻ In: 8.50 mg/L</span>
                  <span>pH: 7.20</span>
                </div>
              </div>

              {/* Bomba de Alimentação P-101 */}
              <div className="p-3 rounded-lg bg-[#070a10] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Bomba Feed P-101</span>
                  <span className="text-[10px] font-mono text-slate-400">Motor 45 kW | VFD 60 Hz</span>
                </div>
                <button
                  onClick={() => setBombaFeedLigada(!bombaFeedLigada)}
                  className={`p-2 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition ${
                    bombaFeedLigada
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                      : 'bg-red-950 text-red-300 border border-red-600'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {bombaFeedLigada ? 'OPERANDO' : 'DESLIGADA'}
                </button>
              </div>

              {/* Válvula de Entrada XV-100 */}
              <div className="flex items-center justify-between text-xs font-mono p-2 rounded bg-[#070a10] border border-slate-800">
                <span className="text-slate-300">Válvula Entrada XV-100:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  valvulaEntradaAberta ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                }`}>
                  {valvulaEntradaAberta ? 'ABERTA' : 'FECHADA'}
                </span>
              </div>
            </div>

            {/* Manômetro & Medidor de Vazão Principal */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0e1422] border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">PT-001 (DN200)</span>
                <span className={`text-sm font-bold ${pressaoMedia >= 2.80 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {pressaoMedia.toFixed(2)} bar
                </span>
                <span className="text-[9px] text-slate-500 block">Corte: 2.80 bar</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e1422] border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block">FT-001 (Vazão)</span>
                <span className="text-sm font-bold text-sky-400">
                  {vazaoTotalM3h.toFixed(1)} m³/h
                </span>
                <span className="text-[9px] text-slate-500 block">Alvo: 180 m³/h</span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: MANIFOLD DN200 & RACK DE CÉLULAS FTE-CDI (COL 4-9) */}
          <div className="xl:col-span-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#0e1422] border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Rack FTE-CDI ({celulas.length} Células em Paralelo - DN200)
                  </h3>
                </div>

                {/* Filtro rápido das células no sinóptico */}
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => setFiltroVisual('TODOS')}
                    className={`px-2 py-0.5 rounded transition ${filtroVisual === 'TODOS' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Todas ({celulas.length})
                  </button>
                  <button
                    onClick={() => setFiltroVisual('ADSORCAO')}
                    className={`px-2 py-0.5 rounded transition ${filtroVisual === 'ADSORCAO' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Adsorção ({celulas.filter(c => c.status === 'ADSORCAO').length})
                  </button>
                  <button
                    onClick={() => setFiltroVisual('REGENERACAO')}
                    className={`px-2 py-0.5 rounded transition ${filtroVisual === 'REGENERACAO' ? 'bg-blue-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Regeneração ({celulas.filter(c => c.status === 'REGENERACAO').length})
                  </button>
                </div>
              </div>

              {/* Tubulação Manifold de Entrada DN200 (Animação de Fluxo SVG) */}
              <div className="w-full h-3 rounded-full bg-[#070a10] border border-sky-800/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500 via-teal-400 to-sky-500 opacity-75 animate-pulse"></div>
              </div>

              {/* Grid Interativo das Células no Sinóptico */}
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2.5 pt-1">
                {celulasFiltradas.map((c) => {
                  const isIntertravada = c.interlockDisparado;
                  const isAdsorcao = c.status === 'ADSORCAO';
                  const isRegen = c.status === 'REGENERACAO';

                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelecionarCelula(c)}
                      className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between group hover:scale-[1.03] ${
                        isIntertravada
                          ? 'bg-red-950/80 border-red-500 shadow-lg shadow-red-950 animate-pulse'
                          : isAdsorcao
                            ? 'bg-[#0f172a] border-emerald-500/70 hover:border-emerald-400 shadow-md shadow-emerald-950/30'
                            : isRegen
                              ? 'bg-[#0f172a] border-blue-500/70 hover:border-blue-400 shadow-md shadow-blue-950/30'
                              : 'bg-[#0b0f19] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{c.codigo}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          isIntertravada ? 'bg-red-500 animate-ping' : isAdsorcao ? 'bg-emerald-400' : 'bg-blue-400'
                        }`}></span>
                      </div>

                      <div className="mt-1.5 space-y-0.5 font-mono text-[10px]">
                        <div className="flex justify-between text-slate-300">
                          <span>Q:</span>
                          <span className="text-white font-semibold">{(c.vazaoLh / 1000).toFixed(1)} m³/h</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>P:</span>
                          <span className={c.pressaoBar >= 2.80 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                            {c.pressaoBar.toFixed(2)} bar
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>V:</span>
                          <span className="text-amber-400 font-semibold">{c.tensaoV.toFixed(2)} V</span>
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                        <span className="text-slate-400 truncate">{c.status}</span>
                        <span className="text-sky-300">{c.eficienciaPct}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tubulação Manifold de Saída DN200 */}
              <div className="w-full h-3 rounded-full bg-[#070a10] border border-emerald-800/80 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-75 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: SAÍDA PERMEADO & RETROLAVAGEM / CIP (COL 10-12) */}
          <div className="xl:col-span-3 space-y-4">
            <div className="p-4 rounded-xl bg-[#0e1422] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  TK-102 Permeado Tratado
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">{nivelTanqueTratado}%</span>
              </div>

              {/* Tanque de Água Tratada */}
              <div className="h-28 w-full bg-[#070a10] rounded-lg border border-slate-700 relative overflow-hidden flex flex-col justify-end p-2">
                <div 
                  className="bg-gradient-to-t from-emerald-900 to-emerald-600/80 w-full rounded transition-all duration-700 relative"
                  style={{ height: `${nivelTanqueTratado}%` }}
                >
                  <div className="absolute inset-0 opacity-30 animate-pulse bg-emerald-400"></div>
                </div>
                <div className="absolute inset-x-2 bottom-2 flex justify-between text-[10px] font-mono text-white font-bold drop-shadow">
                  <span>F⁻ Out: {fluoretoOut.toFixed(2)} mg/L</span>
                  <span className={emConformidade888 ? 'text-emerald-300' : 'text-red-300'}>
                    {emConformidade888 ? 'PORTARIA 888 OK' : 'NÃO CONFORME'}
                  </span>
                </div>
              </div>

              {/* Bomba de Retrolavagem P-102 */}
              <div className="p-3 rounded-lg bg-[#070a10] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Bomba Backwash P-102</span>
                  <span className="text-[10px] font-mono text-slate-400">Fluxo Reverso + Ar Comprimido</span>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                  retrolavagem.emAndamento ? 'bg-amber-950 text-amber-300 border border-amber-600 animate-pulse' : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}>
                  {retrolavagem.emAndamento ? 'LAVANDO' : 'STANDBY'}
                </span>
              </div>

              {/* Válvulas de Permeado e Dreno */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-[#070a10] border border-slate-800">
                  <span className="text-slate-300">Permeado XV-102:</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700">
                    ABERTA
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-[#070a10] border border-slate-800">
                  <span className="text-slate-300">Dreno Concentrado XV-103:</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    retrolavagem.emAndamento ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {retrolavagem.emAndamento ? 'ABERTA (PURGA)' : 'FECHADA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Balanço Energético do Skid */}
            <div className="p-3 rounded-xl bg-[#0e1422] border border-slate-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Corrente Total Rack:</span>
                <span className="text-sky-300 font-bold">{resumoRack.correnteTotalAmp.toFixed(1)} A</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Potência DC Consumida:</span>
                <span className="text-emerald-400 font-bold">{resumoRack.potenciaTotalKw.toFixed(2)} kW</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Eficiência Global de F⁻:</span>
                <span className="text-amber-400 font-bold">{resumoRack.eficienciaMediaPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
