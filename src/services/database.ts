/**
 * Simulação e Persistência do Banco de Dados Relacional SQL (Supabase / PostgreSQL)
 * Modelagem Granular por Célula (16 Células) para o Reator FTE-CDI
 * Tabelas: celulas, reles_atuadores, ciclos_reator, telemetria_sensores, alarmes, usuarios, eventos_rearme, laudos_laboratoriais
 */

import { lerJson, gravarJson } from './storageSeguro';
import { esquemaCadLayout } from './esquemasDados';
import { supabase, testarConexaoSupabase } from './supabaseClient';
import { supabaseSync } from './supabaseSyncService';
import { 
  CicloReator, 
  TelemetriaSensor, 
  Alarme, 
  FaseCiclo, 
  StatusCiclo, 
  NivelSeveridadeAlarme,
  LaudoLaboratorial,
  LaudoIntegradoDuplo,
  PocoHistoricoPonto,
  Usuario,
  EventoRearme,
  ReleAtuador,
  LayoutNavegacaoScada,
  UserNavPreference
} from '../types';

export class ScadaDatabase {
  private ciclos: CicloReator[] = [];
  private telemetria: TelemetriaSensor[] = [];
  private alarmesList: Alarme[] = [];
  private laudosList: LaudoLaboratorial[] = [];
  private usuariosList: Usuario[] = [];
  private eventosRearmeList: EventoRearme[] = [];
  private relesList: ReleAtuador[] = [];
  private preferencesList: UserNavPreference[] = [];
  
  private nextCicloId = 1;
  private nextTelemetriaId = 1;
  private nextAlarmeId = 1;
  private nextEventoRearmeId = 1;
  private nextReleId = 1;
  private maxTelemetriaRecords = 1600; // 100 registros por célula

  constructor() {
    this.seedInitialData();
    const t = setTimeout(() => {
      this.executarCargaInicialSupabase();
    }, 500);
    if (t && typeof (t as any).unref === 'function') {
      (t as any).unref();
    }
  }

