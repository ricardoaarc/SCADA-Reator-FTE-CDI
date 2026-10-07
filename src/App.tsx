/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HorizontalNavHeader } from './components/navigation/HorizontalNavHeader';
import { VerticalNavSidebar } from './components/navigation/VerticalNavSidebar';
import { HybridSynopticView } from './components/HybridSynopticView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DataIntegrityBanner } from './components/DataIntegrityBanner';
import { PurifyWaveControlPanel } from './components/PurifyWaveControlPanel';
import { DualComplianceReportModal } from './components/DualComplianceReportModal';
import { PidSynopticView } from './components/PidSynopticView';
import { RackOverviewGrid } from './components/RackOverviewGrid';
import { BackwashBypassPanel } from './components/BackwashBypassPanel';
import { ManifoldBalancingPanel } from './components/ManifoldBalancingPanel';
import { TagWatchlistPanel } from './components/TagWatchlistPanel';
import { FormulaTagsPanel } from './components/FormulaTagsPanel';
import { ExternalNotificationsPanel } from './components/ExternalNotificationsPanel';
import { HardwareGatewayPanel } from './components/HardwareGatewayPanel';
import { RegulatoryCompliancePanel } from './components/RegulatoryCompliancePanel';
import { InterlockAlarmConsole } from './components/InterlockAlarmConsole';
import { LabAiReportPanel } from './components/LabAiReportPanel';
import { SqlSchemaViewer } from './components/SqlSchemaViewer';
import { CellDetailModal } from './components/CellDetailModal';
import { ManualResetModal } from './components/ManualResetModal';
import { ProcessParametersModal } from './components/ProcessParametersModal';
import { CellProvisionerModal } from './components/CellProvisionerModal';
import { OfficialComplianceReportModal } from './components/OfficialComplianceReportModal';
import { MultiStationDashboardPanel } from './components/MultiStationDashboardPanel';
import { UserAccessManagementView } from './components/UserAccessManagementView';

import { controllerV2Instance } from './services/fte_cdi_controller_v2';
import { dbInstance } from './services/database';
import { authService } from './services/AuthService';
import { 
  CelulaInfo, 
  Usuario, 
  RackResumoGlobal, 
  LaudoLaboratorial, 
  BackwashState, 
  ValvulasEstado,
  DataPointTag,
  LayoutNavegacaoScada
} from './types';

