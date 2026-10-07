/**
 * Modal de Autenticação de Operadores e Trilha de Auditoria (RBAC)
 * Padrão Industrial ISA-101 / CFR 21 Part 11
 */

import React, { useState } from 'react';
import { 
  UserCheck, 
  Shield, 
  Lock, 
  Key, 
  X, 
  CheckCircle2, 
  Clock, 
  FileCheck2,
  ChevronRight,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { OperatorProfile, OperatorRole, AuditActionLog } from '../types';
import { authService } from '../services/AuthService';
import { PinPrompt } from './PinPrompt';

interface OperatorAuthModalProps {
  operadorAtual: OperatorProfile;
  historicoAuditoria: AuditActionLog[];
  onFechar: () => void;
  onOperadorAlterado: (novo: OperatorProfile) => void;
}

export const OperatorAuthModal: React.FC<OperatorAuthModalProps> = ({
  operadorAtual,
  historicoAuditoria,
  onFechar,
  onOperadorAlterado,
}) => {
  const [tabAtiva, setTabAtiva] = useState<'PERFIL' | 'AUDITORIA'>('PERFIL');
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  // Trocar de usuário exige o PIN do usuário de destino (feito em PinPrompt)
  const [alvoLogin, setAlvoLogin] = useState<OperatorProfile | null>(null);
  const usuariosAtivos = authService.getOperadoresDisponiveis().filter(u => u.status !== 'INATIVO');

  const confirmarLogin = async (pin: string) => {
    if (!alvoLogin) return { sucesso: false, mensagem: 'Nenhum usuário selecionado.' };
    const r = await authService.autenticarOperador(alvoLogin.matricula, pin);
    if (r.sucesso) {
      const novo = authService.getOperadorAtual();
      onOperadorAlterado(novo);
      setAlvoLogin(null);
      setFeedbackSucesso(`Operador ativo alterado para ${novo.nome} (${novo.role})`);
      setTimeout(() => setFeedbackSucesso(null), 3000);
    }
    return r;
  };

  const encerrarSessao = () => {
    authService.encerrarSessao();
    onOperadorAlterado(authService.getOperadorAtual());
    setFeedbackSucesso('Sessão encerrada: perfil básico ativo.');
    setTimeout(() => setFeedbackSucesso(null), 3000);
  };

  const getRoleBadge = (role: OperatorRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'ENGENHEIRO':
        return 'bg-sky-950/80 text-sky-300 border-sky-700/60';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f1422] border border-[#1e293b] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 bg-[#151b2b] border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-950/60 border border-sky-600/40 flex items-center justify-center text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Autenticação & Controle de Acesso (RBAC)
                <span className="text-[10px] bg-slate-800 text-[#94a3b8] px-2 py-0.5 rounded border border-[#334155] font-mono">
                  21 CFR Part 11
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Gerenciamento de credenciais ativas e trilha auditada de operações
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-lg bg-[#1e293b] text-[#94a3b8] hover:text-white hover:bg-[#334155] flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[#1e293b] bg-[#0a0e17]">
          <button
            onClick={() => setTabAtiva('PERFIL')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              tabAtiva === 'PERFIL'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-[#94a3b8] hover:text-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Sessão Ativa & Operadores
          </button>
          <button
            onClick={() => setTabAtiva('AUDITORIA')}
            className={`flex-1 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
              tabAtiva === 'AUDITORIA'
                ? 'border-sky-500 text-sky-400 bg-sky-950/20'
                : 'border-transparent text-[#94a3b8] hover:text-slate-300'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Trilha de Auditoria ({historicoAuditoria.length})
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {feedbackSucesso && (
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackSucesso}</span>
            </div>
          )}

          {tabAtiva === 'PERFIL' ? (
            <>
              {/* Card da Sessão Ativa */}
              <div className="p-4 rounded-lg bg-[#0a0e17] border border-sky-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold block mb-1">
                  Sessão em Operação no Terminal
                </span>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {operadorAtual.nome}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getRoleBadge(operadorAtual.role as any)}`}>
                        {operadorAtual.role}
                      </span>
                    </h4>
                    <p className="text-xs text-[#94a3b8] mt-0.5">{operadorAtual.cargo}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[#64748b] font-mono">
                      <span>Matrícula: <strong className="text-slate-300">{operadorAtual.matricula}</strong></span>
                      <span>•</span>
                      <span>E-mail: <strong className="text-slate-300">{operadorAtual.email}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#64748b] block">Último Acesso</span>
                    <span className="text-xs font-mono text-slate-300">
                      {new Date(operadorAtual.ultimoAcesso).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Grade de Permissões */}
                <div className="mt-4 pt-3 border-t border-[#1e293b] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#0f1422] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Operação Geral:</span>
                    <strong className="text-emerald-400">LIBERADA</strong>
                  </div>
                  <div className="p-2 rounded bg-[#0f1422] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Sintonia PID:</span>
                    <strong className={operadorAtual.role !== 'OPERADOR' ? 'text-emerald-400' : 'text-amber-400'}>
                      {operadorAtual.role !== 'OPERADOR' ? 'AUTORIZADA' : 'RESTRITA'}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-[#0f1422] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Comutação CLP:</span>
                    <strong className={operadorAtual.role !== 'OPERADOR' ? 'text-emerald-400' : 'text-red-400'}>
                      {operadorAtual.role !== 'OPERADOR' ? 'AUTORIZADA' : 'BLOQUEADA'}
                    </strong>
                  </div>
                  <div className="p-2 rounded bg-[#0f1422] border border-[#1e293b]">
                    <span className="text-[#64748b] block text-[10px]">Reset Interlock:</span>
                    <strong className="text-emerald-400">COM AUDITORIA</strong>
                  </div>
                </div>
              </div>

              {/* Seletor Rápido de Operadores Homologados */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Trocar de Usuário (exige o PIN do usuário)
                </h4>
                <button
                  type="button"
                  onClick={encerrarSessao}
                  className="mb-2 px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded text-xs font-semibold flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Encerrar sessão (perfil básico)
                </button>
                <div className="space-y-2">
                  {usuariosAtivos.map((op) => {
                    const isAtivo = op.id === operadorAtual.id;
                    return (
                      <div
                        key={op.id}
                        onClick={() => !isAtivo && setAlvoLogin(op)}
                        className={`p-3 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                          isAtivo
                            ? 'bg-sky-950/20 border-sky-500/50 cursor-default'
                            : 'bg-[#0a0e17] border-[#1e293b] hover:border-[#334155] hover:bg-[#0f1422]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1e293b] border border-[#334155] flex items-center justify-center font-bold text-xs text-slate-200">
                            {op.nome.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{op.nome}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${getRoleBadge(op.role as any)}`}>
                                {op.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#94a3b8]">{op.cargo} ({op.matricula})</span>
                          </div>
                        </div>

                        {isAtivo ? (
                          <span className="text-xs text-sky-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Atual
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-2.5 py-1 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition"
                          >
                            Entrar com PIN
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Trilha de Auditoria */
            <div className="space-y-2">
              <div className="p-2 bg-[#0a0e17] border border-[#1e293b] rounded text-xs text-[#94a3b8] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  Todos os eventos críticos (reset de interlock, sintonia PID e comutação de fonte) são assinados com matrícula e horário.
                </span>
              </div>

              {historicoAuditoria.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#64748b]">
                  Nenhum registro de auditoria gerado até o momento.
                </div>
              ) : (
                historicoAuditoria.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-[#0a0e17] border border-[#1e293b] text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#64748b] mb-1">
                      <span className="text-slate-300 font-bold">
                        {log.operadorNome} ({log.operadorMatricula} - {log.role})
                      </span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                    </div>
                    <div className="text-slate-200 text-xs font-sans">
                      {log.acao}
                    </div>
                    {log.justificativa && (
                      <div className="text-[11px] text-[#94a3b8] mt-1 pl-2 border-l border-sky-600/40">
                        Justificativa: {log.justificativa}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 bg-[#0a0e17] border-t border-[#1e293b] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#64748b] font-mono">
            Sessão vinculada à IHM SCADA local
          </span>
          <button
            onClick={onFechar}
            className="px-4 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs font-semibold"
          >
            Fechar Janela
          </button>
        </div>
      </div>
      {alvoLogin && (
        <PinPrompt
          nome={alvoLogin.nome}
          matricula={alvoLogin.matricula}
          onConfirmar={confirmarLogin}
          onCancelar={() => setAlvoLogin(null)}
        />
      )}
    </div>
  );
};