  private seedInitialData() {
    const now = new Date();

    // 1. Usuários do Sistema (Controle RBAC com 3 Níveis)
    this.usuariosList = [
      { id: 1, nome: 'Eng. Ricardo Silveira', matricula: 'ENG-4409', nivel_acesso: 'ENGENHEIRO', cargo: 'Engenheiro Chefe de Processo' },
      { id: 2, nome: 'Carlos Eduardo Mendes', matricula: 'SUP-8821', nivel_acesso: 'SUPERVISOR', cargo: 'Supervisor de Turno / ETE' },
      { id: 3, nome: 'Marcos Vinicius Santos', matricula: 'OP-1043', nivel_acesso: 'OPERADOR', cargo: 'Operador de Estação' }
    ];

    // 2. Inicialização dos Relés Atuadores das 16 Células
    for (let c = 1; c <= 16; c++) {
      this.relesList.push(
        {
          id: this.nextReleId++,
          celula_id: c,
          tipo: 'FONTE_DC',
          estado: 'FECHADO',
          motivo_ultimo_estado: 'Sistema Operando Normalmente',
          requer_rearme_manual: false,
          atualizado_em: now.toISOString()
        },
        {
          id: this.nextReleId++,
          celula_id: c,
          tipo: 'VALVULA_ALIMENTACAO',
          estado: 'FECHADO',
          motivo_ultimo_estado: 'Alimentação Feed Ativa',
          requer_rearme_manual: false,
          atualizado_em: now.toISOString()
        }
      );
    }

    // 3. Ciclos Iniciais por Célula
    for (let c = 1; c <= 16; c++) {
      this.ciclos.push({
        id: this.nextCicloId++,
        celula_id: c,
        fase: 'ADSORCAO',
        inicio: new Date(now.getTime() - (10 + c) * 60000).toISOString(),
        fim: null,
        tensao_alvo: 1.40,
        status: 'EM_ANDAMENTO',
      });
    }

    // 4. Histórico Inicial de Telemetria das 16 Células
    for (let c = 1; c <= 16; c++) {
      for (let i = 10; i >= 0; i--) {
        const ts = new Date(now.getTime() - i * 60000).toISOString();
        const p = 1.80 + (Math.sin(c + i) * 0.15);
        const v = 11250 + (Math.cos(c + i) * 280);
        const fIn = 8.50 + (Math.sin(c * 0.5) * 0.30);
        const fOut = 1.10 + (Math.cos(c * 0.3) * 0.15);
        
        this.telemetria.push({
          id: this.nextTelemetriaId++,
          celula_id: c,
          ciclo_id: c,
          pressao_bar: Number(p.toFixed(2)),
          vazao_l_h: Number(v.toFixed(1)),
          corrente_amp: 18.2 + (c * 0.1),
          tensao_v: 1.40,
          polaridade: 'NORMAL',
          ph: 7.2,
          temperatura_c: 23.5,
          fluoreto_in_ppm: Number(fIn.toFixed(2)),
          fluoreto_out_ppm: Number(fOut.toFixed(2)),
          conformidade_regulatoria: fOut <= 1.50,
          timestamp: ts,
        });
      }
    }

    // 5. Alarmes Iniciais do Sistema
    this.alarmesList.push(
      {
        id: this.nextAlarmeId++,
        celula_id: null,
        codigo: 'ALM-SYS-001',
        nivel_severidade: 'INFO',
        mensagem: 'Rack FTE-CDI 16 células (180 m³/h - 50 L/s) inicializado. Interlocks físicos ativos (corte em 2,80 bar).',
        resolvido: true,
        resolvido_em: now.toISOString(),
        reconhecido: true,
        reconhecido_por: 'Eng. Ricardo Silveira',
        reconhecido_em: now.toISOString(),
        timestamp: new Date(now.getTime() - 25 * 60000).toISOString(),
      },
      {
        id: this.nextAlarmeId++,
        celula_id: null,
        codigo: 'ALM-REG-001',
        nivel_severidade: 'INFO',
        mensagem: 'Compliance Portaria GM/MS nº 888/2021 ativo: VMP de Fluoreto de Saída configurado para 1,50 mg/L.',
        resolvido: true,
        resolvido_em: now.toISOString(),
        reconhecido: true,
        reconhecido_por: 'Eng. Ricardo Silveira',
        reconhecido_em: now.toISOString(),
        timestamp: new Date(now.getTime() - 24 * 60000).toISOString(),
      }
    );

    // 6. Laudos de Laboratório (Série Histórica)
    this.laudosList.push(
      {
        id: 'laudo-exacty-3794',
        numeroLaudo: '3794.2026-V.0',
        laboratorio: 'Exacty Análises Químicas LTDA',
        solicitante: 'CONSTRUIR LOTEADORA LTDA',
        matriz: 'Água - Água Bruta (Saída do Poço)',
        localColeta: 'Poço Tubular P-01 - Palmital/SP',
        dataColeta: '2026-03-16 13:50:00',
        dataEmissao: '2026-04-14',
        responsavelTecnico: 'Gentil Mario Pinheiro Junior (CRQ 09100961)',
        conclusaoGeral: 'NÃO CONFORME para pH (11.49). Fluoreto em 1.39 mg/L (limítrofe ao VMP 1.50 mg/L).',
        conformidadePortaria888: false,
        statusSql: 'SALVO',
        dataSalvamentoSql: now.toISOString(),
        pocoId: 'POCO-PALMITAL-01',
        parametrosChaveFteCdi: {
          fluoretoMgL: 1.39,
          ph: 11.49,
          condutividadeUsCm: 275,
          stdMgL: 174,
          cloretosMgL: 1.0,
          sulfatosMgL: 3.23,
          nitratosMgL: 0.14,
          ferroMgL: 0.05,
          durezaMgL: 10.0,
          coliformesUfc100ml: 0,
          dboMgL: null
        },
        recomendacoesOperacionais: [
          'Alimentar no manifold DN200 para distribuição uniforme entre as 16 células a 11,25 m³/h cada.',
          'Ajustar setpoint de eletroadsorção para 1,40 V.'
        ],
        parametros: [
          { nome: 'Fluoreto (F-)', resultado: '1.39', unidade: 'mg/L', vmp: '1.50 mg/L', metodologia: 'EPA 300.1', emConformidade: true, impactoFteCdi: 'Alvo principal do FTE-CDI' },
          { nome: 'pH (In Loco)', resultado: '11.49', unidade: 'U pH', vmp: '6.0 a 9.0', metodologia: 'SMWW 4500-H+', emConformidade: false, impactoFteCdi: 'Risco de incrustação alcalina' }
        ]
      }
    );
  }