export default function App() {
  // Estado do Layout de Navegação (Horizontal vs Vertical Retrátil)
  const [layoutNavegacao, setLayoutNavegacao] = useState<LayoutNavegacaoScada>(() => {
    return dbInstance.getLayoutNavegacao(2); // Default: Supervisor Carlos (id: 2)
  });

  const handleAlternarLayoutNavegacao = (novo: LayoutNavegacaoScada) => {
    setLayoutNavegacao(novo);
    dbInstance.setLayoutNavegacao(novo, usuarioAtual.id);
  };

  // Usuário Atual e RBAC
  const usuariosDisponiveis = dbInstance.getUsuarios();
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario>(usuariosDisponiveis[1]); // Default: Supervisor Carlos

  const handleMudarUsuario = (u: Usuario) => {
    setUsuarioAtual(u);
    controllerV2Instance.usuarioAtual = u;
    const prefLayout = dbInstance.getLayoutNavegacao(u.id);
    if (prefLayout) {
      setLayoutNavegacao(prefLayout);
    }
  };

  // Estado do Rack Industrial Modular de Células
  const [celulas, setCelulas] = useState<CelulaInfo[]>(controllerV2Instance.celulas);
  const [resumoGlobal, setResumoGlobal] = useState<RackResumoGlobal>(controllerV2Instance.obterResumoGlobal());
  const [dataPoints, setDataPoints] = useState<DataPointTag[]>(controllerV2Instance.obterDataPointsWatchlist());

  // Navegação Principal
  const [activeTab, setActiveTab] = useState<
    'SINOPTICO_HIBRIDO' |
    'GESTAO_USUARIOS_RBAC' |
    'DASHBOARD_MULTI_ESTACAO' |
    'PURIFYWAVE_OS' |
    'SINOPTICO_PID' |
    'RACK_16_CELULAS' | 
    'RETROLAVAGEM_CIP' |
    'MANIFOLD_BALANCO' | 
    'WATCHLIST_TAGS' |
    'FORMULAS_TAGS' |
    'NOTIFICACOES_EXTERNAS' |
    'GATEWAY_MODBUS' |
    'COMPLIANCE_PORTARIA_888' | 
    'ALARMES_ISA182' | 
    'IA_LAUDOS' | 
    'BANCO_SQL'
  >('SINOPTICO_HIBRIDO');

  // Modais
  const [celulaSelecionada, setCelulaSelecionada] = useState<CelulaInfo | null>(null);
  const [celulaParaRearme, setCelulaParaRearme] = useState<CelulaInfo | null>(null);
  const [modalParametrosAberto, setModalParametrosAberto] = useState<boolean>(false);
  const [modalProvisionadorAberto, setModalProvisionadorAberto] = useState<boolean>(false);
  const [modalLaudoOficialAberto, setModalLaudoOficialAberto] = useState<boolean>(false);
  const [modalLaudoDuploAberto, setModalLaudoDuploAberto] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  // Estado da Retrolavagem & CIP (P&ID)
  const [retrolavagemState, setRetrolavagemState] = useState<BackwashState>({
    emAndamento: false,
    tempoRestanteSegundos: 0,
    duracaoTotalSegundos: 45,
    faseAtual: 'IDLE',
    modoAuto: true,
    intervaloHorasAuto: 24,
    pressaoGatilhoAutoBar: 2.50,
    ultimoCicloTimestamp: null,
    recuperacaoPermeabilidadePct: 98,
    totalCiclosExecutados: 12,
    bypassAtivo: false,
    valvulas: {
      xv101Retrolavagem: false,
      xv102Alimentacao: true,
      xv103Descarte: false,
      xv104Bypass: false,
      xv105AirScour: false,
    },
    historicoCiclos: [
      {
        id: 'RW-2026-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        duracaoS: 45,
        motivo: 'DELTA_P_AUTOMATICO',
        pressaoAntesBar: 2.52,
        pressaoDepoisBar: 1.80,
        operador: 'Sistema Autônomo (CLP)',
        sucesso: true,
      }
    ],
  });

  // Timer de Retrolavagem
  useEffect(() => {
    let timer: any = null;
    if (retrolavagemState.emAndamento && retrolavagemState.tempoRestanteSegundos > 0) {
      timer = setInterval(() => {
        setRetrolavagemState((prev) => {
          const novoRestante = prev.tempoRestanteSegundos - 1;
          if (novoRestante <= 0) {
            // Finaliza retrolavagem
            dbInstance.inserirAlarme('INFO', 'Ciclo de Retrolavagem e Purga concluído com sucesso. Válvulas reposicionadas.');
            return {
              ...prev,
              emAndamento: false,
              tempoRestanteSegundos: 0,
              faseAtual: 'IDLE',
              ultimoCicloTimestamp: new Date().toISOString(),
              valvulas: {
                xv101Retrolavagem: false,
                xv102Alimentacao: true,
                xv103Descarte: false,
                xv104Bypass: false,
                xv105AirScour: false,
              },
            };
          }

          let fase: BackwashState['faseAtual'] = 'DESPOLARIZACAO';
          if (novoRestante <= prev.duracaoTotalSegundos * 0.3) {
            fase = 'ENXAGUE';
          } else if (novoRestante <= prev.duracaoTotalSegundos * 0.75) {
            fase = 'LAVAGEM_REVERSA';
          }

          return {
            ...prev,
            tempoRestanteSegundos: novoRestante,
            faseAtual: fase,
          };
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [retrolavagemState.emAndamento, retrolavagemState.tempoRestanteSegundos]);

  // Sincronização em Tempo Real com o Loop de Scan do CLP Industrial
  useEffect(() => {
    const interval = setInterval(() => {
      setCelulas([...controllerV2Instance.celulas]);
      setResumoGlobal(controllerV2Instance.obterResumoGlobal());
      setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
      setTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleParadaEmergencia = async () => {
    // Intertrava todas as células e corta fonte DC/bomba (em modo CLP real, escreve o corte no CLP)
    await controllerV2Instance.paradaEmergencia(authService.getOperadorAtual().nome);
    setCelulas([...controllerV2Instance.celulas]);
    setResumoGlobal(controllerV2Instance.obterResumoGlobal());
  };

  const handleAplicarLaudoNoReator = (laudo: LaudoLaboratorial) => {
    // [SCD-OCR-002] Nunca injetar no reator valores inventados: laudo incompleto não é aplicado
    const fIn = laudo.parametrosChaveFteCdi.fluoretoMgL;
    const phLaudo = laudo.parametrosChaveFteCdi.ph;
    if (laudo.statusSql === 'PENDENTE_REVISAO' || fIn === null || phLaudo === null) {
      console.warn(`[SCD-OCR-002] Laudo ${laudo.numeroLaudo} incompleto: não aplicado ao reator.`);
      return;
    }
    controllerV2Instance.celulas.forEach((c) => {
      c.fluoretoInPPM = fIn;
      c.ph = phLaudo;
    });
    controllerV2Instance.executarCicloScanCLP();
    setCelulas([...controllerV2Instance.celulas]);
    setResumoGlobal(controllerV2Instance.obterResumoGlobal());
    setActiveTab('SINOPTICO_PID');
  };

  // Controles de Retrolavagem
  const handleIniciarRetrolavagem = (duracaoS: number) => {
    setRetrolavagemState((prev) => ({
      ...prev,
      emAndamento: true,
      tempoRestanteSegundos: duracaoS,
      duracaoTotalSegundos: duracaoS,
      faseAtual: 'DESPOLARIZACAO',
      valvulas: {
        xv101Retrolavagem: true,
        xv102Alimentacao: false,
        xv103Descarte: true,
        xv104Bypass: false,
        xv105AirScour: true,
      },
    }));

    dbInstance.inserirAlarme('INFO', `Iniciando Retrolavagem e Air Scour no Skid (${duracaoS}s).`);
  };

  const handleCancelarRetrolavagem = () => {
    setRetrolavagemState((prev) => ({
      ...prev,
      emAndamento: false,
      tempoRestanteSegundos: 0,
      faseAtual: 'IDLE',
      valvulas: {
        xv101Retrolavagem: false,
        xv102Alimentacao: true,
        xv103Descarte: false,
        xv104Bypass: false,
        xv105AirScour: false,
      },
    }));
  };

  const handleSetBypass = (ativo: boolean) => {
    setRetrolavagemState((prev) => ({
      ...prev,
      bypassAtivo: ativo,
      valvulas: {
        ...prev.valvulas,
        xv104Bypass: ativo,
        xv102Alimentacao: !ativo,
      },
    }));
  };

  const handleToggleValvula = (valvulaId: keyof ValvulasEstado) => {
    setRetrolavagemState((prev) => ({
      ...prev,
      valvulas: {
        ...prev.valvulas,
        [valvulaId]: !prev.valvulas[valvulaId],
      },
    }));
  };

  const handleConfigurarAuto = (parcial: Partial<BackwashState>) => {
    setRetrolavagemState((prev) => ({
      ...prev,
      ...parcial,
    }));
  };

  // Funções Modulares de Células
  const handleAdicionarCelula = (config?: Partial<CelulaInfo>) => {
    controllerV2Instance.adicionarCelula(config);
    setCelulas([...controllerV2Instance.celulas]);
    setResumoGlobal(controllerV2Instance.obterResumoGlobal());
    setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
  };

  const handleRemoverCelula = (celulaId: number) => {
    controllerV2Instance.removerCelula(celulaId);
    setCelulas([...controllerV2Instance.celulas]);
    setResumoGlobal(controllerV2Instance.obterResumoGlobal());
    setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
  };

  const handleAlternarAtivacaoCelula = (celulaId: number, ativa: boolean) => {
    controllerV2Instance.alternarStatusAtivacaoCelula(celulaId, ativa);
    setCelulas([...controllerV2Instance.celulas]);
    setResumoGlobal(controllerV2Instance.obterResumoGlobal());
    setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
  };

  // Forçamento de DataPoints
  const handleForcarValorDataPoint = (tagId: string, valor: any) => {
    controllerV2Instance.forcarValorDataPoint(tagId, valor);
    setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
    dbInstance.inserirAlarme('ALERTA', `[FORÇAMENTO / OVERRIDE] Tag ${tagId} forçada manualmente para valor "${valor}".`);
  };

  const handleLimparForcamentoDataPoint = (tagId: string) => {
    controllerV2Instance.limparForcamentoDataPoint(tagId);
    setDataPoints(controllerV2Instance.obterDataPointsWatchlist());
    dbInstance.inserirAlarme('INFO', `[FORÇAMENTO / OVERRIDE] Tag ${tagId} liberada do forçamento manual.`);
  };

  const isVertical = layoutNavegacao.startsWith('VERTICAL');
  const isColapsado = layoutNavegacao === 'VERTICAL_COLAPSADO';

  return (
    <div className={`min-h-screen bg-[#060a12] text-slate-100 font-sans selection:bg-sky-500 selection:text-white ${
      isVertical ? 'flex flex-row overflow-x-hidden' : 'flex flex-col'
    }`}>
      {/* 1. NAVEGAÇÃO VERTICAL (MODO SIDEBAR RETRÁTIL - IMAGEM 3) */}
      {isVertical && (
        <VerticalNavSidebar
          usuarioAtual={usuarioAtual}
          usuariosDisponiveis={usuariosDisponiveis}
          resumoGlobal={resumoGlobal}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          onChangeUsuario={handleMudarUsuario}
          onAbrirParametros={() => setModalParametrosAberto(true)}
          onAbrirLaudosOficiais={() => setModalLaudoOficialAberto(true)}
          onAbrirLaudoDuplo={() => setModalLaudoDuploAberto(true)}
          onParadaEmergencia={handleParadaEmergencia}
          onAlternarLayoutNavegacao={handleAlternarLayoutNavegacao}
          isColapsado={isColapsado}
          onToggleColapso={() => handleAlternarLayoutNavegacao(isColapsado ? 'VERTICAL_EXPANDIDO' : 'VERTICAL_COLAPSADO')}
        />
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL (COM HEADER HORIZONTAL OU DIRETO NO MAIN) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto scada-scrollbar">
        {/* 2. NAVEGAÇÃO HORIZONTAL (MODO HEADER COM MEGA-DROPDOWNS E OVERFLOW - IMAGEM 2) */}
        {!isVertical && (
          <HorizontalNavHeader
            usuarioAtual={usuarioAtual}
            usuariosDisponiveis={usuariosDisponiveis}
            resumoGlobal={resumoGlobal}
            activeTab={activeTab}
            onSelectTab={(tab) => setActiveTab(tab)}
            onChangeUsuario={handleMudarUsuario}
            onAbrirParametros={() => setModalParametrosAberto(true)}
            onAbrirLaudosOficiais={() => setModalLaudoOficialAberto(true)}
            onAbrirLaudoDuplo={() => setModalLaudoDuploAberto(true)}
            onParadaEmergencia={handleParadaEmergencia}
            onAlternarLayoutNavegacao={handleAlternarLayoutNavegacao}
            layoutAtual={layoutNavegacao}
          />
        )}

        {/* 3. Conteúdo Dinâmico por Aba */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1800px] mx-auto space-y-6 overflow-x-auto scada-scrollbar">
        {/* Avisos de dados salvos inválidos ou não gravados (SCD-DAT-001/002) */}
        <DataIntegrityBanner />
        
        {/* Isola falhas de renderização por aba (SCD-UI-001); a key reinicia o boundary ao trocar de aba */}
        <ErrorBoundary nome={activeTab} key={activeTab}>
        {/* ABA 1: SINÓPTICO HÍBRIDO (PuriFyWave OS V2 + FTE-CDI 180 m³/h) */}
        {activeTab === 'SINOPTICO_HIBRIDO' && (
          <HybridSynopticView
            onOpenCellDetail={(c) => setCelulaSelecionada(c)}
            onOpenDualReportModal={() => setModalLaudoDuploAberto(true)}
            onOpenPurifyWavePanel={() => setActiveTab('PURIFYWAVE_OS')}
            onOpenUsuariosGestao={() => setActiveTab('GESTAO_USUARIOS_RBAC')}
          />
        )}

        {/* ABA MACRO GIS: DASHBOARD MULTI-ESTAÇÃO & GRID DISTRIBUÍDO */}
        {activeTab === 'DASHBOARD_MULTI_ESTACAO' && (
          <MultiStationDashboardPanel
            onAbrirSinopticoLocal={() => setActiveTab('SINOPTICO_HIBRIDO')}
            onAbrirProvisionador={() => setModalProvisionadorAberto(true)}
          />
        )}

        {/* ABA NOVA 2: PAINEL DEDICADO PURIFYWAVE OS V2 (OXIDAÇÃO & UGL) */}
        {activeTab === 'PURIFYWAVE_OS' && (
          <PurifyWaveControlPanel
            onOpenDualReportModal={() => setModalLaudoDuploAberto(true)}
          />
        )}

        {/* ABA 1: SINÓPTICO P&ID INDUSTRIAL (SCADA-LTS / ScadaBR) */}
        {activeTab === 'SINOPTICO_PID' && (
          <PidSynopticView
            celulas={celulas}
            resumoRack={resumoGlobal}
            usuarioAtual={usuarioAtual}
            retrolavagem={retrolavagemState}
            onSelecionarCelula={(c) => setCelulaSelecionada(c)}
            onIniciarRetrolavagem={handleIniciarRetrolavagem}
            onCancelarRetrolavagem={handleCancelarRetrolavagem}
            onDispararParadaEmergencia={handleParadaEmergencia}
          />
        )}

        {/* ABA 2: RACK MODULAR DE CÉLULAS (1-Click Expansion) */}
        {activeTab === 'RACK_16_CELULAS' && (
          <RackOverviewGrid
            celulas={celulas}
            resumoGlobal={resumoGlobal}
            onSelecionarCelula={(c) => setCelulaSelecionada(c)}
            onAbrirRearmeManual={(c) => setCelulaParaRearme(c)}
            onAbrirProvisionador={() => setModalProvisionadorAberto(true)}
          />
        )}

        {/* ABA 3: RETROLAVAGEM & CIP (RESTAURADA) */}
        {activeTab === 'RETROLAVAGEM_CIP' && (
          <BackwashBypassPanel
            hardwareState={{
              bombaAlimentacaoAtiva: true,
              interlockDisparado: resumoGlobal.celulasIntertravadas > 0,
              motivoInterlock: null,
              fonteDcAtiva: true,
              tensaoAlvoV: 1.40,
              tensaoRealV: 1.40,
              correnteTotalA: resumoGlobal.correnteTotalAmp,
              modoOperacao: 'AUTOMATICO',
              foulingDetectado: false,
              eficienciaRemocaoPct: resumoGlobal.eficienciaMediaPct,
              massaFRemovidaMg: 1250,
              celulas: [],
              retrolavagem: retrolavagemState,
            }}
            sensorData={{
              pressaoBar: resumoGlobal.pressaoMediaBar,
              vazaoLitrosHora: resumoGlobal.vazaoTotalLh,
              tensaoV: 1.40,
              correnteAmp: resumoGlobal.correnteTotalAmp,
              fluoretoInPPM: resumoGlobal.fluoretoInMedioPPM,
              fluoretoOutPPM: resumoGlobal.fluoretoOutMedioPPM,
              ph: 7.2,
              temperaturaC: 23.5,
              condutividadeInUsCm: 320,
              condutividadeOutUsCm: 85,
              eficienciaRemocaoPct: resumoGlobal.eficienciaMediaPct,
            }}
            onIniciarRetrolavagem={handleIniciarRetrolavagem}
            onCancelarRetrolavagem={handleCancelarRetrolavagem}
            onSetBypass={handleSetBypass}
            onToggleValvula={handleToggleValvula}
            onConfigurarAuto={handleConfigurarAuto}
          />
        )}

        {/* ABA 4: MANIFOLD DN200 (TESTE T4) */}
        {activeTab === 'MANIFOLD_BALANCO' && (
          <ManifoldBalancingPanel />
        )}

        {/* ABA 5: TAGS & DATAPOINTS (WATCHLIST SCADABR) */}
        {activeTab === 'WATCHLIST_TAGS' && (
          <TagWatchlistPanel
            dataPoints={dataPoints}
            usuarioAtual={usuarioAtual}
            onForcarValor={handleForcarValorDataPoint}
            onLimparForcamento={handleLimparForcamentoDataPoint}
          />
        )}

        {/* FASE 1: FÓRMULAS & TAGS VIRTUAIS (META DATA POINTS) */}
        {activeTab === 'FORMULAS_TAGS' && (
          <FormulaTagsPanel
            dataPoints={dataPoints}
            resumoGlobal={resumoGlobal}
            usuarioAtual={usuarioAtual}
          />
        )}

        {/* FASE 2: CENTRAL DE ALERTAS & NOTIFICAÇÕES EXTERNAS (TELEGRAM/WEBHOOK/EMAIL) */}
        {activeTab === 'NOTIFICACOES_EXTERNAS' && (
          <ExternalNotificationsPanel
            usuarioAtual={usuarioAtual}
          />
        )}

        {/* FASE 3: GATEWAY INDUSTRIAL DE HARDWARE & BARRAMENTO MODBUS */}
        {activeTab === 'GATEWAY_MODBUS' && (
          <HardwareGatewayPanel
            usuarioAtual={usuarioAtual}
          />
        )}

        {/* ABA 6: PORTARIA GM/MS 888/2021 */}
        {activeTab === 'COMPLIANCE_PORTARIA_888' && (
          <RegulatoryCompliancePanel 
            onAbrirLaudoOficial={() => setModalLaudoOficialAberto(true)}
          />
        )}

        {/* ABA 7: ALARMES ISA-18.2 */}
        {activeTab === 'ALARMES_ISA182' && (
          <InterlockAlarmConsole
            usuarioAtual={usuarioAtual}
            onAtualizar={() => {
              setCelulas([...controllerV2Instance.celulas]);
              setResumoGlobal(controllerV2Instance.obterResumoGlobal());
            }}
          />
        )}

        {/* ABA 8: IA LAUDOS & OCR */}
        {activeTab === 'IA_LAUDOS' && (
          <LabAiReportPanel
            hardwareState={{
              bombaAlimentacaoAtiva: true,
              interlockDisparado: resumoGlobal.celulasIntertravadas > 0,
              motivoInterlock: null,
              fonteDcAtiva: true,
              tensaoAlvoV: 1.40,
              tensaoRealV: 1.40,
              correnteTotalA: resumoGlobal.correnteTotalAmp,
              modoOperacao: 'AUTOMATICO',
              foulingDetectado: false,
              eficienciaRemocaoPct: resumoGlobal.eficienciaMediaPct,
              massaFRemovidaMg: 1250,
              celulas: [],
              retrolavagem: retrolavagemState,
            }}
            sensorData={{
              pressaoBar: resumoGlobal.pressaoMediaBar,
              vazaoLitrosHora: resumoGlobal.vazaoTotalLh,
              tensaoV: 1.40,
              correnteAmp: resumoGlobal.correnteTotalAmp,
              fluoretoInPPM: resumoGlobal.fluoretoInMedioPPM,
              fluoretoOutPPM: resumoGlobal.fluoretoOutMedioPPM,
              ph: 7.2,
              temperaturaC: 23.5,
              condutividadeInUsCm: 320,
              condutividadeOutUsCm: 85,
              eficienciaRemocaoPct: resumoGlobal.eficienciaMediaPct,
            }}
            onAplicarNoReator={handleAplicarLaudoNoReator}
          />
        )}

        {/* ABA 9: BANCO SQL (SUPABASE) */}
        {activeTab === 'BANCO_SQL' && (
          <SqlSchemaViewer />
        )}

        {/* ABA SEGURANÇA & RBAC: GESTÃO DE USUÁRIOS E ZONAS DE OPERAÇÃO (CFR 21 / IEC 62443) */}
        {activeTab === 'GESTAO_USUARIOS_RBAC' && (
          <UserAccessManagementView 
            onVoltarParaSinoptico={() => setActiveTab('SINOPTICO_HIBRIDO')}
          />
        )}
        </ErrorBoundary>
      </main>
      </div>

      {/* 4. Modais do Sistema */}
      {celulaSelecionada && (
        <CellDetailModal
          celula={celulaSelecionada}
          usuarioAtual={usuarioAtual}
          onFechar={() => setCelulaSelecionada(null)}
          onAbrirRearme={(c) => {
            setCelulaSelecionada(null);
            setCelulaParaRearme(c);
          }}
          onAtualizar={() => {
            setCelulas([...controllerV2Instance.celulas]);
            setResumoGlobal(controllerV2Instance.obterResumoGlobal());
          }}
        />
      )}

      {celulaParaRearme && (
        <ManualResetModal
          celula={celulaParaRearme}
          usuarioAtual={usuarioAtual}
          onFechar={() => setCelulaParaRearme(null)}
          onRearmeSucesso={() => {
            setCelulas([...controllerV2Instance.celulas]);
            setResumoGlobal(controllerV2Instance.obterResumoGlobal());
          }}
        />
      )}

      {modalParametrosAberto && (
        <ProcessParametersModal
          usuarioAtual={usuarioAtual}
          onFechar={() => setModalParametrosAberto(false)}
          onAtualizar={() => {
            setCelulas([...controllerV2Instance.celulas]);
            setResumoGlobal(controllerV2Instance.obterResumoGlobal());
          }}
        />
      )}

      {modalProvisionadorAberto && (
        <CellProvisionerModal
          celulas={celulas}
          usuarioAtual={usuarioAtual}
          isOpen={modalProvisionadorAberto}
          onClose={() => setModalProvisionadorAberto(false)}
          onAdicionarCelula={handleAdicionarCelula}
          onRemoverCelula={handleRemoverCelula}
          onAlternarAtivacaoCelula={handleAlternarAtivacaoCelula}
        />
      )}

      {modalLaudoOficialAberto && (
        <OfficialComplianceReportModal
          resumoGlobal={resumoGlobal}
          celulas={celulas}
          usuarioAtual={usuarioAtual}
          alarmes={dbInstance.getAlarmes()}
          ciclos={dbInstance.getCiclos()}
          telemetrias={dbInstance.getHistoricoTelemetriaGeral()}
          onFechar={() => setModalLaudoOficialAberto(false)}
        />
      )}

      {modalLaudoDuploAberto && (
        <DualComplianceReportModal
          isOpen={modalLaudoDuploAberto}
          onClose={() => setModalLaudoDuploAberto(false)}
        />
      )}
    </div>
  );
}
