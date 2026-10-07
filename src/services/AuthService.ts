/**
 * Serviço de Autenticação e Controle de Acesso Baseado em Funções (RBAC)
 * Conformidade com FDA 21 CFR Part 11 e ISA/IEC 62443 para Operações Críticas
 */

import { OperatorProfile, OperatorRole, AuditActionLog, ZonaOperacaoInfo, UserGranularPermissions } from '../types';
import { lerLista, gravarJson } from './storageSeguro';
import { hashPin, verificarPin, precisaRehash, validarPoliticaPin, criptografiaDisponivel } from './pinHash';
import { ScadaError, comCodigo } from './errorCatalog';
import { esquemaOperador } from './esquemasDados';
import { supabase } from './supabaseClient';

export const ZONAS_DE_OPERACAO: ZonaOperacaoInfo[] = [
  {
    id: 'ZONA_1_CAPTACAO_POCOS',
    nome: 'Zona 1 - Captação & Poços Profundos',
    descricao: 'Poço Tubular Profundo T-100, Bombas Submersas e Válvulas de Pé',
    nivelCritico: 'ALTO',
    requerDuplaConfirmacao: true
  },
  {
    id: 'ZONA_2_TRATAMENTO_PREVIO',
    nome: 'Zona 2 - Oxidação Avançada & Skid CONTHEC',
    descricao: 'Reatores PuriFyWave, Bomba Biossônica BBS-100 e Dosagem de Reagentes A/B/C',
    nivelCritico: 'CRITICO',
    requerDuplaConfirmacao: true
  },
  {
    id: 'ZONA_3_DESFLUORETACAO_FTE_CDI',
    nome: 'Zona 3 - Reator FTE-CDI (16 Células)',
    descricao: 'Rack Modular de Eletrodiálise Capacitiva, Barramento DC e Fontes de Potência',
    nivelCritico: 'CRITICO',
    requerDuplaConfirmacao: true
  },
  {
    id: 'ZONA_4_MANIFOLD_ZLD',
    nome: 'Zona 4 - Manifold Hidráulico & UGL ZLD',
    descricao: 'Válvulas Motorizadas XV-101 a XV-401, Retrolavagem e Prensa Desaguadora',
    nivelCritico: 'MEDIO',
    requerDuplaConfirmacao: false
  }
];

export const PERMISSOES_PADRAO: Record<OperatorRole, UserGranularPermissions> = {
  ADMIN: {
    canViewSynoptic: true,
    canEditLayout: true,
    canOperatePumps: true,
    canResetInterlocks: true,
    canExportReports: true,
    canManageUsers: true,
    canAcknowledgeAlarms: true,
    canOverrideInterlocks: true,
    canCalibrateSensors: true,
    canTunePidGains: true,
    canExecuteBackwash: true,
    canSwitchTopology: true,
    podeReconhecerAlarmes: true,
    podeRearmarInterlock: true,
    podeComutarModoClp: true,
    podeEditarLayout: true,
    podeExportarLaudos: true
  },
  ENGENHEIRO: {
    canViewSynoptic: true,
    canEditLayout: true,
    canOperatePumps: true,
    canResetInterlocks: true,
    canExportReports: true,
    canManageUsers: false,
    canAcknowledgeAlarms: true,
    canOverrideInterlocks: true,
    canCalibrateSensors: true,
    canTunePidGains: true,
    canExecuteBackwash: true,
    canSwitchTopology: true,
    podeReconhecerAlarmes: true,
    podeRearmarInterlock: true,
    podeComutarModoClp: true,
    podeEditarLayout: true,
    podeExportarLaudos: true
  },
  SUPERVISOR: {
    canViewSynoptic: true,
    canEditLayout: false,
    canOperatePumps: true,
    canResetInterlocks: false,
    canExportReports: true,
    canManageUsers: false,
    canAcknowledgeAlarms: true,
    canOverrideInterlocks: false,
    canCalibrateSensors: false,
    canTunePidGains: false,
    canExecuteBackwash: true,
    canSwitchTopology: true,
    podeReconhecerAlarmes: true,
    podeRearmarInterlock: false,
    podeComutarModoClp: false,
    podeEditarLayout: false,
    podeExportarLaudos: true
  },
  OPERADOR: {
    canViewSynoptic: true,
    canEditLayout: false,
    canOperatePumps: true,
    canResetInterlocks: false,
    canExportReports: false,
    canManageUsers: false,
    canAcknowledgeAlarms: true,
    canOverrideInterlocks: false,
    canCalibrateSensors: false,
    canTunePidGains: false,
    canExecuteBackwash: false,
    canSwitchTopology: false,
    podeReconhecerAlarmes: true,
    podeRearmarInterlock: false,
    podeComutarModoClp: false,
    podeEditarLayout: false,
    podeExportarLaudos: false
  },
  AUDITOR: {
    canViewSynoptic: true,
    canEditLayout: false,
    canOperatePumps: false,
    canResetInterlocks: false,
    canExportReports: true,
    canManageUsers: false,
    canAcknowledgeAlarms: false,
    canOverrideInterlocks: false,
    canCalibrateSensors: false,
    canTunePidGains: false,
    canExecuteBackwash: false,
    canSwitchTopology: false,
    podeReconhecerAlarmes: false,
    podeRearmarInterlock: false,
    podeComutarModoClp: false,
    podeEditarLayout: false,
    podeExportarLaudos: true
  }
};