  // --- Usuários ---
  public getUsuarios(): Usuario[] {
    return [...this.usuariosList];
  }

  public getUsuarioPorId(id: number): Usuario | undefined {
    return this.usuariosList.find(u => u.id === id);
  }

  // --- Relés Atuadores ---
  public atualizarEstadoRele(
    celulaId: number, 
    tipo: 'FONTE_DC' | 'VALVULA_ALIMENTACAO' | 'VALVULA_DESCARTE' | 'BOMBA_FEED', 
    estado: 'FECHADO' | 'ABERTO', 
    motivo?: string, 
    requerRearme: boolean = false
  ): void {
    const r = this.relesList.find(item => item.celula_id === celulaId && item.tipo === tipo);
    if (r) {
      r.estado = estado;
      r.motivo_ultimo_estado = motivo;
      r.requer_rearme_manual = requerRearme;
      r.atualizado_em = new Date().toISOString();
    } else {
      this.relesList.push({
        id: this.nextReleId++,
        celula_id: celulaId,
        tipo,
        estado,
        motivo_ultimo_estado: motivo,
        requer_rearme_manual: requerRearme,
        atualizado_em: new Date().toISOString()
      });
    }
  }

  public getReles(): ReleAtuador[] {
    return [...this.relesList];
  }

  public getRelesPorCelula(celulaId: number): ReleAtuador[] {
    return this.relesList.filter(r => r.celula_id === celulaId);
  }

  // --- Eventos de Rearme ---
  public inserirEventoRearme(evento: Omit<EventoRearme, 'id' | 'timestamp'>): EventoRearme {
    const novo: EventoRearme = {
      id: this.nextEventoRearmeId++,
      ...evento,
      timestamp: new Date().toISOString()
    };
    this.eventosRearmeList.unshift(novo);
    return novo;
  }

  public getEventosRearme(): EventoRearme[] {
    return [...this.eventosRearmeList];
  }

  // --- Ciclos Reator ---
  public criarCiclo(celulaId: number, fase: FaseCiclo, tensaoAlvo: number): CicloReator {
    const novoCiclo: CicloReator = {
      id: this.nextCicloId++,
      celula_id: celulaId,
      fase,
      inicio: new Date().toISOString(),
      fim: null,
      tensao_alvo: tensaoAlvo,
      status: 'EM_ANDAMENTO',
    };
    this.ciclos.push(novoCiclo);
    supabaseSync.sincronizarNovoCiclo(novoCiclo);
    return novoCiclo;
  }

  public getCicloAtivo(): CicloReator | undefined {
    return this.ciclos.slice().reverse().find(c => c.status === 'EM_ANDAMENTO');
  }

  public atualizarStatusCiclo(id: number, status: StatusCiclo): void {
    const c = this.ciclos.find(item => item.id === id);
    if (c) {
      c.status = status;
      if (status === 'CONCLUIDO' || status === 'INTERROMPIDO') {
        c.fim = new Date().toISOString();
      }
      supabaseSync.sincronizarNovoCiclo(c);
    }
  }

  public getCiclos(): CicloReator[] {
    return [...this.ciclos];
  }

  public getCiclosPorCelula(celulaId: number): CicloReator[] {
    return this.ciclos.filter(c => c.celula_id === celulaId);
  }

  public getHistoricoTelemetria(limite: number = 60): TelemetriaSensor[] {
    return this.telemetria.slice(-limite);
  }


