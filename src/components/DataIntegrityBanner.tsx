/**
 * Aviso ao operador quando dados salvos no navegador estavam inválidos (SCD-DAT-001)
 * ou não puderam ser gravados (SCD-DAT-002).
 */

import React, { useEffect, useState } from 'react';
import { integridadeDados, ProblemaDados } from '../services/storageSeguro';

export function DataIntegrityBanner() {
  const [problemas, setProblemas] = useState<ProblemaDados[]>([]);

  useEffect(() => integridadeDados.assinar(setProblemas), []);

  if (problemas.length === 0) return null;

  return (
    <div role="alert" className="mb-3 rounded-lg border border-amber-600 bg-amber-950/50 p-3 text-xs text-amber-100">
      <div className="flex items-start justify-between gap-3">
        <strong className="uppercase tracking-wider">
          Dados salvos com problema ({problemas.length})
        </strong>
        <button
          onClick={() => integridadeDados.dispensar()}
          className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-[11px] font-bold"
        >
          Dispensar
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {problemas.map(p => (
          <li key={p.id} className="font-mono text-[11px] leading-snug">
            <span className="font-bold">[{p.codigo}] {p.rotulo}:</span> {p.motivo}. {p.acao}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-amber-300/80">
        Uma cópia do valor inválido foi guardada no navegador (chaves scada_backup_corrompido:*) para análise do suporte.
      </p>
    </div>
  );
}