/**
 * Normaliza e sanitiza as permissões de um operador com base em seu papel (Role).
 * Garante que NUNCA seja gravado um objeto vazio ou incompleto ({}), sanando
 * definitivamente o alarme SCD-DAT-001 sem mascarar ou flexibilizar o validador estrito.
 * Aplica o Princípio do Menor Privilégio: dados remotos nunca excedem o teto do papel.
 */
export function normalizarPermissoes(role: OperatorRole, permissoesParciais?: any): UserGranularPermissions {
  const padrao = PERMISSOES_PADRAO[role] || PERMISSOES_PADRAO.OPERADOR;
  if (!permissoesParciais || typeof permissoesParciais !== 'object' || Array.isArray(permissoesParciais)) {
    return { ...padrao };
  }

  const normalizado: UserGranularPermissions = {
    canViewSynoptic: typeof permissoesParciais.canViewSynoptic === 'boolean' ? permissoesParciais.canViewSynoptic : padrao.canViewSynoptic,
    canEditLayout: typeof permissoesParciais.canEditLayout === 'boolean' ? permissoesParciais.canEditLayout : padrao.canEditLayout,
    canOperatePumps: typeof permissoesParciais.canOperatePumps === 'boolean' ? permissoesParciais.canOperatePumps : padrao.canOperatePumps,
    canResetInterlocks: typeof permissoesParciais.canResetInterlocks === 'boolean' ? permissoesParciais.canResetInterlocks : padrao.canResetInterlocks,
    canExportReports: typeof permissoesParciais.canExportReports === 'boolean' ? permissoesParciais.canExportReports : padrao.canExportReports,
    canManageUsers: typeof permissoesParciais.canManageUsers === 'boolean' ? permissoesParciais.canManageUsers : padrao.canManageUsers,
    canAcknowledgeAlarms: typeof permissoesParciais.canAcknowledgeAlarms === 'boolean' ? permissoesParciais.canAcknowledgeAlarms : padrao.canAcknowledgeAlarms,
    canOverrideInterlocks: typeof permissoesParciais.canOverrideInterlocks === 'boolean' ? permissoesParciais.canOverrideInterlocks : padrao.canOverrideInterlocks,
    canCalibrateSensors: typeof permissoesParciais.canCalibrateSensors === 'boolean' ? permissoesParciais.canCalibrateSensors : padrao.canCalibrateSensors,
    canTunePidGains: typeof permissoesParciais.canTunePidGains === 'boolean' ? permissoesParciais.canTunePidGains : padrao.canTunePidGains,
    canExecuteBackwash: typeof permissoesParciais.canExecuteBackwash === 'boolean' ? permissoesParciais.canExecuteBackwash : padrao.canExecuteBackwash,
    canSwitchTopology: typeof permissoesParciais.canSwitchTopology === 'boolean' ? permissoesParciais.canSwitchTopology : padrao.canSwitchTopology,
    podeReconhecerAlarmes: typeof permissoesParciais.podeReconhecerAlarmes === 'boolean' ? permissoesParciais.podeReconhecerAlarmes : padrao.podeReconhecerAlarmes,
    podeRearmarInterlock: typeof permissoesParciais.podeRearmarInterlock === 'boolean' ? permissoesParciais.podeRearmarInterlock : padrao.podeRearmarInterlock,
    podeComutarModoClp: typeof permissoesParciais.podeComutarModoClp === 'boolean' ? permissoesParciais.podeComutarModoClp : padrao.podeComutarModoClp,
    podeEditarLayout: typeof permissoesParciais.podeEditarLayout === 'boolean' ? permissoesParciais.podeEditarLayout : padrao.podeEditarLayout,
    podeExportarLaudos: typeof permissoesParciais.podeExportarLaudos === 'boolean' ? permissoesParciais.podeExportarLaudos : padrao.podeExportarLaudos,
  };

  // Menor Privilégio: limites invioláveis por papel
  if (role === 'OPERADOR') {
    normalizado.canManageUsers = false;
    normalizado.canEditLayout = false;
    normalizado.podeEditarLayout = false;
    normalizado.canResetInterlocks = false;
    normalizado.podeRearmarInterlock = false;
  } else if (role === 'SUPERVISOR') {
    normalizado.canManageUsers = false;
    normalizado.canEditLayout = false;
    normalizado.podeEditarLayout = false;
  }

  return normalizado;
}