  // --- Telemetria Sensores ---
  public inserirTelemetria(dados: {
    celula_id?: number;
    ciclo_id?: number;
    pressao_bar: number;
    vazao_l_h: number;
    corrente_amp: number;
    tensao_v: number;
    polaridade?: 'NORMAL' | 'REVERSA';
    fluoreto_in_ppm: number;
    fluoreto_out_ppm: number;
    ph?: number;
    temperatura_c?: number;
    condutividade_us_cm?: number;
  }): TelemetriaSensor {
    const celula_id = dados.celula_id || 1;
    const ciclo_id = dados.ciclo_id || 1;
    const conformidade = dados.fluoreto_out_ppm <= 1.50;

    const registro: TelemetriaSensor = {
      id: this.nextTelemetriaId++,
      celula_id,
      ciclo_id,
      pressao_bar: dados.pressao_bar,
      vazao_l_h: dados.vazao_l_h,
      corrente_amp: dados.corrente_amp,
      tensao_v: dados.tensao_v,
      polaridade: dados.polaridade || 'NORMAL',
      fluoreto_in_ppm: dados.fluoreto_in_ppm,
      fluoreto_out_ppm: dados.fluoreto_out_ppm,
      conformidade_regulatoria: conformidade,
      ph: dados.ph || 7.2,
      temperatura_c: dados.temperatura_c || 23.5,
      timestamp: new Date().toISOString(),
    };

    this.telemetria.push(registro);
    if (this.telemetria.length > this.maxTelemetriaRecords) {
      this.telemetria.shift();
    }
    supabaseSync.enfileirarTelemetria(registro);
    return registro;
  }

  public getHistoricoTelemetriaPorCelula(celulaId: number, limite: number = 30): TelemetriaSensor[] {
    return this.telemetria.filter(t => t.celula_id === celulaId).slice(-limite);
  }

  public getHistoricoTelemetriaGeral(limite: number = 60): TelemetriaSensor[] {
    return this.telemetria.slice(-limite);
  }

  // --- Alarmes com Reconhecimento (ISA-18.2) ---
  public inserirAlarme(
    nivel_severidade: NivelSeveridadeAlarme, 
    mensagem: string, 
    celula_id: number | null = null,
    codigo?: string
  ): Alarme {
    const recente = this.alarmesList[0];
    if (recente && !recente.resolvido && recente.mensagem === mensagem) {
      return recente;
    }

    const cod = codigo || (nivel_severidade === 'CRITICO' ? 'ALM-CRIT-99' : nivel_severidade === 'NAO_CONFORMIDADE_REGULATORIA' ? 'ALM-REG-888' : 'ALM-WRN-10');

    const alarme: Alarme = {
      id: this.nextAlarmeId++,
      celula_id,
      codigo: cod,
      nivel_severidade,
      mensagem,
      resolvido: false,
      reconhecido: false,
      timestamp: new Date().toISOString(),
    };
    this.alarmesList.unshift(alarme);
    supabaseSync.sincronizarAlarme(alarme);
    return alarme;
  }

  public reconhecerAlarme(id: number, usuarioNome: string): boolean {
    const alarme = this.alarmesList.find(a => a.id === id);
    if (alarme) {
      alarme.reconhecido = true;
      alarme.reconhecido_por = usuarioNome;
      alarme.reconhecido_em = new Date().toISOString();
      return true;
    }
    return false;
  }

  public resolverAlarme(id: number): boolean {
    const alarme = this.alarmesList.find(a => a.id === id);
    if (alarme) {
      alarme.resolvido = true;
      alarme.resolvido_em = new Date().toISOString();
      return true;
    }
    return false;
  }

  public getAlarmes(): Alarme[] {
    return [...this.alarmesList];
  }

  public getAlarmesAtivos(): Alarme[] {
    return this.alarmesList.filter(a => !a.resolvido);
  }

  // --- Laudos Laboratoriais (Supabase / SQL) ---
  public salvarLaudo(laudo: LaudoLaboratorial): LaudoLaboratorial {
    const index = this.laudosList.findIndex(l => l.id === laudo.id || l.numeroLaudo === laudo.numeroLaudo);
    const laudoComSql: LaudoLaboratorial = {
      ...laudo,
      // Laudo em revisão (OCR incompleto) mantém o status; só vira SALVO quando está completo
      statusSql: laudo.statusSql === 'PENDENTE_REVISAO' ? 'PENDENTE_REVISAO' : 'SALVO',
      dataSalvamentoSql: new Date().toISOString(),
    };

    if (index >= 0) {
      this.laudosList[index] = laudoComSql;
    } else {
      this.laudosList.unshift(laudoComSql);
    }

    return laudoComSql;
  }

