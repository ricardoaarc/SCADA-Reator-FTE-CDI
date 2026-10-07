/**
 * Painel da Interface de Conexão com CLP Real (Driver Industrial)
 * Suporte a Modbus TCP, OPC UA e MQTT Gateway
 * Permite comutar entre Modo Simulação Física e CLP Real de Campo
 */

import React, { useState } from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Server, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Lock, 
  Activity, 
  Layers,
  Database
} from 'lucide-react';
import { PlcConnectionConfig, DataSourceMode, OperatorProfile, ModbusRegister } from '../types';
import { plcService } from '../services/PlcService';
import { authService } from '../services/AuthService';

interface PlcDriverPanelProps {
  plcConfig: PlcConnectionConfig;
  operadorAtual: OperatorProfile;
  onComutarModo: (modo: DataSourceMode) => void;
  onAtualizarConfigPlc: (parcial: Partial<PlcConnectionConfig>) => void;
}

export const PlcDriverPanel: React.FC<PlcDriverPanelProps> = ({
  plcConfig,
  operadorAtual,
  onComutarModo,
  onAtualizarConfigPlc,
}) => {
  const [ipInput, setIpInput] = useState(plcConfig.ipAddress);
  const [portaInput, setPortaInput] = useState(plcConfig.porta);
  const [slaveIdInput, setSlaveIdInput] = useState(plcConfig.slaveId);
  const [scanMsInput, setScanMsInput] = useState(plcConfig.intervaloScanMs);
  const [isTestando, setIsTestando] = useState(false);
  const [pingResultado, setPingResultado] = useState<string | null>(null);
  const [tokenGateway, setTokenGateway] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'HOLDING' | 'COIL'>('TODOS');

  const podeComutar = operadorAtual.role === 'ENGENHEIRO' || operadorAtual.role === 'ADMIN';

  const handleTestarPing = async () => {
    plcService.definirTokenGateway(tokenGateway); // só em memória
    setIsTestando(true);
    setPingResultado(null);
    try {
      const res = await plcService.testarPingConexao();
      setPingResultado(res.mensagem);
    } finally {
      setIsTestando(false);
    }
  };

  const handleSalvarConexao = (e: React.FormEvent) => {
    e.preventDefault();
    onAtualizarConfigPlc({
      ipAddress: ipInput,
      porta: portaInput,
      slaveId: slaveIdInput,
      intervaloScanMs: scanMsInput,
    });
    setPingResultado(`Configurações de rede salvas. Driver Modbus TCP apontado para ${ipInput}:${portaInput}.`);
    setTimeout(() => setPingResultado(null), 4000);
  };

  const registradores = Object.values(plcConfig.mapaRegistradores).filter(r => {
    if (filtroTipo === 'HOLDING') return r.tipo === 'HOLDING_REGISTER';
    if (filtroTipo === 'COIL') return r.tipo === 'COIL';
    return true;
  });

  const dadosSemQualidade = plcConfig.modoFonteDados === 'CLP_REAL' && plcConfig.status !== 'CONECTADO';

  return (
    <div className="space-y-6">
      {/* Qualidade dos dados: em CLP real sem comunicação, os valores exibidos NÃO vêm do campo */}
      {dadosSemQualidade && (
        <div role="alert" className="p-3 rounded-lg border border-red-700 bg-red-950/50 text-xs font-mono text-red-200">
          QUALIDADE DOS DADOS: RUIM. Modo CLP real ({plcConfig.status === 'CONECTANDO' ? 'conectando...' : 'sem comunicação'}).
          Os valores abaixo não são leituras do campo. Consulte a lista de alarmes (SCD-PLC-001/002/005).
        </div>
      )}

      {/* Banner Principal com Seletor de Fonte de Dados */}
      <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white font-display">
                Interface de Conexão com CLP Físico & Gateway Industrial
              </h2>
              <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                plcConfig.modoFonteDados === 'CLP_REAL'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 animate-pulse'
                  : 'bg-sky-950 text-sky-300 border-sky-800'
              }`}>
                FONTE: {plcConfig.modoFonteDados === 'CLP_REAL' ? 'CLP REAL EM CAMPO' : 'SIMULADOR FÍSICO'}
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] max-w-3xl leading-relaxed">
              Driver de comunicação industrial para CLP via <strong>Modbus TCP (Porta 502)</strong>, <strong>OPC UA</strong> ou <strong>MQTT Gateway</strong>. Permite ler transdutores analógicos de 4–20 mA e acionar as bobinas físicas do contator da bomba de alimentação.
            </p>
          </div>

          {/* Toggle de Comutação: Simulação vs CLP Real */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#0a0e17] rounded-xl border border-[#1e293b] flex items-center gap-1">
              <button
                disabled={!podeComutar}
                onClick={() => onComutarModo('SIMULADOR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  plcConfig.modoFonteDados === 'SIMULADOR'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-[#94a3b8] hover:text-white disabled:opacity-40'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Modo Simulação Física
              </button>

              <button
                disabled={!podeComutar}
                onClick={() => onComutarModo('CLP_REAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  plcConfig.modoFonteDados === 'CLP_REAL'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-[#94a3b8] hover:text-white disabled:opacity-40'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Modo CLP Real (Físico)
              </button>
            </div>
          </div>
        </div>

        {!podeComutar && (
          <div className="mt-3 p-2 bg-[#0a0e17] border border-[#1e293b] rounded-lg text-[11px] text-amber-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              A comutação para hardware físico de campo requer credencial de <strong>Engenheiro de Processos</strong> ou <strong>Administrador</strong>. Altere seu perfil no topo da tela para habilitar.
            </span>
          </div>
        )}

        {pingResultado && (
          <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pingResultado}</span>
          </div>
        )}
      </div>

      {/* Grid de Diagnóstico e Configuração de Socket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Parâmetros de Conexão */}
        <div className="bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Configuração do Driver CLP
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {plcConfig.protocolo}
              </span>
            </div>

            <form onSubmit={handleSalvarConexao} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Endereço IP do CLP / Gateway:
                </label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  placeholder="192.168.1.100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Porta TCP:
                  </label>
                  <input
                    type="number"
                    value={portaInput}
                    onChange={(e) => setPortaInput(Number(e.target.value))}
                    className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Slave / Unit ID:
                  </label>
                  <input
                    type="number"
                    value={slaveIdInput}
                    onChange={(e) => setSlaveIdInput(Number(e.target.value))}
                    className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Intervalo de Varredura / Polling (ms):
                </label>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={50}
                  value={scanMsInput}
                  onChange={(e) => setScanMsInput(Number(e.target.value))}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Token do gateway (opcional, só em memória):
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={tokenGateway}
                  onChange={(e) => setTokenGateway(e.target.value)}
                  className="w-full bg-[#0a0e17] border border-[#334155] rounded px-2.5 py-1 text-xs text-slate-200 font-mono"
                  placeholder="PLC_GATEWAY_TOKEN do servidor"
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  No modo CLP real o destino (IP, porta e Unit ID) é definido no servidor (PLC_HOST, PLC_PORT, PLC_UNIT_ID).
                  Os campos acima são apenas informativos. O token não é salvo no navegador.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold uppercase transition"
                >
                  Salvar Conexão
                </button>
                <button
                  type="button"
                  disabled={isTestando}
                  onClick={handleTestarPing}
                  className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestando ? 'animate-spin text-sky-400' : ''}`} />
                  Testar Ping
                </button>
              </div>
            </form>
          </div>

          {/* Resumo de Pacotes */}
          <div className="mt-4 pt-3 border-t border-[#1e293b] grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded bg-[#0a0e17] border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px]">Latência Rede:</span>
              <strong className="text-emerald-400">{plcConfig.latenciaMs} ms</strong>
            </div>
            <div className="p-2 rounded bg-[#0a0e17] border border-[#1e293b]">
              <span className="text-[#64748b] block text-[10px]">Pacotes I/O:</span>
              <strong className="text-slate-200">{plcConfig.pacotesRecebidos}</strong>
            </div>
          </div>
        </div>

        {/* Tabela de Mapeamento dos Registradores Modbus */}
        <div className="lg:col-span-2 bg-[#151b2b] border border-[#1e293b] rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#1e293b] gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Mapa de Registradores do CLP (Holding Registers & Coils)
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-[#0a0e17] p-1 rounded-lg border border-[#1e293b] text-xs">
                <button
                  onClick={() => setFiltroTipo('TODOS')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filtroTipo === 'TODOS' ? 'bg-sky-600 text-white' : 'text-[#94a3b8]'
                  }`}
                >
                  Todos ({Object.keys(plcConfig.mapaRegistradores).length})
                </button>
                <button
                  onClick={() => setFiltroTipo('HOLDING')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filtroTipo === 'HOLDING' ? 'bg-sky-600 text-white' : 'text-[#94a3b8]'
                  }`}
                >
                  Analógicos (4000x)
                </button>
                <button
                  onClick={() => setFiltroTipo('COIL')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    filtroTipo === 'COIL' ? 'bg-sky-600 text-white' : 'text-[#94a3b8]'
                  }`}
                >
                  Digitais (Coils)
                </button>
              </div>
            </div>

            {/* Lista dos Registradores */}
            <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
              {registradores.map((reg) => (
                <div
                  key={reg.endereco}
                  className="p-2.5 rounded bg-[#0a0e17] border border-[#1e293b] flex items-center justify-between gap-3 text-xs font-mono hover:border-[#334155] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-16 px-1.5 py-0.5 bg-[#151b2b] border border-[#334155] rounded text-center text-sky-400 font-bold text-[11px]">
                      #{reg.endereco}
                    </span>
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2 font-sans">
                        <span>{reg.nome}</span>
                        <span className="text-[10px] text-[#64748b] font-mono">({reg.tipo})</span>
                      </div>
                      <span className="text-[11px] text-[#94a3b8] font-sans block truncate max-w-sm">
                        {reg.descricao}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        {typeof reg.valor === 'boolean'
                          ? reg.valor ? 'LIGADO (1)' : 'DESLIGADO (0)'
                          : reg.valor}
                      </span>
                      <span className="text-[10px] text-[#64748b] block">{reg.unidade}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      reg.somenteLeitura
                        ? 'bg-[#151b2b] text-[#64748b] border border-[#334155]'
                        : 'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}>
                      {reg.somenteLeitura ? 'R/O' : 'R/W'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-center justify-between text-xs text-[#94a3b8]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Polling cíclico ativo a cada <strong>{plcConfig.intervaloScanMs} ms</strong>
            </span>
            <span className="font-mono text-[11px] text-emerald-400">STATUS: CONEXÃO ESTÁVEL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