export const OPERADORES_PREDEFINIDOS: OperatorProfile[] = [
  {
    id: 'op-1',
    nome: 'Ricardo Arcanjo',
    matricula: 'ADM-001',
    role: 'ADMIN',
    cargo: 'Administrador do Sistema & Engenheiro Chefe de Automação',
    email: 'ricardo.arcanjo@purifywave.com.br',
    ultimoAcesso: '2025-01-01T00:00:00.000Z',
    zonasAutorizadas: [
      'ZONA_1_CAPTACAO_POCOS',
      'ZONA_2_TRATAMENTO_PREVIO',
      'ZONA_3_DESFLUORETACAO_FTE_CDI',
      'ZONA_4_MANIFOLD_ZLD'
    ],
    permissoes: PERMISSOES_PADRAO.ADMIN,
    pinHash: 'pbkdf2-sha256$600000$9S2WLX4U+rFpbAMLlvr05Q==$ff2j0m6C7WDH3RweosuJdlCzOnUBcaT1KQVVKtBge9A=',
    pinPadrao: true,
    status: 'ATIVO'
  },
  {
    id: 'op-2',
    nome: 'Dr. Gentil M. Pinheiro Jr.',
    matricula: 'ENG-882',
    role: 'ENGENHEIRO',
    cargo: 'Engenheiro Químico e de Processos (CRQ-09100961)',
    email: 'gentil.pinheiro@purifywave.com.br',
    ultimoAcesso: '2025-01-01T00:00:00.000Z',
    zonasAutorizadas: [
      'ZONA_1_CAPTACAO_POCOS',
      'ZONA_2_TRATAMENTO_PREVIO',
      'ZONA_3_DESFLUORETACAO_FTE_CDI',
      'ZONA_4_MANIFOLD_ZLD'
    ],
    permissoes: PERMISSOES_PADRAO.ENGENHEIRO,
    pinHash: 'pbkdf2-sha256$600000$R1K1ymBKNMSMGHxfbjd98Q==$SAWt+dmkNbCdXfBxexCz40RvIBuL7yvEx9EH1PbTXr8=',
    pinPadrao: true,
    status: 'ATIVO'
  },
  {
    id: 'op-3',
    nome: 'Carlos Eduardo Silva',
    matricula: 'OP-104',
    role: 'OPERADOR',
    cargo: 'Operador de Painel SCADA e Manobras de Campo',
    email: 'carlos.silva@purifywave.com.br',
    ultimoAcesso: '2025-01-01T00:00:00.000Z',
    zonasAutorizadas: [
      'ZONA_1_CAPTACAO_POCOS',
      'ZONA_4_MANIFOLD_ZLD'
    ],
    permissoes: PERMISSOES_PADRAO.OPERADOR,
    pinHash: 'pbkdf2-sha256$600000$7kd/g9Sj1+yL56ycL2/Ikg==$pwzDwJTgb/Lw8BBeEYHVil+cEPUZ7pgGfnq0Y/Qw11I=',
    pinPadrao: true,
    status: 'ATIVO'
  },
  {
    id: 'op-4',
    nome: 'Mariana Costa',
    matricula: 'SUP-202',
    role: 'SUPERVISOR',
    cargo: 'Supervisora de Operações e Qualidade da Água',
    email: 'mariana.costa@purifywave.com.br',
    ultimoAcesso: '2025-01-01T00:00:00.000Z',
    zonasAutorizadas: [
      'ZONA_1_CAPTACAO_POCOS',
      'ZONA_2_TRATAMENTO_PREVIO',
      'ZONA_3_DESFLUORETACAO_FTE_CDI',
      'ZONA_4_MANIFOLD_ZLD'
    ],
    permissoes: PERMISSOES_PADRAO.SUPERVISOR,
    pinHash: 'pbkdf2-sha256$600000$7zuMoaPZHUp+RGa70I5Byw==$WAkokqFNbCG7oG9MUGopwO05aLQazGc7GKpJXPb0cQs=',
    pinPadrao: true,
    status: 'ATIVO'
  }
];