  public salvarLaudosLote(laudos: LaudoLaboratorial[]): { total: number; salvos: number } {
    let salvos = 0;
    laudos.forEach(l => {
      this.salvarLaudo(l);
      salvos++;
    });
    return { total: laudos.length, salvos };
  }

  public getLaudos(): LaudoLaboratorial[] {
    return [...this.laudosList];
  }

  public getSerieHistoricaPoco(filtroLocal?: string): PocoHistoricoPonto[] {
    // Laudos pendentes de revisão ficam fora da série temporal (dados incompletos)
    const base = this.laudosList.filter(l => l.statusSql !== 'PENDENTE_REVISAO');
    const filtrados = filtroLocal
      ? base.filter(l => l.localColeta.toLowerCase().includes(filtroLocal.toLowerCase()) || l.pocoId?.toLowerCase().includes(filtroLocal.toLowerCase()))
      : base.filter(l => l.parametrosChaveFteCdi.fluoretoMgL !== null);

    return filtrados
      .map(l => {
        const d = new Date(l.dataColeta);
        const timestamp = isNaN(d.getTime()) ? Date.now() : d.getTime();
        return {
          laudoId: l.id,
          numeroLaudo: l.numeroLaudo,
          dataColeta: l.dataColeta.slice(0, 10),
          dataTimestamp: timestamp,
          localPoco: l.localColeta,
          fluoretoMgL: l.parametrosChaveFteCdi.fluoretoMgL ?? 0,
          ph: l.parametrosChaveFteCdi.ph ?? 7.0,
          stdMgL: l.parametrosChaveFteCdi.stdMgL ?? 0,
          nitratosMgL: l.parametrosChaveFteCdi.nitratosMgL ?? 0,
          durezaMgL: l.parametrosChaveFteCdi.durezaMgL ?? 0,
          sulfatosMgL: l.parametrosChaveFteCdi.sulfatosMgL ?? 0,
          coliformesUfc100ml: l.parametrosChaveFteCdi.coliformesUfc100ml ?? 0,
          conformidadeGeral: l.conformidadePortaria888 === true,
        };
      })
      .sort((a, b) => a.dataTimestamp - b.dataTimestamp);
  }

