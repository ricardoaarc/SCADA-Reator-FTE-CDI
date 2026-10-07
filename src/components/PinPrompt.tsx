/**
 * Pede o PIN de um usuário para assumir a sessão (login). O PIN nunca fica no estado depois da tentativa.
 */

import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PinPromptProps {
  nome: string;
  matricula: string;
  onConfirmar: (pin: string) => Promise<{ sucesso: boolean; mensagem: string }>;
  onCancelar: () => void;
}

export const PinPrompt: React.FC<PinPromptProps> = ({ nome, matricula, onConfirmar, onCancelar }) => {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificando) return;
    setErro(null);
    setVerificando(true);
    try {
      const r = await onConfirmar(pin);
      setPin(''); // o PIN não fica em memória da tela depois da tentativa
      if (!r.sucesso) setErro(r.mensagem);
    } catch (err) {
      setPin('');
      setErro(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setVerificando(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
      <form onSubmit={enviar} className="bg-[#151b2b] border border-[#334155] rounded-xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-400" /> Autenticação necessária
          </h3>
          <button type="button" onClick={onCancelar} className="text-[#94a3b8] hover:text-white" aria-label="Cancelar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-2">
          Informe o PIN de <strong className="text-white">{nome}</strong> <span className="font-mono text-[#94a3b8]">({matricula})</span> para assumir esta sessão.
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mt-3 w-full bg-[#0a0e17] border border-[#334155] rounded px-3 py-2 text-sm text-slate-100 font-mono"
          placeholder="PIN"
        />
        {erro && <p role="alert" className="mt-2 text-xs text-red-300 font-mono">{erro}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancelar} className="px-3 py-1.5 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-200 text-xs font-semibold">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={verificando || pin === ''}
            className="px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40 text-white text-xs font-bold"
          >
            {verificando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};
