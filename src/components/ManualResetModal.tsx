/**
 * Modal de Rearme Manual Obrigatório com Rastreabilidade (NR-12 / NR-10)
 * Regra Obrigatória:
 * O sistema NUNCA se rearma sozinho após corte crítico de segurança.
 * Exige credencial de nível SUPERVISOR ou ENGENHEIRO e justificativa técnica gravada no banco SQL.
 */

import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  FileText,
  KeyRound
} from 'lucide-react';
import { CelulaInfo, Usuario } from '../types';
import { controllerV2Instance } from '../services/fte_cdi_controller_v2';
import { dbInstance } from '../services/database';

interface ManualResetModalProps {
  celula: CelulaInfo;
  usuarioAtual: Usuario;
  onFechar: () => void;
  onRearmeSucesso: () => void;
}

export const ManualResetModal: React.FC<ManualResetModalProps> = ({
  celula,
  usuarioAtual,
  onFechar,
  onRearmeSucesso
}) => {
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [isProcessando, setIsProcessando] = useState(false);

  const isNivelPermitido = usuarioAtual.nivel_acesso === 'SUPERVISOR' || usuarioAtual.nivel_acesso === 'ENGENHEIRO';
  const isPressaoSegura = celula.pressaoBar < 2.50;

  const handleExecutarRearme = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!isNivelPermitido) {
      setErro('ACESSO NEGADO: O rearme manual de interlock de segurança exige credencial de SUPERVISOR ou ENGENHEIRO.');
      return;
    }

    if (observacao.trim().length < 10) {
      setErro('JUSTIFICATIVA OBRIGATÓRIA: Descreva a causa da sobrepressão e a ação corretiva realizada (mínimo 10 caracteres).');
      return;
    }

    if (!isPressaoSegura) {
      setErro(`BLOQUEIO DE SEGURANÇA: A pressão atual (${celula.pressaoBar.toFixed(2)} bar) deve estar abaixo de 2,50 bar para permitir o rearme dos relés.`);
      return;
    }

    setIsProcessando(true);
    const resultado = await controllerV2Instance.rearmarCelulaManualmente(
      celula.id,
      usuarioAtual,
      observacao
    );
    setIsProcessando(false);

    if (resultado.sucesso) {
      onRearmeSucesso();
      onFechar();
    } else {
      setErro(resultado.mensagem);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-red-500/60 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Rearme Manual de Interlock: {celula.codigo}
              </h2>
              <p className="text-xs text-slate-400">
                Procedimento de segurança mandatório conforme NR-12 item 12.6 e NR-10.
              </p>
            </div>
          </div>

          <button
            onClick={onFechar}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Motivo do Bloqueio */}
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs font-mono space-y-1">
          <span className="text-red-400 font-bold uppercase block flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Motivo do Corte Físico:
          </span>
          <p className="text-slate-200">{celula.motivoInterlock || 'Sobrepressão crítica no plenum da célula.'}</p>
          <div className="text-[11px] text-slate-400 pt-1">
            Pressão no momento do corte: <span className="text-red-300 font-bold">{celula.pressaoBar.toFixed(2)} bar</span> (Teto de segurança: 2,80 bar)
          </div>
        </div>

        {/* Status de Pré-Requisitos para Rearme */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className={`p-2.5 rounded-lg border ${
            isPressaoSegura ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300' : 'bg-red-950/40 border-red-700 text-red-300'
          }`}>
            <span className="block text-[10px] text-slate-400">Pressão Atual (&lt; 2,50 bar)</span>
            <span className="font-bold flex items-center gap-1 mt-0.5">
              {isPressaoSegura ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              {celula.pressaoBar.toFixed(2)} bar ({isPressaoSegura ? 'Seguro' : 'Alta'})
            </span>
          </div>

          <div className={`p-2.5 rounded-lg border ${
            isNivelPermitido ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300' : 'bg-red-950/40 border-red-700 text-red-300'
          }`}>
            <span className="block text-[10px] text-slate-400">Nível de Acesso (Supervisor+)</span>
            <span className="font-bold flex items-center gap-1 mt-0.5">
              <UserCheck className="w-3.5 h-3.5" />
              {usuarioAtual.nivel_acesso} ({isNivelPermitido ? 'Autorizado' : 'Negado'})
            </span>
          </div>
        </div>

        {/* Mensagem de Erro / Alerta */}
        {erro && (
          <div className="p-3 bg-red-950/80 border border-red-500 rounded-lg text-xs font-mono text-red-200">
            {erro}
          </div>
        )}

        {/* Formulário de Justificativa Técnica */}
        <form onSubmit={handleExecutarRearme} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Justificativa Técnica e Ação Corretiva Realizada (Obrigatório):
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Efetuada inspeção física na linha de descarte, desobstruída válvula borboleta e verificado alívio de pressão. Célula liberada para ciclo de adsorção."
              rows={3}
              className="w-full bg-[#0a0f1d] border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] font-mono text-slate-400">
              Operador logado: <strong className="text-white">{usuarioAtual.nome}</strong> ({usuarioAtual.matricula})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onFechar}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isProcessando || !isNivelPermitido}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                {isProcessando ? 'Rearmando...' : 'Confirmar Rearme Físico'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