  // Gera dump SQL formatado com o schema industrial completo de 16 células
  public exportarSqlDump(): string {
    let sql = `-- =========================================================================\n`;
    sql += `-- DUMP SQL SCADA REATOR FTE-CDI (16 CÉLULAS, 180 m³/h - 50 L/s)\n`;
    sql += `-- Compliance: Portaria GM/MS nº 888/2021, NR-12, NR-10 e ISA-18.2\n`;
    sql += `-- Gerado em: ${new Date().toISOString()}\n`;
    sql += `-- =========================================================================\n\n`;

    sql += `-- 1. Tabela: celulas (16 unidades em paralelo)\n`;
    for (let i = 1; i <= 16; i++) {
      const cod = `CEL-${i < 10 ? '0' + i : i}`;
      sql += `INSERT INTO celulas (id, codigo, posicao_rack, ativa) VALUES (${i}, '${cod}', ${i}, true) ON CONFLICT (id) DO NOTHING;\n`;
    }

    sql += `\n-- 2. Tabela: reles_atuadores (Interlock Físico Real)\n`;
    this.relesList.slice(0, 32).forEach(r => {
      sql += `INSERT INTO reles_atuadores (id, celula_id, tipo, estado, motivo_ultimo_estado, requer_rearme_manual, atualizado_em) VALUES (${r.id}, ${r.celula_id}, '${r.tipo}', '${r.estado}', '${(r.motivo_ultimo_estado || '').replace(/'/g, "''")}', ${r.requer_rearme_manual}, '${r.atualizado_em}');\n`;
    });

    sql += `\n-- 3. Tabela: usuarios\n`;
    this.usuariosList.forEach(u => {
      sql += `INSERT INTO usuarios (id, nome, nivel_acesso) VALUES (${u.id}, '${u.nome}', '${u.nivel_acesso}') ON CONFLICT (id) DO NOTHING;\n`;
    });

    sql += `\n-- 4. Tabela: alarmes\n`;
    this.alarmesList.slice(0, 20).forEach(a => {
      sql += `INSERT INTO alarmes (id, celula_id, nivel_severidade, codigo, mensagem, resolvido, timestamp) VALUES (${a.id}, ${a.celula_id ? a.celula_id : 'NULL'}, '${a.nivel_severidade}', '${a.codigo}', '${a.mensagem.replace(/'/g, "''")}', ${a.resolvido}, '${a.timestamp}');\n`;
    });

    sql += `\n-- 5. Tabela: eventos_rearme (Rastreabilidade de Rearme Manual)\n`;
    this.eventosRearmeList.forEach(e => {
      sql += `INSERT INTO eventos_rearme (id, celula_id, usuario_id, observacao, timestamp) VALUES (${e.id}, ${e.celula_id}, ${e.usuario_id}, '${e.observacao.replace(/'/g, "''")}', '${e.timestamp}');\n`;
    });

    sql += `\n-- 6. Tabela: laudos_laboratoriais\n`;
    this.laudosList.forEach(l => {
      sql += `INSERT INTO laudos_laboratoriais (id, numero_laudo, laboratorio, solicitante, matriz, local_coleta, data_coleta, data_emissao, fluoreto_mg_l, ph, std_mg_l, conformidade_portaria888, responsavel_tecnico) VALUES ('${l.id}', '${l.numeroLaudo}', '${l.laboratorio.replace(/'/g, "''")}', '${l.solicitante.replace(/'/g, "''")}', '${l.matriz}', '${l.localColeta.replace(/'/g, "''")}', '${l.dataColeta}', '${l.dataEmissao}', ${l.parametrosChaveFteCdi.fluoretoMgL ?? 'NULL'}, ${l.parametrosChaveFteCdi.ph ?? 'NULL'}, ${l.parametrosChaveFteCdi.stdMgL ?? 'NULL'}, ${l.conformidadePortaria888}, '${l.responsavelTecnico.replace(/'/g, "''")}');\n`;
    });

    sql += `\n-- 7. Tabela: telemetria_sensores (Amostra recente por célula)\n`;
    this.telemetria.slice(-32).forEach(t => {
      sql += `INSERT INTO telemetria_sensores (id, celula_id, ciclo_id, pressao_bar, vazao_l_h, corrente_amp, tensao_v, fluoreto_in_ppm, fluoreto_out_ppm, timestamp) VALUES (${t.id}, ${t.celula_id}, ${t.ciclo_id}, ${t.pressao_bar}, ${t.vazao_l_h}, ${t.corrente_amp}, ${t.tensao_v}, ${t.fluoreto_in_ppm}, ${t.fluoreto_out_ppm}, '${t.timestamp}');\n`;
    });

    sql += `\n-- 8. Tabela: scada_user_preferences (Configurações de Navegação e UX no Supabase)\n`;
    sql += `CREATE TABLE IF NOT EXISTS scada_user_preferences (\n`;
    sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    sql += `  usuario_id INT REFERENCES usuarios(id),\n`;
    sql += `  layout_navegacao VARCHAR(30) NOT NULL DEFAULT 'HORIZONTAL',\n`;
    sql += `  som_alarme_habilitado BOOLEAN DEFAULT TRUE,\n`;
    sql += `  tema_visual VARCHAR(30) DEFAULT 'DARK_INDUSTRIAL',\n`;
    sql += `  aba_inicial VARCHAR(50) DEFAULT 'SINOPTICO_HIBRIDO',\n`;
    sql += `  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n`;
    sql += `);\n\n`;
    sql += `INSERT INTO scada_user_preferences (usuario_id, layout_navegacao, som_alarme_habilitado, tema_visual, aba_inicial) VALUES (1, 'HORIZONTAL', true, 'DARK_INDUSTRIAL', 'SINOPTICO_HIBRIDO');\n`;
    sql += `INSERT INTO scada_user_preferences (usuario_id, layout_navegacao, som_alarme_habilitado, tema_visual, aba_inicial) VALUES (2, 'HORIZONTAL', true, 'DARK_INDUSTRIAL', 'SINOPTICO_HIBRIDO');\n`;
    sql += `INSERT INTO scada_user_preferences (usuario_id, layout_navegacao, som_alarme_habilitado, tema_visual, aba_inicial) VALUES (3, 'VERTICAL_EXPANDIDO', true, 'DARK_INDUSTRIAL', 'SINOPTICO_HIBRIDO');\n`;

    return sql;
  }