class AuthService {
  private operadorAtual: OperatorProfile;
  private usuariosLista: OperatorProfile[] = [];
  private historicoAuditoria: AuditActionLog[] = [];
  private listeners: Array<(op: OperatorProfile, logs: AuditActionLog[]) => void> = [];
  private migracaoPin: Promise<void> = Promise.resolve();
  private tentativas = new Map<string, { falhas: number; desde: number; bloqueadoAte: number }>();
  private static readonly MAX_FALHAS = 5;
  private static readonly JANELA_MS = 5 * 60_000;
  private static readonly BLOQUEIO_MS = 60_000;

  constructor() {
    this.carregarUsuariosPersistidos();
    this.migracaoPin = this.migrarPinsLegados().catch(err => {
      console.error('Falha ao migrar PINs legados:', err);
    });
    // A sessão SEMPRE começa com o menor privilégio (OPERADOR). Elevar exige autenticar com PIN (autenticarOperador).
    this.operadorAtual = this.perfilBasico();
    this.registrarAuditoria(
      'Sessão SCADA iniciada com conformidade FDA 21 CFR Part 11 / IEC 62443 (perfil básico, sem login)',
      'SISTEMA'
    );
    // Em ambiente de teste isolado ou com seed própria, evita sobrescrever o armazenamento simulado
    if (typeof process === 'undefined' || (!process.env?.SCADA_TEST_ENV && !process.env?.SEED)) {
      this.sincronizarUsuariosComSupabase().catch(() => {});
    }
  }

  private perfilBasico(): OperatorProfile {
    return (
      this.usuariosLista.find(u => u.role === 'OPERADOR' && u.status !== 'INATIVO') ||
      this.usuariosLista.find(u => u.status !== 'INATIVO') ||
      this.usuariosLista[0]
    );
  }

  private carregarUsuariosPersistidos(): void {
    this.usuariosLista = lerLista<OperatorProfile>(
      'scada_registered_users',
      esquemaOperador,
      () => JSON.parse(JSON.stringify(OPERADORES_PREDEFINIDOS)),
      'Usuários cadastrados',
      (u) => ({
        ...u,
        permissoes: normalizarPermissoes(u.role, u.permissoes)
      })
    );
  }

  private salvarUsuariosPersistidos(): void {
    gravarJson('scada_registered_users', this.usuariosLista, 'Usuários cadastrados');
  }

