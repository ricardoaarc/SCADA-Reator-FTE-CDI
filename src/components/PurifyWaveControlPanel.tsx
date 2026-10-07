/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Droplets, 
  Zap, 
  Activity, 
  Layers, 
  ShieldCheck, 
  Play, 
  Pause, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  FileText,
  AlertOctagon,
  CheckCircle2,
  Beaker,
  Pipette,
  Recycle,
  Gauge
} from 'lucide-react';
import { PurifyWaveState, EstagioSinfoniaQuimica } from '../types';
import { purifyWaveService } from '../services/purifywaveIntegrationService';
import { BiosonicPumpPanel } from './BiosonicPumpPanel';

interface PurifyWaveControlPanelProps {
  onOpenDualReportModal: () => void;
}

export const PurifyWaveControlPanel: React.FC<PurifyWaveControlPanelProps> = ({
  onOpenDualReportModal,
}) => {
  const [pwState, setPwState] = useState<PurifyWaveState>(purifyWaveService.state);
  const [dosagemA, setDosagemA] = useState(pwState.skidConthec.componenteA.vazaoDosagemMLh);
  const [dosagemB, setDosagemB] = useState(pwState.skidConthec.componenteB.vazaoDosagemMLh);
  const [dosagemC, setDosagemC] = useState(pwState.skidConthec.componenteC.vazaoDosagemMLh);
  const [vazaoDiluicao, setVazaoDiluicao] = useState(pwState.skidConthec.injetorDiluicao4.vazaoAguaDiluicaoLh);
  const [concentracaoAtiva, setConcentracaoAtiva] = useState(pwState.skidConthec.injetorDiluicao4.concentracaoFinalPpm);

  useEffect(() => {
    const unsub = purifyWaveService.subscribe((novoState) => {
      setPwState(novoState);
    });
    return unsub;
  }, []);

  const skid = pwState.skidConthec;

  const handleAplicarDosadorasConthec = () => {
    purifyWaveService.ajustarDosadoraConthec('A', Number(dosagemA));
    purifyWaveService.ajustarDosadoraConthec('B', Number(dosagemB));
    purifyWaveService.ajustarDosadoraConthec('C', Number(dosagemC));
    purifyWaveService.ajustarInjetorDiluicao(Number(vazaoDiluicao), Number(concentracaoAtiva));
  };

  const handleReabastecer = () => {
    purifyWaveService.reabastecerFrascosConthec();
  };

  const estagios: { id: EstagioSinfoniaQuimica; numero: number; titulo: string; desc: string }[] = [
    {
      id: 'ESTAGIO_1_CONDICIONAMENTO',
      numero: 1,
      titulo: 'Condicionamento Redox',
      desc: 'Ajuste eletroquímico de pH e desestabilização iônica inicial',
    },
    {
      id: 'ESTAGIO_2_OXIDACAO_RADICALAR',
      numero: 2,
      titulo: 'Oxidação Radicalar',
      desc: 'Injeção de CONTHEC A (Polióxido) e clivagem de anéis aromáticos / DBO',
    },
    {
      id: 'ESTAGIO_3_ESTABILIZACAO_SILICIO',
      numero: 3,
      titulo: 'Passivação com Silício',
      desc: 'Injeção de CONTHEC B (Silício Reativo) para estabilização de metais e lodo',
    },
    {
      id: 'ESTAGIO_4_CLARIFICACAO_POLIMENTO',
      numero: 4,
      titulo: 'Clarificação e Envio FTE-CDI',
      desc: 'Injeção de CONTHEC C (Catalisador) e envio de água pura para o rack',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel PuriFyWave com Skid Quádruplo CONTHEC */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Beaker className="w-7 h-7 text-indigo-400" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white font-display">
                  SISTEMA PURIFYWAVE OS V2 — SKID QUÁDRUPLO CONTHEC & ZLD
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Kit Oficial CONTHEC (A + B + C + Injetor 4)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dosagem estequiométrica (500ml A, 220ml B, 220ml C) com câmara de pré-mistura e interligação ZLD (Zero Liquid Discharge) com a retrolavagem FTE-CDI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => purifyWaveService.alternarAtivo()}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                pwState.ativo 
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40'
              }`}
            >
              {pwState.ativo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {pwState.ativo ? 'Reator Oxidativo em Operação' : 'Reator em Standby'}
            </button>

            <button
              onClick={onOpenDualReportModal}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-600/20"
            >
              <FileText className="w-4 h-4" />
              Emitir Laudo Duplo (PDF)
            </button>
          </div>
        </div>

        {/* 2. Visualizador da "Sinfonia Química" (4 Estágios) */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Sinfonia Química em 4 Estágios (Otimização Adaptativa CONTHEC)
            </span>
            <span className="text-xs font-mono text-indigo-400">
              Progresso do Estágio: {pwState.progressoEstagioPct}% | ORP: +{pwState.orpOutMv} mV
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {estagios.map((e) => {
              const isCurrent = pwState.estagioAtual === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => purifyWaveService.forcarTransicaoEstagio(e.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                  }`}
                >
                  {isCurrent && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-300"
                      style={{ width: `${pwState.progressoEstagioPct}%` }}
                    />
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      ESTÁGIO 0{e.numero}
                    </span>
                    {isCurrent && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">{e.titulo}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{e.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Skid Quádruplo CONTHEC: Frascos A, B e C + Câmara de Mistura + 4º Injetor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Pipette className="w-5 h-5 text-indigo-400" />
              Skid Quádruplo de Dosagem e Ativação CONTHEC
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Frascos A, B e C com dosagem estequiométrica (53,2% A, 23,4% B, 23,4% C) e injeção com água de matriz.
            </p>
          </div>

          <button
            onClick={handleReabastecer}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reabastecer Frascos (A, B, C)
          </button>
        </div>

        {/* Grade dos 3 Frascos CONTHEC + Câmara de Pré-Mistura + 4º Injetor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Frasco A */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-rose-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                FRASCO A
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {skid.componenteA.volumeAtualML} / {skid.componenteA.capacidadeMaximaML} ml
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">CONTHEC A (Reagente)</div>
              <div className="text-[11px] text-slate-400">Polióxido de Cloro Oxidante</div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${(skid.componenteA.volumeAtualML / skid.componenteA.capacidadeMaximaML) * 100}%` }}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Vazão Dosadora 1:</span>
                <span className="font-mono font-bold text-rose-300">{dosagemA} ml/h</span>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="1"
                value={dosagemA}
                onChange={(e) => setDosagemA(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Frasco B */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                FRASCO B
              </span>
              <span className="text-xs font-mono font-bold text-sky-400">
                {skid.componenteB.volumeAtualML} / {skid.componenteB.capacidadeMaximaML} ml
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">CONTHEC B (Silício)</div>
              <div className="text-[11px] text-slate-400">Estabilizador e Passivação</div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-sky-500 rounded-full transition-all duration-300"
                style={{ width: `${(skid.componenteB.volumeAtualML / skid.componenteB.capacidadeMaximaML) * 100}%` }}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Vazão Dosadora 2:</span>
                <span className="font-mono font-bold text-sky-300">{dosagemB} ml/h</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="0.5"
                value={dosagemB}
                onChange={(e) => setDosagemB(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Frasco C */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                FRASCO C
              </span>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {skid.componenteC.volumeAtualML} / {skid.componenteC.capacidadeMaximaML} ml
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">CONTHEC C (Catalisador)</div>
              <div className="text-[11px] text-slate-400">Ativação Cinética In-Situ</div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${(skid.componenteC.volumeAtualML / skid.componenteC.capacidadeMaximaML) * 100}%` }}
              />
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Vazão Dosadora 3:</span>
                <span className="font-mono font-bold text-indigo-300">{dosagemC} ml/h</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="0.5"
                value={dosagemC}
                onChange={(e) => setDosagemC(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 4º Injetor de Diluição & Câmara */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                4º INJETOR
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {skid.injetorDiluicao4.pressaoInjecaoBar} bar
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Diluição & Injeção DN200</div>
              <div className="text-[11px] text-slate-400">Água de Arraste + Complexo Ativado</div>
            </div>
            <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-500/20">
              <div>• Vazão: {vazaoDiluicao} L/h</div>
              <div>• Concentração: {concentracaoAtiva} ppm</div>
              <div>• Reação In-Situ: {skid.camaraMistura.tempoRestanteS}s</div>
            </div>
            <button
              onClick={handleAplicarDosadorasConthec}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aplicar no Reator
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bomba Biossônica BBS-100: Controle de Cavitação Acústica & Hidrodinâmica */}
      <BiosonicPumpPanel />

      {/* 5. Módulo UGL & Circuito ZLD (Zero Liquid Discharge) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel ZLD & Retrolavagem */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Recycle className="w-4 h-4 text-emerald-400" />
              Circuito ZLD (Integração Retrolavagem FTE-CDI ➔ UGL)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Descarte Zero Ativo
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Rejeito Recebido (XV-103)</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {pwState.ugl.vazaoResiduoRecebidaLh} L/h
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Fluoreto: {pwState.ugl.concentracaoFluorRecebidaPpm} ppm</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Água Limpa Reusada</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {pwState.ugl.vazaoFiltradoRecuperadoLh} L/h
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">Retorno direto para T-100</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Imobilização Fluorossilicato</div>
              <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                {pwState.ugl.massaFluorossilicatoPrecipitadaKgH} kg/h
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Precipitado mineral inerte</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Taxa de Recuperação</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {pwState.ugl.recuperacaoAguaZldPct}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">Sem perda de efluente</div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>O Silício (CONTHEC B) imobiliza o fluoreto na torta mineral, permitindo o reuso de 100% da água.</span>
          </div>
        </div>

        {/* Painel UGL Prensa & Biossólido Agrícola */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Prensa Desaguadora UGL & Biossólidos
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              CONAMA 498
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Taxa Desaguamento</div>
              <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                {pwState.ugl.taxaDesaguamentoPct}%
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Prensa Parafuso</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Umidade da Torta</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {pwState.ugl.umidadeTortaPct}%
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">&lt; 25% (Apto Agricultura)</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Lodo Processado</div>
              <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                {pwState.ugl.lodoProcessadoKgH} kg/h
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Estabilizado com Silício</div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-mono">Inibição de Odor H₂S</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                100%
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">Sem putrefação</div>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Biossólido mineralizado e sanitizado para enriquecimento de solos agrícolas.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
