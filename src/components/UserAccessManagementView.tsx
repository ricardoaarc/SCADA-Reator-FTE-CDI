/**
 * Gestão de Usuários e Perfis Técnicos por Zonas de Operação
 * Padrão Industrial: FDA 21 CFR Part 11 & IEC 62443-4-2 (RBAC / Trilha de Auditoria)
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Shield, 
  Key, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Edit3, 
  Trash2, 
  Activity, 
  Layers, 
  FileText, 
  Check, 
  X, 
  RefreshCw,
  Compass,
  Cpu,
  Flame,
  Zap,
  Clock,
  ArrowRight,
  Sliders,
  UserCheck
} from 'lucide-react';
import { OperatorProfile, OperatorRole, ZonaOperacaoInfo, UserGranularPermissions } from '../types';
import { authService, ZONAS_DE_OPERACAO } from '../services/AuthService';
import { PinPrompt } from './PinPrompt';
import { validarPoliticaPin } from '../services/pinHash';

interface UserAccessManagementViewProps {
  onVoltarParaSinoptico?: () => void;
}

export const UserAccessManagementView: React.FC<UserAccessManagementViewProps> = ({
  onVoltarParaSinoptico
}) => {
  const [usuarios, setUsuarios] = useState<OperatorProfile[]>(authService.getOperadoresDisponiveis());
  const [operadorAtual, setOperadorAtual] = useState<OperatorProfile>(authService.getOperadorAtual());
  const [filtroRole, setFiltroRole] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [modoEdicao, setModoEdicao] = useState<boolean>(false);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [feedbackMensagem, setFeedbackMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formRole, setFormRole] = useState<OperatorRole>('OPERADOR');
  const [formCargo, setFormCargo] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formZonas, setFormZonas] = useState<string[]>(['ZONA_1_CAPTACAO_POCOS']);
  const [formSenhaPin, setFormSenhaPin] = useState('');
  const [formPermissoes, setFormPermissoes] = useState<UserGranularPermissions>({
    canViewSynoptic: true,
    canEditLayout: false,
    canOperatePumps: false,
    canResetInterlocks: false,
    canExportReports: false,
    canManageUsers: false
  });

  useEffect(() => {
    const unsub = authService.subscribe((op, _) => {
      setOperadorAtual(op);
      setUsuarios(authService.getOperadoresDisponiveis());
    });
    return unsub;
  }, []);

  const abrirModalCadastro = () => {
    setModoEdicao(false);
    setIdEmEdicao(null);
    setFormNome('');
    setFormMatricula('');
    setFormRole('OPERADOR');
    setFormCargo('');
    setFormEmail('');
    setFormZonas(['ZONA_1_CAPTACAO_POCOS', 'ZONA_2_REATOR_FTE_CDI']);
    setFormSenhaPin('');
    setFormPermissoes({
      canViewSynoptic: true,
      canEditLayout: false,
      canOperatePumps: false,
      canResetInterlocks: false,
      canExportReports: false,
      canManageUsers: false
    });
    setModalAberto(true);
  };

  const abrirModalEdicao = (u: OperatorProfile) => {
    setModoEdicao(true);
    setIdEmEdicao(u.id);
    setFormNome(u.nome);
    setFormMatricula(u.matricula);
    setFormRole(u.role);
    setFormCargo(u.cargo);
    setFormEmail(u.email);
    setFormZonas(u.zonasAutorizadas || ['ZONA_1_CAPTACAO_POCOS']);
    setFormSenhaPin(''); // o PIN nunca é exibido; em branco = manter o atual
    setFormPermissoes(u.permissoes || {
      canViewSynoptic: true,
      canEditLayout: u.role === 'ENGENHEIRO' || u.role === 'ADMIN',
      canOperatePumps: u.role !== 'OPERADOR',
      canResetInterlocks: u.role !== 'OPERADOR',
      canExportReports: true,
      canManageUsers: u.role === 'ADMIN'
    });
    setModalAberto(true);
  };

  const handleToggleZona = (zonaId: string) => {
    if (formZonas.includes(zonaId)) {
      if (formZonas.length === 1) return; // Mínimo 1 zona
      setFormZonas(formZonas.filter(z => z !== zonaId));
    } else {
      setFormZonas([...formZonas, zonaId]);
    }
  };

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNome.trim() || !formMatricula.trim()) {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Preencha o Nome e a Matrícula do usuário.' });
      return;
    }

    // Validação de privilégio ADMIN prévia
    if (operadorAtual.role !== 'ADMIN' && !operadorAtual.permissoes?.canManageUsers) {
      setFeedbackMensagem({
        tipo: 'erro',
        texto: '[SCD-AUT-001] Acesso Negado: Apenas o Administrador (ADM-001) possui autorização para cadastrar ou editar usuários.'
      });
      return;
    }

    // Validação estrita de política de PIN antes de submeter
    if (!modoEdicao) {
      if (!formSenhaPin) {
        setFeedbackMensagem({ tipo: 'erro', texto: 'Informe um PIN numérico de pelo menos 4 dígitos para o novo usuário.' });
        return;
      }
      const errPin = validarPoliticaPin(formSenhaPin);
      if (errPin) {
        setFeedbackMensagem({ tipo: 'erro', texto: `PIN Inválido: ${errPin}` });
        return;
      }
    } else if (formSenhaPin) {
      const errPin = validarPoliticaPin(formSenhaPin);
      if (errPin) {
        setFeedbackMensagem({ tipo: 'erro', texto: `Novo PIN Inválido: ${errPin}` });
        return;
      }
    }

    try {
      if (modoEdicao && idEmEdicao) {
        await authService.atualizarOperador(idEmEdicao, {
          nome: formNome,
          matricula: formMatricula,
          role: formRole,
          cargo: formCargo,
          email: formEmail,
          zonasAutorizadas: formZonas,
          novoPin: formSenhaPin || undefined,
          permissoes: formPermissoes
        });
        setFeedbackMensagem({ tipo: 'sucesso', texto: `Usuário ${formNome} (${formMatricula}) atualizado com sucesso no SCADA e no Supabase!` });
      } else {
        await authService.cadastrarOperador({
          nome: formNome,
          matricula: formMatricula,
          role: formRole,
          cargo: formCargo || `Técnico (${formRole})`,
          email: formEmail || `${formMatricula.toLowerCase()}@purifywave.com.br`,
          zonasAutorizadas: formZonas,
          pin: formSenhaPin,
          permissoes: formPermissoes
        });
        setFeedbackMensagem({ tipo: 'sucesso', texto: `Novo usuário ${formNome} (${formMatricula}) cadastrado com sucesso no SCADA e no Supabase!` });
      }

      setModalAberto(false);
      setUsuarios(authService.getOperadoresDisponiveis());
      setTimeout(() => setFeedbackMensagem(null), 5000);
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err);
      setFeedbackMensagem({
        tipo: 'erro',
        texto: err?.message || 'Falha ao salvar usuário no sistema.'
      });
    }
  };

  // Assumir a sessão de outro usuário exige o PIN dele
  const [alvoLogin, setAlvoLogin] = useState<OperatorProfile | null>(null);

  const handleAssumirSessao = (u: OperatorProfile) => setAlvoLogin(u);

  const confirmarLogin = async (pin: string) => {
    if (!alvoLogin) return { sucesso: false, mensagem: 'Nenhum usuário selecionado.' };
    const r = await authService.autenticarOperador(alvoLogin.matricula, pin);
    if (r.sucesso) {
      setFeedbackMensagem({
        tipo: 'sucesso',
        texto: `Sessão ativa alterada para: ${alvoLogin.nome} (${alvoLogin.role}) — ${alvoLogin.cargo}`
      });
      setAlvoLogin(null);
      setTimeout(() => setFeedbackMensagem(null), 4000);
    }
    return r;
  };

  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<OperatorProfile | null>(null);

  const handleExcluirUsuario = (u: OperatorProfile) => {
    setUsuarioParaExcluir(u);
  };

  const confirmarExclusao = () => {
    if (!usuarioParaExcluir) return;
    const ok = authService.excluirOperador(usuarioParaExcluir.id);
    if (ok) {
      setUsuarios(authService.getOperadoresDisponiveis());
      setFeedbackMensagem({ tipo: 'sucesso', texto: `Acesso do usuário ${usuarioParaExcluir.nome} revogado com sucesso.` });
    } else {
      setFeedbackMensagem({ tipo: 'erro', texto: 'Não foi possível excluir o usuário.' });
    }
    setUsuarioParaExcluir(null);
    setTimeout(() => setFeedbackMensagem(null), 4000);
  };

  // Filtragem
  const usuariosFiltrados = usuarios.filter(u => {
    const bateTexto = 
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.matricula.toLowerCase().includes(busca.toLowerCase()) ||
      u.cargo.toLowerCase().includes(busca.toLowerCase());
    const bateRole = filtroRole === 'TODOS' || u.role === filtroRole;
    return bateTexto && bateRole;
  });

  const getRoleBadgeStyle = (role: OperatorRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/80 text-purple-300 border-purple-600/80 ring-1 ring-purple-500/40';
      case 'ENGENHEIRO':
        return 'bg-sky-950/80 text-sky-300 border-sky-600/80 ring-1 ring-sky-500/40';
      case 'SUPERVISOR':
        return 'bg-blue-950/80 text-blue-300 border-blue-600/80 ring-1 ring-blue-500/40';
      default:
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80 ring-1 ring-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. CABEÇALHO INDUSTRIAL PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                FDA 21 CFR PART 11 & IEC 62443-4-2
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                RBAC MULTI-ZONE ATIVO
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                TRILHA DE AUDITORIA CONECTADA
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-sky-400" />
              Gestão de Usuários & Zonas de Operação
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Controle estrito de privilégios de supervisão, assinaturas eletrônicas para comandos de potência e calibração geométrica CAD por Zonas de Planta.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onVoltarParaSinoptico && (
              <button
                type="button"
                onClick={onVoltarParaSinoptico}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition border border-slate-700 shadow-md"
              >
                Voltar ao Sinóptico
              </button>
            )}
            <button
              type="button"
              onClick={abrirModalCadastro}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition transform active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Usuário</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK MENSAGEM TOAST */}
        {feedbackMensagem && (
          <div className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedbackMensagem.tipo === 'sucesso' 
              ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/60' 
              : 'bg-rose-950/80 text-rose-200 border-rose-600/60'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMensagem.texto}</span>
          </div>
        )}

        {/* BANNER INFORMATIVO RBAC ADMIN */}
        {operadorAtual.role !== 'ADMIN' && !operadorAtual.permissoes?.canManageUsers ? (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-300 font-bold block">Modo Somente Leitura (Sessão: {operadorAtual.nome} - {operadorAtual.role})</strong>
                <span>Por conformidade de segurança industrial (IEC 62443 / CFR 21 Part 11), apenas o Administrador pode cadastrar ou alterar operadores.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const admin = usuarios.find(u => u.role === 'ADMIN');
                if (admin) handleAssumirSessao(admin);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold shrink-0 transition"
            >
              Autenticar como Administrador
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="text-emerald-300 font-bold block">Sessão Administrador Ativa ({operadorAtual.nome} - {operadorAtual.matricula})</strong>
              <span>Você possui privilégio pleno para cadastrar novos operadores, gerenciar permissões e persistir no Supabase.</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. CARDS DE STATUS & KPIS DO SISTEMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Sessão Ativa */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            {operadorAtual.nome.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">Sessão Ativa na IHM</span>
            <div className="font-extrabold text-white text-sm truncate">{operadorAtual.nome}</div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <span>{operadorAtual.matricula}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{operadorAtual.role}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Usuários Cadastrados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">Total no Banco SCADA</span>
            <div className="font-black text-white text-2xl">{usuarios.length} Usuários</div>
            <div className="text-xs text-slate-400">100% Auditados CFR 21</div>
          </div>
        </div>

        {/* Card 3: Engenharia Habilitada (CAD) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Habilitados para Edição CAD</span>
            <div className="font-black text-white text-2xl">
              {usuarios.filter(u => u.role === 'ENGENHEIRO' || u.role === 'ADMIN').length} Engenheiros
            </div>
            <div className="text-xs text-slate-400">PIN protegido por hash (PBKDF2)</div>
            {usuarios.some(u => u.pinPadrao) && (
              <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                {usuarios.filter(u => u.pinPadrao).length} usuário(s) ainda com PIN padrão: altere
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Zonas de Planta Monitoradas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">Zonas Industriais</span>
            <div className="font-black text-white text-2xl">{ZONAS_DE_OPERACAO.length} Zonas Ativas</div>
            <div className="text-xs text-slate-400">Intertravamento SIL-2</div>
          </div>
        </div>

      </div>

      {/* 3. ZONAS DE OPERAÇÃO DA PLANTA (VISUALIZAÇÃO EM GRID DAS 5 ZONAS) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="font-black text-white text-base">Zonas de Operação Industriais da Planta (IEC 62443)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">5 Zonas Segregadas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {ZONAS_DE_OPERACAO.map(zona => (
            <div 
              key={zona.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition flex flex-col justify-between"
              style={{ borderLeftColor: zona.cor, borderLeftWidth: '4px' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{zona.codigo}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    zona.nivelCriticidade === 'CRITICA_SIL2' 
                      ? 'bg-rose-500/20 text-rose-300' 
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {zona.nivelCriticidade === 'CRITICA_SIL2' ? 'SIL-2' : 'ALTA'}
                  </span>
                </div>
                <div className="font-bold text-white text-xs">{zona.nome}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{zona.descricao}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                <span>Usuários com acesso:</span>
                <span className="font-mono font-bold text-sky-400">
                  {usuarios.filter(u => u.zonasAutorizadas?.includes(zona.id)).length}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. BARRA DE FILTROS & PESQUISA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, matrícula ou cargo..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400 font-bold">Perfil:</span>
          {['TODOS', 'OPERADOR', 'SUPERVISOR', 'ENGENHEIRO', 'ADMIN'].map(role => (
            <button
              key={role}
              onClick={() => setFiltroRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition ${
                filtroRole === role
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* 5. TABELA DE USUÁRIOS E PERMISSÕES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Operador / Matrícula</th>
                <th className="py-3 px-4">Perfil Técnico (Role)</th>
                <th className="py-3 px-4">Zonas de Operação Autorizadas</th>
                <th className="py-3 px-4">Permissões Específicas</th>
                <th className="py-3 px-4">Status & Último Acesso</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {usuariosFiltrados.map((u) => {
                const isAtivoAtual = operadorAtual.id === u.id;
                return (
                  <tr 
                    key={u.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isAtivoAtual ? 'bg-blue-950/20 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    {/* Operador */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
                          u.role === 'ADMIN' ? 'bg-purple-600 text-white' :
                          u.role === 'ENGENHEIRO' ? 'bg-sky-600 text-white' :
                          u.role === 'SUPERVISOR' ? 'bg-blue-600 text-white' :
                          'bg-emerald-600 text-white'
                        }`}>
                          {u.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-white flex items-center gap-1.5">
                            <span>{u.nome}</span>
                            {isAtivoAtual && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                                SESSÃO ATIVA
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.cargo}</div>
                          <div className="text-[10px] font-mono text-slate-500">{u.matricula} • {u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Perfil Técnico */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border inline-block ${getRoleBadgeStyle(u.role)}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Zonas Autorizadas */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.zonasAutorizadas && u.zonasAutorizadas.length > 0 ? (
                          u.zonasAutorizadas.map(zonaId => {
                            const zInfo = ZONAS_DE_OPERACAO.find(z => z.id === zonaId);
                            return (
                              <span 
                                key={zonaId}
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-950 border border-slate-700/80 text-slate-300"
                                title={zInfo?.nome || zonaId}
                              >
                                {zInfo?.codigo || zonaId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-500 text-[10px]">Nenhuma zona</span>
                        )}
                      </div>
                    </td>

                    {/* Permissões */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          title={u.role === 'ENGENHEIRO' || u.role === 'ADMIN' ? 'Edição CAD Permitida' : 'Edição CAD Bloqueada'}
                          className={`p-1 rounded ${
                            u.role === 'ENGENHEIRO' || u.role === 'ADMIN' 
                              ? 'bg-sky-500/20 text-sky-300' 
                              : 'bg-slate-800 text-slate-600'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </span>
                        <span 
                          title={u.role !== 'OPERADOR' ? 'Comando de Bombas Autorizado' : 'Comando de Bombas Bloqueado'}
                          className={`p-1 rounded ${
                            u.role !== 'OPERADOR' 
                              ? 'bg-purple-500/20 text-purple-300' 
                              : 'bg-slate-800 text-slate-600'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </span>
                        <span 
                          title="Visualização Sinóptica"
                          className="p-1 rounded bg-emerald-500/20 text-emerald-300"
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </td>

                    {/* Status & Último Acesso */}
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>{u.status || 'ATIVO'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {new Date(u.ultimoAcesso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isAtivoAtual ? (
                          <button
                            type="button"
                            onClick={() => handleAssumirSessao(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold transition flex items-center gap-1"
                            title="Assumir esta conta como sessão ativa do SCADA"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Assumir</span>
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                            Atual
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => abrirModalEdicao(u)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Editar permissões do usuário"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {u.matricula !== 'ADM-001' && (
                          <button
                            type="button"
                            onClick={() => handleExcluirUsuario(u)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 transition"
                            title="Revogar credencial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL DE CADASTRO / EDIÇÃO DE USUÁRIO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    {modoEdicao ? 'Editar Credencial & Permissões' : 'Cadastrar Novo Operador / Engenheiro'}
                  </h3>
                  <p className="text-xs text-slate-400">Norma FDA 21 CFR Part 11 & IEC 62443</p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarUsuario} className="space-y-4">
              
              {/* Nome e Matrícula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Dra. Camila Duarte"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    Matrícula Industrial *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder="Ex: ENG-882, OP-104, SUP-201"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Perfil Técnico e Cargo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    Perfil Técnico (Role RBAC) *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      const novoRole = e.target.value as OperatorRole;
                      setFormRole(novoRole);
                      setFormPermissoes({
                        canViewSynoptic: true,
                        canEditLayout: novoRole === 'ENGENHEIRO' || novoRole === 'ADMIN',
                        canOperatePumps: novoRole !== 'OPERADOR',
                        canResetInterlocks: novoRole !== 'OPERADOR',
                        canExportReports: true,
                        canManageUsers: novoRole === 'ADMIN'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono font-bold"
                  >
                    <option value="OPERADOR">OPERADOR (Apenas Supervisão Passiva)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Manobras & Parada/Partida)</option>
                    <option value="ENGENHEIRO">ENGENHEIRO (Calibração CAD & Parâmetros)</option>
                    <option value="ADMIN">ADMINISTRADOR (Gestão Global de Segurança)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    Cargo / Especialidade
                  </label>
                  <input
                    type="text"
                    value={formCargo}
                    onChange={(e) => setFormCargo(e.target.value)}
                    placeholder="Ex: Eng. Processos (CREA SP 506982441)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Email e PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    E-mail Corporativo
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="operador@planta-fte.com.br"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono font-bold text-slate-300 block mb-1">
                    PIN / Senha de Assinatura Eletrônica (CFR 21)
                  </label>
                  <input
                    type="password"
                    value={formSenhaPin}
                    onChange={(e) => setFormSenhaPin(e.target.value)}
                    placeholder={modoEdicao ? 'Deixe em branco para manter o PIN atual' : 'Mínimo 4 caracteres (obrigatório)'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Zonas de Operação Autorizadas (Multi-Select) */}
              <div>
                <label className="text-xs font-mono font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Zonas de Operação Autorizadas (Selecione as Zonas):</span>
                  <span className="text-[10px] text-sky-400 font-bold">{formZonas.length} selecionada(s)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ZONAS_DE_OPERACAO.map(zona => {
                    const marcada = formZonas.includes(zona.id);
                    return (
                      <div
                        key={zona.id}
                        onClick={() => handleToggleZona(zona.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          marcada 
                            ? 'bg-blue-950/60 border-blue-500 text-white' 
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[10px] font-mono font-bold text-sky-400">{zona.codigo}</div>
                          <div className="text-xs font-bold truncate">{zona.nome}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                          marcada ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-700'
                        }`}>
                          {marcada && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Permissões Granuladas */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 block">
                  Permissões Granuladas (IEC 62443):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissoes.canEditLayout}
                      onChange={(e) => setFormPermissoes({ ...formPermissoes, canEditLayout: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Destravar Layout CAD & Arrastar Nós</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissoes.canOperatePumps}
                      onChange={(e) => setFormPermissoes({ ...formPermissoes, canOperatePumps: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Ligar / Desligar Bombas de Alta Potência</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissoes.canResetInterlocks}
                      onChange={(e) => setFormPermissoes({ ...formPermissoes, canResetInterlocks: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Rearme Manual de Intertravamentos SIL-2</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissoes.canExportReports}
                      onChange={(e) => setFormPermissoes({ ...formPermissoes, canExportReports: e.target.checked })}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Emitir Laudos Oficiais e Exportar Histórico</span>
                  </label>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition"
                >
                  {modoEdicao ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal Seguro de Confirmação de Revogação de Acesso */}
      {alvoLogin && (
        <PinPrompt
          nome={alvoLogin.nome}
          matricula={alvoLogin.matricula}
          onConfirmar={confirmarLogin}
          onCancelar={() => setAlvoLogin(null)}
        />
      )}

      {usuarioParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Revogar Acesso do Usuário</h3>
                <p className="text-xs text-rose-300 font-mono">Conformidade FDA CFR 21 / IEC 62443</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Deseja realmente revogar o acesso do usuário <strong className="text-white">{usuarioParaExcluir.nome}</strong> (Matrícula: <span className="font-mono text-rose-300">{usuarioParaExcluir.matricula}</span>)?
              Esta ação será gravada na trilha de auditoria do sistema.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUsuarioParaExcluir(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition"
              >
                Revogar Acesso
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