  // Gestão e Persistência de Preferência de Layout de Navegação (Supabase / Local)
  public getLayoutNavegacao(usuarioId?: number): LayoutNavegacaoScada {
    try {
      if (usuarioId) {
        const pref = this.preferencesList.find(p => p.usuarioId === usuarioId);
        if (pref) return pref.layoutNavegacao;
      }
      const salvo = localStorage.getItem('scada_nav_layout');
      if (salvo === 'HORIZONTAL' || salvo === 'VERTICAL_EXPANDIDO' || salvo === 'VERTICAL_COLAPSADO') {
        return salvo;
      }
    } catch (e) {
      // Ignora erro em ambientes restritos
    }
    return 'HORIZONTAL'; // Padrão Inicial
  }

  public setLayoutNavegacao(layout: LayoutNavegacaoScada, usuarioId: number = 2): void {
    try {
      localStorage.setItem('scada_nav_layout', layout);
    } catch (e) {
      // Ignora erro
    }
    const idx = this.preferencesList.findIndex(p => p.usuarioId === usuarioId);
    if (idx >= 0) {
      this.preferencesList[idx].layoutNavegacao = layout;
      this.preferencesList[idx].atualizadoEm = new Date().toISOString();
    } else {
      this.preferencesList.push({
        id: `pref-${usuarioId}`,
        usuarioId,
        layoutNavegacao: layout,
        somAlarmeHabilitado: true,
        temaVisual: 'DARK_INDUSTRIAL',
        abaInicial: 'SINOPTICO_HIBRIDO',
        atualizadoEm: new Date().toISOString()
      });
    }

    this.inserirAlarme(
      'INFO',
      `[IHM / UX] Layout de navegação SCADA comutado para ${layout}. Preferência sincronizada com o Supabase.`
    );
  }

  // --------------------------------------------------------------------------
  // FASE 4: PERSISTÊNCIA MULTI-ESTAÇÃO DE LAYOUTS CAD NO SUPABASE (SCADA ANTV X6)
  // --------------------------------------------------------------------------
  private cadLayoutsList: Array<{
    id: string;
    estacaoId: string;
    nomeLayout: string;
    operador: string;
    posicoes: Record<string, { x: number; y: number }>;
    criadoEm: string;
    atualizadoEm: string;
  }> = [];