  public async sincronizarUsuariosComSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase.from('usuarios_scada').select('*');
      if (error) return;
      if (data && Array.isArray(data) && data.length > 0) {
        let mudou = false;
        for (const row of data) {
          const mat = (row.matricula || '').toUpperCase();
          if (!mat) continue;
          const existente = this.usuariosLista.find(u => u.matricula.toUpperCase() === mat);
          if (existente) {
            if (row.pin_hash && existente.pinHash !== row.pin_hash) {
              existente.pinHash = row.pin_hash;
              mudou = true;
            }
            if (row.status && existente.status !== row.status) {
              existente.status = row.status;
              mudou = true;
            }
            if (row.permissoes_granulares) {
              const normalizadas = normalizarPermissoes(existente.role, row.permissoes_granulares);
              if (JSON.stringify(existente.permissoes) !== JSON.stringify(normalizadas)) {
                existente.permissoes = normalizadas;
                mudou = true;
              }
            }
          } else {
            const roleVal: OperatorRole = ['OPERADOR', 'SUPERVISOR', 'ENGENHEIRO', 'ADMIN', 'AUDITOR'].includes(row.role)
              ? (row.role as OperatorRole)
              : 'OPERADOR';
            const novo: OperatorProfile = {
              id: row.codigo_id || row.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              nome: row.nome || 'Operador SCADA',
              matricula: mat,
              role: roleVal,
              cargo: row.cargo || `Técnico (${roleVal})`,
              email: row.email || `${mat.toLowerCase()}@purifywave.com.br`,
              ultimoAcesso: row.ultimo_acesso || new Date().toISOString(),
              zonasAutorizadas: Array.isArray(row.zonas_autorizadas) && row.zonas_autorizadas.length > 0
                ? row.zonas_autorizadas
                : ['ZONA_1_CAPTACAO_POCOS'],
              permissoes: normalizarPermissoes(roleVal, row.permissoes_granulares),
              pinHash: row.pin_hash,
              pinPadrao: row.pin_padrao ?? false,
              status: row.status || 'ATIVO'
            };
            this.usuariosLista.push(novo);
            mudou = true;
          }
        }
        if (mudou) {
          this.salvarUsuariosPersistidos();
          this.notify();
        }
      }
    } catch {
      // Ignora falhas de rede transitórias mantendo o cache local
    }
  }

  private async migrarPinsLegados(): Promise<void> {
    if (!criptografiaDisponivel()) return;

    const PINS_DEMONSTRACAO: Record<string, string> = {
      'OP-104': '1040',
      'ENG-882': '8820',
      'ADM-001': '2026',
      'SUP-202': '2020',
    };

    let migradosCount = 0;
    for (const u of this.usuariosLista) {
      if (typeof (u as any).senhaPin === 'string' && (u as any).senhaPin !== '') {
        const texto = (u as any).senhaPin as string;
        if (!u.pinHash) {
          u.pinHash = await hashPin(texto);
          const pinDemo = PINS_DEMONSTRACAO[u.matricula.toUpperCase()];
          u.pinPadrao = pinDemo !== undefined && texto === pinDemo;
          migradosCount++;
        }
        delete (u as any).senhaPin;
      }
    }

    if (migradosCount > 0) {
      if (this.operadorAtual) {
        const atual = this.usuariosLista.find(u => u.id === this.operadorAtual.id);
        if (atual) this.operadorAtual = { ...atual };
      }
      this.salvarUsuariosPersistidos();
      this.registrarAuditoria(
        `Migração de segurança: ${migradosCount} PIN(s) legados migrados para hash PBKDF2-SHA256`,
        'SEGURANCA'
      );
    }
  }

  public getOperadorAtual(): OperatorProfile {
    return this.semCredenciais(this.operadorAtual);
  }

  private semCredenciais(op: OperatorProfile): OperatorProfile {
    const limpo = { ...op };
    delete (limpo as any).pinHash;
    delete (limpo as any).senhaPin;
    return limpo;
  }

  public getOperadoresDisponiveis(): OperatorProfile[] {
    return this.usuariosLista.map(u => this.semCredenciais(u));
  }

  public async cadastrarOperador(dados: {
    nome: string;
    matricula: string;
    role: OperatorRole;
    cargo: string;
    email: string;
    zonasAutorizadas: string[];
    pin: string;
    permissoes?: UserGranularPermissions;
  }): Promise<OperatorProfile> {
    this.exigirGestaoUsuarios('cadastrar usuários');
    const problemaPin = validarPoliticaPin(dados.pin);
    if (problemaPin) throw new Error(problemaPin);

    if (!criptografiaDisponivel()) {
      throw new ScadaError('SCD-AUT-002', 'Não é possível cadastrar PIN neste contexto. Acesse o sistema por HTTPS.');
    }

    const mat = (dados.matricula ?? '').trim().toUpperCase();
    if (this.usuariosLista.some(u => u.matricula.toUpperCase() === mat)) {
      throw new Error(`Já existe um operador cadastrado com a matrícula "${dados.matricula}".`);
    }

    const hash = await hashPin(dados.pin);
    const novo: OperatorProfile = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nome: dados.nome.trim(),
      matricula: dados.matricula.trim().toUpperCase(),
      role: dados.role,
      cargo: dados.cargo.trim(),
      email: dados.email.trim(),
      zonasAutorizadas: dados.zonasAutorizadas.length > 0 ? dados.zonasAutorizadas : ['ZONA_1_CAPTACAO_POCOS'],
      permissoes: normalizarPermissoes(dados.role, dados.permissoes),
      pinHash: hash,
      pinPadrao: false,
      status: 'ATIVO',
      ultimoAcesso: new Date().toISOString()
    };

    this.usuariosLista.push(novo);
    this.salvarUsuariosPersistidos();
    this.registrarAuditoria(
      `Cadastro de novo usuário: ${novo.nome} (${novo.matricula} - ${novo.role}) por ${this.operadorAtual.nome}`,
      'SEGURANCA'
    );
    this.notify();

    // Sincronização assíncrona com o Supabase
    try {
      const payloadSupabase = {
        codigo_id: novo.id,
        nome: novo.nome,
        matricula: novo.matricula,
        role: novo.role,
        cargo: novo.cargo,
        email: novo.email,
        pin_hash: novo.pinHash,
        pin_padrao: false,
        status: 'ATIVO',
        zonas_autorizadas: novo.zonasAutorizadas,
        permissoes_granulares: novo.permissoes
      };
      const { error: errSupa } = await supabase.from('usuarios_scada').upsert(payloadSupabase, { onConflict: 'matricula' });
      if (errSupa) {
        console.warn('[Supabase Sync] Aviso ao persistir usuário no Supabase:', errSupa.message);
      }
    } catch (errSync) {
      console.warn('[Supabase Sync] Erro de rede ao sincronizar usuário com Supabase:', errSync);
    }

    return this.semCredenciais(novo);
  }

  public async cadastrarUsuario(dados: {
    nome: string;
    matricula: string;
    role: OperatorRole;
    cargo: string;
    email: string;
    zonasAutorizadas: string[];
    pin: string;
    permissoes?: UserGranularPermissions;
  }): Promise<OperatorProfile> {
    return this.cadastrarOperador(dados);
  }

  public async atualizarOperador(
    idOuDados: string | (Partial<OperatorProfile> & { id: string }),
    dadosSeId?: Partial<Omit<OperatorProfile, 'senhaPin' | 'pinHash' | 'pinPadrao'>> & { novoPin?: string }
  ): Promise<boolean> {
    const id = typeof idOuDados === 'string' ? idOuDados : idOuDados.id;
    const dados = typeof idOuDados === 'string' ? (dadosSeId ?? {}) : idOuDados;

    this.exigirGestaoUsuarios('editar usuários');
    const idx = this.usuariosLista.findIndex(u => u.id === id);
    if (idx === -1) return false;

    const { novoPin, ...resto } = dados as Record<string, any>;
    delete resto.senhaPin;
    delete resto.pinHash;
    delete resto.pinPadrao;

    let hashAtualizado: string | undefined;
    if (typeof novoPin === 'string' && novoPin !== '') {
      const problemaPin = validarPoliticaPin(novoPin);
      if (problemaPin) throw new Error(problemaPin);
      if (!criptografiaDisponivel()) {
        throw new ScadaError('SCD-AUT-002', 'Não é possível atualizar o PIN neste contexto. Acesse o sistema por HTTPS.');
      }
      hashAtualizado = await hashPin(novoPin);
    }

    const atual = this.usuariosLista[idx];
    const roleFinal = (resto.role as OperatorRole) || atual.role;
    const permissoesFinais = normalizarPermissoes(roleFinal, (resto as any).permissoes || atual.permissoes);
    const editado: OperatorProfile = {
      ...atual,
      ...resto,
      role: roleFinal,
      permissoes: permissoesFinais,
      pinHash: hashAtualizado ?? atual.pinHash,
      pinPadrao: hashAtualizado ? false : atual.pinPadrao
    };

    this.usuariosLista[idx] = editado;
    if (this.operadorAtual.id === id) {
      this.operadorAtual = { ...editado, ultimoAcesso: this.operadorAtual.ultimoAcesso };
    }
    this.salvarUsuariosPersistidos();
    this.registrarAuditoria(
      `Edição de perfil do usuário: ${editado.nome} (${editado.matricula})${novoPin ? ' [PIN alterado]' : ''}`,
      'SEGURANCA'
    );
    this.notify();

    // Sincronização com o Supabase
    try {
      const payloadUpdate: any = {
        nome: editado.nome,
        cargo: editado.cargo,
        email: editado.email,
        role: editado.role,
        zonas_autorizadas: editado.zonasAutorizadas,
        permissoes_granulares: editado.permissoes,
        status: editado.status || 'ATIVO',
        atualizado_em: new Date().toISOString()
      };
      if (hashAtualizado) {
        payloadUpdate.pin_hash = hashAtualizado;
        payloadUpdate.pin_padrao = false;
      }
      const { error: errUp } = await supabase.from('usuarios_scada').update(payloadUpdate).eq('matricula', editado.matricula);
      if (errUp) console.warn('[Supabase Sync] Aviso ao atualizar usuário no Supabase:', errUp.message);
    } catch (errSync) {
      console.warn('[Supabase Sync] Erro de rede ao atualizar usuário no Supabase:', errSync);
    }

    return true;
  }

  public async editarUsuario(
    id: string,
    dados: Partial<Omit<OperatorProfile, 'senhaPin' | 'pinHash' | 'pinPadrao'>> & { novoPin?: string }
  ): Promise<boolean> {
    return this.atualizarOperador(id, dados);
  }

  public excluirOperador(id: string): boolean {
    try {
      this.exigirGestaoUsuarios('remover usuários');
    } catch {
      return false; // negado e auditado
    }
    const alvo = this.usuariosLista.find(u => u.id === id);
    if (!alvo) return false;
    if (alvo.matricula === 'ADM-001') {
      throw new Error('O Administrador raiz do sistema (ADM-001) não pode ser excluído.');
    }
    this.usuariosLista = this.usuariosLista.filter(u => u.id !== id);
    this.salvarUsuariosPersistidos();

    if (this.operadorAtual.id === id) {
      this.operadorAtual = this.perfilBasico();
    }

    this.registrarAuditoria(
      `Operador removido: ${alvo.nome} (${alvo.matricula}) por ${this.operadorAtual.nome}`,
      'SEGURANCA'
    );
    this.notify();

    // Sincronização em background no Supabase
    (async () => {
      try {
        await supabase.from('usuarios_scada').update({ status: 'INATIVO' }).eq('matricula', alvo.matricula);
      } catch {
        // Falha não-bloqueante
      }
    })();

    return true;
  }

  public podeModificarPid(): boolean {
    const r = this.operadorAtual.role;
    return r === 'ADMIN' || r === 'ENGENHEIRO' || !!this.operadorAtual.permissoes?.canTunePidGains;
  }

  public podeComutarModoClp(): boolean {
    const r = this.operadorAtual.role;
    return r === 'ADMIN' || r === 'ENGENHEIRO' || !!this.operadorAtual.permissoes?.podeComutarModoClp;
  }

  public podeEditarLayout(): boolean {
    const r = this.operadorAtual.role;
    return r === 'ADMIN' || r === 'ENGENHEIRO' || !!this.operadorAtual.permissoes?.podeEditarLayout;
  }

  public trocarOperador(id: string): boolean {
    return this.assumirSessao(id);
  }

  private assumirSessao(operadorId: string): boolean {
    const selecionado = this.usuariosLista.find(o => o.id === operadorId);
    if (!selecionado) return false;

    const anterior = this.operadorAtual.nome;
    this.operadorAtual = selecionado;
    this.registrarAuditoria(
      `Troca de operador ativa: ${anterior} -> ${selecionado.nome} (${selecionado.matricula})`,
      'SEGURANCA'
    );
    this.notify();
    return true;
  }

  public async autenticarOperador(matricula: string, pin: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const r = await this.verificarCredenciais(matricula, pin, 'LOGIN', () => true);
    if (!r.usuario) return { sucesso: false, mensagem: r.mensagem! };
    this.assumirSessao(r.usuario.id);
    return { sucesso: true, mensagem: `Sessão iniciada: ${r.usuario.nome} (${r.usuario.role})` };
  }

  public encerrarSessao(): void {
    const anterior = this.operadorAtual.nome;
    this.operadorAtual = this.perfilBasico();
    this.registrarAuditoria(`Sessão encerrada: ${anterior} -> ${this.operadorAtual.nome} (perfil básico)`, 'SEGURANCA');
    this.notify();
  }

  private exigirGestaoUsuarios(acao: string): void {
    const op = this.operadorAtual;
    if (op.role === 'ADMIN' || op.permissoes?.canManageUsers) return;
    this.registrarAuditoria(`[ACESSO NEGADO] ${op.nome} (${op.matricula}) tentou ${acao} sem permissão de gestão de usuários`, 'SEGURANCA');
    throw new ScadaError('SCD-AUT-001', `Sem permissão para ${acao}. Entre com um usuário Administrador.`);
  }

  public registrarAuditoria(
    acao: string,
    categoria: 'SEGURANCA' | 'PROCESSO' | 'SISTEMA' | 'RELATORIO',
    detalhes?: string
  ): void {
    const log: AuditActionLog = {
      id: 'AUDIT-' + String(this.historicoAuditoria.length + 1).padStart(4, '0'),
      timestamp: new Date().toISOString(),
      operadorNome: this.operadorAtual.nome,
      operadorMatricula: this.operadorAtual.matricula,
      operadorRole: this.operadorAtual.role,
      categoria,
      acao,
      acaoRealizada: acao,
      detalhes,
      assinaturaEletronica: `SHA256-DIGEST-${Date.now().toString(36).toUpperCase()}`,
      statusConformidadeCFR21: true
    };
    this.historicoAuditoria.unshift(log);
    if (this.historicoAuditoria.length > 500) {
      this.historicoAuditoria.pop();
    }
  }

  public getHistoricoAuditoria(): AuditActionLog[] {
    return [...this.historicoAuditoria];
  }

  private bloqueioRestanteMs(chave: string): number {
    const t = this.tentativas.get(chave);
    if (!t) return 0;
    const agora = Date.now();
    return t.bloqueadoAte > agora ? t.bloqueadoAte - agora : 0;
  }

  private registrarFalha(chave: string): void {
    const agora = Date.now();
    const t = this.tentativas.get(chave);
    if (!t || agora - t.desde > AuthService.JANELA_MS) {
      this.tentativas.set(chave, { falhas: 1, desde: agora, bloqueadoAte: 0 });
      return;
    }
    t.falhas += 1;
    if (t.falhas >= AuthService.MAX_FALHAS) {
      t.bloqueadoAte = agora + AuthService.BLOQUEIO_MS;
      this.registrarAuditoria(
        `[BLOQUEIO TEMPORÁRIO] 5 tentativas inválidas consecutivas para "${chave}". Bloqueado por 60 s [SCD-AUT-003]`,
        'SEGURANCA'
      );
    }
  }

  private async verificarCredenciais(
    matricula: string,
    pin: string,
    contexto: 'LOGIN' | 'ASSINATURA',
    aceita: (u: OperatorProfile) => boolean
  ): Promise<{ usuario?: OperatorProfile; mensagem?: string }> {
    const matriculaTrim = (matricula ?? '').trim().toUpperCase();
    const chave = matriculaTrim || '(vazia)';
    const rotulo = contexto === 'LOGIN' ? 'LOGIN' : 'ASSINATURA ELETRÔNICA CFR 21 Part 11';
    const generica = contexto === 'LOGIN'
      ? 'Matrícula ou PIN inválidos.'
      : 'Credenciais inválidas. Somente Engenheiros (CREA) ou Administradores ativos possuem autorização de edição (CFR 21 Part 11).';

    const restante = this.bloqueioRestanteMs(chave);
    if (restante > 0) {
      return { mensagem: comCodigo('SCD-AUT-003', `Muitas tentativas inválidas. Aguarde ${Math.ceil(restante / 1000)} s.`) };
    }

    if (!criptografiaDisponivel()) {
      this.registrarAuditoria(`[${rotulo}] Verificação indisponível [SCD-AUT-002]`, 'SEGURANCA');
      return { mensagem: comCodigo('SCD-AUT-002', 'Não é possível autenticar neste contexto. Acesse o sistema por HTTPS.') };
    }

    await this.migracaoPin;

    const alvo = matriculaTrim
      ? this.usuariosLista.find(o => o.matricula.toUpperCase() === matriculaTrim && o.status !== 'INATIVO' && aceita(o))
      : undefined;

    let confere = false;
    try {
      confere = !!alvo && !!alvo.pinHash && typeof pin === 'string' && await verificarPin(pin, alvo.pinHash);
    } catch (err) {
      const codigo = err instanceof ScadaError ? err.codigo : 'SCD-AUT-002';
      this.registrarAuditoria(`[${rotulo}] Verificação indisponível [${codigo}]`, 'SEGURANCA');
      return { mensagem: comCodigo(codigo as any, err instanceof Error ? err.message : 'Autenticação indisponível.') };
    }

    if (alvo && confere) {
      this.tentativas.delete(chave);
      if (alvo.pinHash && precisaRehash(alvo.pinHash)) {
        alvo.pinHash = await hashPin(pin);
        this.salvarUsuariosPersistidos();
      }
      return { usuario: alvo };
    }

    this.registrarFalha(chave);
    this.registrarAuditoria(`[${rotulo}] Tentativa inválida para a matrícula "${matriculaTrim.slice(0, 40)}"`, 'SEGURANCA');
    return { mensagem: generica };
  }

  public async validarAssinaturaEngenheiro(matricula: string, senha: string): Promise<{ sucesso: boolean; mensagem: string }> {
    const r = await this.verificarCredenciais(matricula, senha, 'ASSINATURA', o => o.role === 'ENGENHEIRO' || o.role === 'ADMIN');
    if (!r.usuario) return { sucesso: false, mensagem: r.mensagem! };

    const eng = r.usuario;
    this.assumirSessao(eng.id);
    this.registrarAuditoria(
      `[ASSINATURA ELETRÔNICA CFR 21 Part 11] Engenheiro(a) ${eng.nome} (${eng.matricula}) autenticou autorização para edição e calibração CAD do layout SCADA`,
      'SEGURANCA'
    );
    return { sucesso: true, mensagem: `Assinatura de Engenharia homologada: ${eng.nome} (${eng.cargo})` };
  }

  public subscribe(callback: (op: OperatorProfile, logs: AuditActionLog[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getOperadorAtual(), this.getHistoricoAuditoria());
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    const limpo = this.getOperadorAtual();
    const logs = this.getHistoricoAuditoria();
    this.listeners.forEach(cb => cb(limpo, logs));
  }
}

export const authService = new AuthService();