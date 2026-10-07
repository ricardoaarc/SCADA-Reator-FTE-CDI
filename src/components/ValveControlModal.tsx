/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Sliders, 
  Power, 
  Gauge, 
  Thermometer, 
  Zap, 
  RotateCcw, 
  Clock, 
  Check, 
  Database,
  Lock,
  Unlock
} from 'lucide-react';
import { ValvulaMotorizadaInfo } from '../types';
import { dbInstance } from '../services/database';

interface ValveControlModalProps {
  valvula: ValvulaMotorizadaInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onComandarValvula: (tag: string, comando: 'ABRIR' | 'FECHAR', modo: 'AUTOMATICO_TOPOLOGIA' | 'MANUAL_SUPERVISIONADO') => void;
}

export const ValveControlModal: React.FC<ValveControlModalProps> = ({
  valvula,
  isOpen,
  onClose,
  onComandarValvula,
}) => {
  if (!isOpen || !valvula) return null;

  const [modo, setModo] = useState<'AUTOMATICO_TOPOLOGIA' | 'MANUAL_SUPERVISIONADO'>(valvula.modoControle);
  const [transit, setTransit] = useState(false);
  const [salvoSql, setSalvoSql] = useState(false);

  const isAberta = valvula.estado === 'ABERTA';

  const handleComando = (acao: 'ABRIR' | 'FECHAR') => {
    setTransit(true);
    setTimeout(() => {
      onComandarValvula(valvula.tag, acao, modo);
      setTransit(false);
      setSalvoSql(true);
      setTimeout(() => setSalvoSql(false), 3000);
    }, 1200);
  };

  const handleToggleModo = () => {
    const novoModo = modo === 'AUTOMATICO_TOPOLOGIA' ? 'MANUAL_SUPERVISIONADO' : 'AUTOMATICO_TOPOLOGIA';
    setModo(novoModo);
    onComandarValvula(valvula.tag, isAberta ? 'ABRIR' : 'FECHAR', novoModo);
    dbInstance.inserirAlarme(
      'INFO',
      `[SCADA VÁLVULAS] Válvula ${valvula.tag} comutada para modo ${novoModo} pelo operador.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-slate-100">
        
        {/* Cabeçalho */}
        <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`p-3 rounded-xl border flex items-center justify-center ${
              isAberta 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/20' 
                : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/20'
            }`}>
              <Sliders className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-sky-500/30 font-bold">
                  {valvula.tag}
                </span>
                <h3 className="text-lg font-bold text-white font-display">
                  {valvula.nome}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Especificação: {valvula.tipo} | {valvula.diametroDn} {valvula.pressaoNominal} | Atuador: {valvula.atuadorModelo}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Atual e Fim de Curso ZSO / ZSC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Status Operacional</div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isAberta ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className={`text-sm font-bold font-mono ${isAberta ? 'text-emerald-400' : 'text-rose-400'}`}>
                {transit ? 'TRANSITANDO (3.5s)...' : valvula.estado}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Abertura: {transit ? '50%' : isAberta ? '100%' : '0%'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Fins de Curso (ZSO / ZSC)</div>
            <div className="flex items-center gap-3 font-mono text-xs mt-1">
              <span className={`px-2 py-0.5 rounded border ${isAberta ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-slate-800/60 text-slate-500 border-slate-700'}`}>
                ZSO: {isAberta ? 'ON (1)' : 'OFF (0)'}
              </span>
              <span className={`px-2 py-0.5 rounded border ${!isAberta ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold' : 'bg-slate-800/60 text-slate-500 border-slate-700'}`}>
                ZSC: {!isAberta ? 'ON (1)' : 'OFF (0)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Modo de Controle</div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs font-bold font-mono ${modo === 'AUTOMATICO_TOPOLOGIA' ? 'text-sky-400' : 'text-amber-400'}`}>
                {modo === 'AUTOMATICO_TOPOLOGIA' ? 'AUTO (Topologia)' : 'MANUAL (Supervisionado)'}
              </span>
              <button
                onClick={handleToggleModo}
                className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all font-mono"
              >
                Alternar Modo
              </button>
            </div>
          </div>
        </div>

        {/* Telemetria do Atuador Elétrico Rotork/AUMA */}
        <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              Telemetria do Atuador Elétrico (Barramento Modbus TCP / 4-20mA)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Database className="w-3 h-3" /> Sincronizado Supabase
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Corrente Motor
              </div>
              <div className="text-white font-bold text-sm mt-0.5">{valvula.correnteMotorA} A</div>
              <div className="text-[9px] text-slate-500">220V AC Trifásico</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-sky-400" /> Torque Efetivo
              </div>
              <div className="text-white font-bold text-sm mt-0.5">{valvula.torqueNm} Nm</div>
              <div className="text-[9px] text-slate-500">Máx: 200 Nm (60%)</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-rose-400" /> Temp. Atuador
              </div>
              <div className="text-white font-bold text-sm mt-0.5">{valvula.temperaturaAtuadorC} °C</div>
              <div className="text-[9px] text-emerald-400">Normal (&lt; 65°C)</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-400" /> Tempo de Curso
              </div>
              <div className="text-white font-bold text-sm mt-0.5">{valvula.tempoCursoS} s</div>
              <div className="text-[9px] text-slate-500">Anti-Golpe Aríete</div>
            </div>
          </div>
        </div>

        {/* Quadro de Intertravamentos e Segurança */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-2">
            <ShieldAlert className="w-4 h-4" />
            Condições de Intertravamento e Segurança Hidráulica
          </div>
          <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
            <li>
              <strong className="text-slate-300">Proteção Anti-Golpe de Aríete:</strong> Manobra temporizada em {valvula.tempoCursoS} segundos para dissipação de onda de pressão em tubulação PEAD DN200 PN10.
            </li>
            <li>
              <strong className="text-slate-300">Intertravamento com Bomba P-101 / B-100:</strong> Proibida partida de bomba em caso de fechamento total de sucção e descarga.
            </li>
            <li>
              <strong className="text-slate-300">Segurança de Torque:</strong> Desarme elétrico instantâneo caso o torque ultrapasse 180 Nm (obstrução mecânica).
            </li>
          </ul>
        </div>

        {/* Botões de Comando e Ação Manual */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 font-mono">
            Última Manobra: {valvula.ultimaManobraTimestamp} ({valvula.operadorUltimaManobra})
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {modo === 'AUTOMATICO_TOPOLOGIA' && (
              <span className="text-[11px] text-amber-400/90 font-mono flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                <Lock className="w-3 h-3" /> Controlada pela Topologia Ativa
              </span>
            )}

            <button
              onClick={() => handleComando('ABRIR')}
              disabled={transit || (isAberta && !transit)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isAberta
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              <Power className="w-4 h-4" />
              {transit ? 'Abrindo...' : 'Comandar Abertura (ABRIR)'}
            </button>

            <button
              onClick={() => handleComando('FECHAR')}
              disabled={transit || (!isAberta && !transit)}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                !isAberta
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              <X className="w-4 h-4" />
              {transit ? 'Fechando...' : 'Comandar Fechamento (FECHAR)'}
            </button>
          </div>
        </div>

        {salvoSql && (
          <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Comando transmitido ao PLC e registrado com sucesso no Supabase (`scada_valves_audit`).
          </div>
        )}

      </div>
    </div>
  );
};