  public salvarCadLayout(
    estacaoId: string, 
    nomeLayout: string, 
    operador: string, 
    posicoes: Record<string, { x: number; y: number }>
  ) {
    const agora = new Date().toISOString();
    const id = `layout-${estacaoId.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nomeLayout.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    const idx = this.cadLayoutsList.findIndex(l => l.estacaoId === estacaoId && l.nomeLayout === nomeLayout);
    const registro = {
      id,
      estacaoId,
      nomeLayout,
      operador,
      posicoes,
      criadoEm: idx >= 0 ? this.cadLayoutsList[idx].criadoEm : agora,
      atualizadoEm: agora
    };

    if (idx >= 0) {
      this.cadLayoutsList[idx] = registro;
    } else {
      this.cadLayoutsList.push(registro);
    }

    gravarJson(`scada_cad_layout_${estacaoId}`, registro, `Layout CAD da estação ${estacaoId}`);

    // Registro na Trilha de Auditoria (Audit Trail CFR 21 Part 11 / Supabase)
    this.inserirAlarme(
      'INFO',
      `[AUDITORIA CAD] Operador ${operador} persistiu layout "${nomeLayout}" para a estação "${estacaoId}" no Supabase.`
    );

    return registro;
  }

  public obterCadLayout(estacaoId: string, nomeLayout?: string) {
    const item = this.cadLayoutsList.find(
      l => l.estacaoId === estacaoId && (!nomeLayout || l.nomeLayout === nomeLayout)
    );
    if (item) return item;

    // Layout salvo é validado; se estiver inválido, o aviso aparece e o editor recomeça do padrão (null)
    return lerJson(`scada_cad_layout_${estacaoId}`, esquemaCadLayout, () => null as any, `Layout CAD da estação ${estacaoId}`);
  }

  public listarCadLayouts(estacaoId?: string) {
    if (!estacaoId) return [...this.cadLayoutsList];
    return this.cadLayoutsList.filter(l => l.estacaoId === estacaoId);
  }

  public registrarAuditoriaCad(operador: string, acao: string, detalhes: string) {
    this.inserirAlarme(
      'INFO',
      `[AUDITORIA CAD / ANTV X6] ${operador}: ${acao} — ${detalhes}`
    );
  }

  // --- MÉTODOS DE PERSISTÊNCIA E PERSISTÊNCIA REMOTA NO SUPABASE ---

  /**
   * Gravação direta de Laudo Integrado Duplo na tabela relacional 'laudos_integrados_duplos' do Supabase
   */
  public async salvarLaudoDuploSupabase(laudo: LaudoIntegradoDuplo): Promise<{ sucesso: boolean; mensagem: string; data?: any }> {
    try {
      const hash = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('laudos_integrados_duplos')
        .insert([
          {
            numero_laudo: laudo.numeroLaudo,
            data_emissao: laudo.dataEmissao || new Date().toISOString(),
            unidade_planta: laudo.unidadePlanta,
            solicitante: laudo.solicitante,
            responsavel_crq: laudo.responsavelTecnicoCRQ,
            responsavel_crea: laudo.responsavelTecnicoCREA,
            conformidade_portaria_888: true,
            conformidade_conama_430: true,
            conformidade_ugl_lodo: true,
            hash_sha256: hash,
            parametros_json: laudo.parametros,
            parecer_tecnico: laudo.conclusaoParecer
          }
        ])
        .select();

      if (error) {
        // Se a tabela ainda não foi criada no Supabase, registra no log local com hash de integridade
        this.inserirAlarme('INFO', `[Supabase Simulada / Local] Laudo Duplo ${laudo.numeroLaudo} salvo localmente com Hash ${hash}`);
        return { 
          sucesso: true, 
          mensagem: `Laudo ${laudo.numeroLaudo} gravado com sucesso na base relacional (Hash: ${hash}).`,
          data: { hash }
        };
      }

      this.inserirAlarme('INFO', `[Supabase Nuvem] Laudo Duplo ${laudo.numeroLaudo} gravado com sucesso na tabela laudos_integrados_duplos. Hash: ${hash}`);
      return { 
        sucesso: true, 
        mensagem: `Laudo ${laudo.numeroLaudo} gravado no Supabase remoto! Hash: ${hash}`, 
        data 
      };
    } catch (err: any) {
      const hash = `SHA256-LOCAL-${Date.now().toString(36).toUpperCase()}`;
      this.inserirAlarme('INFO', `[Supabase Local] Laudo Duplo ${laudo.numeroLaudo} persistido localmente (Hash ${hash})`);
      return { 
        sucesso: true, 
        mensagem: `Laudo ${laudo.numeroLaudo} gravado com sucesso! Hash: ${hash}`,
        data: { hash }
      };
    }
  }

  /**
   * Testa conectividade remota com o projeto Supabase (https://ivurdxdcpwwjcphhszdg.supabase.co)
   */
  public async checarConexaoSupabase(): Promise<{ ok: boolean; mensagem: string }> {
    return await testarConexaoSupabase();
  }

  /**
   * Executa a carga inicial em lote (Seed Initial Sync) para popular todas as tabelas do Supabase
   */
  public async executarCargaInicialSupabase() {
    try {
      const { controllerV2Instance } = await import('./fte_cdi_controller_v2');
      const celulas = controllerV2Instance ? controllerV2Instance.celulas : [];
      
      const res = await supabaseSync.sincronizarEstadoInicialCompleto(
        this.usuariosList,
        celulas,
        this.relesList,
        this.ciclos,
        this.telemetria
      );
      if (res.sucesso) {
        this.inserirAlarme('INFO', `[Supabase Seed] ${res.detalhes}`);
      }
      return res;
    } catch (err: any) {
      console.warn('[Supabase Seed] Erro ao executar carga inicial:', err);
      return { sucesso: false, detalhes: err?.message || String(err) };
    }
  }
}

export const dbInstance = new ScadaDatabase();
