/**
 * Console de Alarmes e Interlocks ISA-18.2 (Filosofia de Cores e Reconhecimento Mandatório)
 * Supervisório SCADA Reator FTE-CDI (16 Células)
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Check, 
  X, 
  Bell, 
  Clock, 
  Search, 
  ListFilter,
  Scale,
  RotateCcw
} from 'lucide-react';
import { Alarme, Usuario } from '../types';
import { dbInstance } from '../services/database';

interface InterlockAlarmConsoleProps {
  usuarioAtual: Usuario;
  onAtualizar: () => void;
}

export const InterlockAlarmConsole: React.FC<InterlockAlarmConsoleProps> = ({
  usuarioAtual,
  onAtualizar
}) => {
  const [filtroSeveridade, setFiltroSeveridade] = useState<'TODOS' | 'CRITICO' | 'NAO_CONFORMIDADE_REGULATORIA' | 'ALERTA'>('TODOS');
  const [apenasNaoReconhecidos, setApenasNaoReconhecidos] = useState<boolean>(false);
  const alarmes = dbInstance.getAlarmes();

  const handleReconhecer = (id: number) => {
    dbInstance.reconhecerAlarme(id, usuarioAtual.nome);
    onAtualizar();
  };

  const handleResolver = (id: number) => {
    dbInstance.resolverAlarme(id);
    onAtualizar();
  };

  const alarmesFiltrados = alarmes.filter(a => {
    if (apenasNaoReconhecidos && a.reconhecido) return false;
    if (filtroSeveridade !== 'TODOS' && a.nivel_severidade !== filtroSeveridade) return false;
    return true;
  });

  return (
    <div className="p-5 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl space-y-4">
      {/* Header do Console de Alarmes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Console de Alarmes & Interlocks (ISA-18.2)
            </h3>
            <p className="text-xs text-slate-400">
              Rastreabilidade cronológica com reconhecimento obrigatório pelo operador em turno.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <button
            onClick={() => setFiltroSeveridade('TODOS')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              filtroSeveridade === 'TODOS' ? 'bg-[#1e293b] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({alarmes.length})
          </button>
          <button
            onClick={() => setFiltroSeveridade('CRITICO')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              filtroSeveridade === 'CRITICO' ? 'bg-red-950 text-red-300 border border-red-700' : 'text-slate-400 hover:text-red-300'
            }`}
          >
            Críticos ({alarmes.filter(a => a.nivel_severidade === 'CRITICO').length})
          </button>
          <button
            onClick={() => setFiltroSeveridade('NAO_CONFORMIDADE_REGULATORIA')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              filtroSeveridade === 'NAO_CONFORMIDADE_REGULATORIA' ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            Portaria 888 ({alarmes.filter(a => a.nivel_severidade === 'NAO_CONFORMIDADE_REGULATORIA').length})
          </button>
          <button
            onClick={() => setApenasNaoReconhecidos(!apenasNaoReconhecidos)}
            className={`px-2.5 py-1 rounded font-bold transition ${
              apenasNaoReconhecidos ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            {apenasNaoReconhecidos ? 'Apenas Pendentes de Reconhecimento' : 'Todos os Estados'}
          </button>
        </div>
      </div>

      {/* Lista Cronológica de Alarmes */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs text-left font-mono">
          <thead className="bg-[#070c16] text-slate-400 uppercase text-[11px] border-b border-slate-800 sticky top-0">
            <tr>
              <th className="py-2.5 px-3">Data / Hora</th>
              <th className="py-2.5 px-3">Origem</th>
              <th className="py-2.5 px-3">Código</th>
              <th className="py-2.5 px-3">Severidade</th>
              <th className="py-2.5 px-3">Mensagem</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Ação ISA-18.2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {alarmesFiltrados.map((a) => {
              const isCritico = a.nivel_severidade === 'CRITICO';
              const isRegulatorio = a.nivel_severidade === 'NAO_CONFORMIDADE_REGULATORIA';
              const isAlerta = a.nivel_severidade === 'ALERTA';

              return (
                <tr key={a.id} className="hover:bg-[#152033] transition">
                  <td className="py-2.5 px-3 text-slate-400">{new Date(a.timestamp).toLocaleTimeString('pt-BR')}</td>
                  <td className="py-2.5 px-3 font-bold text-sky-400">
                    {a.celula_id ? `CEL-${a.celula_id < 10 ? '0' + a.celula_id : a.celula_id}` : 'Rack Principal'}
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{a.codigo}</td>
                  <td className="py-2.5 px-3">
                    {isCritico ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700 animate-pulse">
                        CRÍTICO (INTERLOCK)
                      </span>
                    ) : isRegulatorio ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
                        PORTARIA 888
                      </span>
                    ) : isAlerta ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                        ALERTA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
                        INFO
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 max-w-md">{a.mensagem}</td>
                  <td className="py-2.5 px-3">
                    {a.reconhecido ? (
                      <span className="text-emerald-400 text-[10px] block">
                        Reconhecido por {a.reconhecido_por}
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold text-[10px] block animate-pulse">
                        Pendente de Reconhecimento
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {!a.reconhecido ? (
                      <button
                        onClick={() => handleReconhecer(a.id)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] rounded transition shadow"
                      >
                        Reconhecer (Ack)
                      </button>
                    ) : !a.resolvido ? (
                      <button
                        onClick={() => handleResolver(a.id)}
                        className="px-2.5 py-1 bg-[#1e293b] hover:bg-emerald-950 hover:text-emerald-300 text-slate-300 font-bold text-[10px] rounded border border-slate-700 transition"
                      >
                        Limpar
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Resolvido</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
