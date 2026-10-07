/**
 * Painel de Gateway de Hardware Industrial e Barramento Modbus TCP/RTU
 * Paridade com o SCADA-Communicator do Rapid SCADA v6 e Drivers de Campo do SCADA-LTS
 */

import React, { useState } from 'react';
import { 
  Cpu, 
  Server, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  FileCode, 
  Settings, 
  Database,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { HardwareGatewayStatus, ModbusFieldMapping, Usuario } from '../types';
import { hardwareGatewayServiceInstance } from '../services/hardwareGatewayService';

interface HardwareGatewayPanelProps {
  usuarioAtual: Usuario;
}

export const HardwareGatewayPanel: React.FC<HardwareGatewayPanelProps> = ({
  usuarioAtual
}) => {
  const [gatewayStatus, setGatewayStatus] = useState<HardwareGatewayStatus>(
    hardwareGatewayServiceInstance.getStatus()
  );
  const [mapeamentos, setMapeamentos] = useState<ModbusFieldMapping[]>(
    hardwareGatewayServiceInstance.getMapeamentos()
  );
  const [abaAtiva, setAbaAtiva] = useState<'MAPA_MEMORIA' | 'SCRIPT_PYTHON' | 'FLUXO_NODERED'>('MAPA_MEMORIA');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [copiadoPython, setCopiadoPython] = useState(false);
  const [copiadoNodeRed, setCopiadoNodeRed] = useState(false);

  // Filtro de Mapeamentos
  const mapeamentosFiltrados = mapeamentos.filter(m => {
    if (filtroTipo === 'TODOS') return true;
    return m.tipoRegistrador === filtroTipo;
  });

  const scriptPython = hardwareGatewayServiceInstance.gerarScriptPython();
  const fluxoNodeRed = hardwareGatewayServiceInstance.gerarFluxoNodeRed();

  const handleCopiarPython = () => {
    navigator.clipboard.writeText(scriptPython);
    setCopiadoPython(true);
    setTimeout(() => setCopiadoPython(false), 3000);
  };

  const handleCopiarNodeRed = () => {
    navigator.clipboard.writeText(fluxoNodeRed);
    setCopiadoNodeRed(true);
    setTimeout(() => setCopiadoNodeRed(false), 3000);
  };

  const handleDownloadPython = () => {
    const blob = new Blob([scriptPython], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fte_cdi_modbus_gateway.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadNodeRed = () => {
    const blob = new Blob([fluxoNodeRed], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fte_cdi_nodered_flow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Gateway */}
      <div className="bg-[#0b1220] border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-sky-400" />
            <h2 className="text-xl font-bold font-display text-white tracking-wide">
              Gateway Industrial de Hardware & Barramento Modbus (CLP/PLC Bridge)
            </h2>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700">
              FASE 3 - ONLINE
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ponte de comunicação bidirecional entre Controladores Lógicos (Siemens S7, Schneider, WEG) e a Nuvem Supabase.
          </p>
        </div>

        {/* Métricas de Link de Campo */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-[#070c17] p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">Alvo:</span>
            <strong className="text-sky-300">{gatewayStatus.dispositivoAlvo}</strong>
          </div>

          <div className="bg-[#070c17] p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">Endereço / Porta:</span>
            <strong className="text-white">{gatewayStatus.ipGateway}:{gatewayStatus.porta}</strong>
          </div>

          <div className="bg-[#070c17] p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px]">Latência / Perda:</span>
            <strong className="text-emerald-400">{gatewayStatus.latenciaMs}ms (0.01% drop)</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/50 border border-emerald-600 rounded-lg text-emerald-300 font-mono text-xs font-bold shadow-md">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>CLP CONECTADO</span>
          </div>
        </div>
      </div>

      {/* Navegação de Abas do Módulo */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setAbaAtiva('MAPA_MEMORIA')}
          className={`px-4 py-2.5 font-mono text-xs font-bold rounded-t-lg transition flex items-center gap-2 border-t border-x ${
            abaAtiva === 'MAPA_MEMORIA'
              ? 'bg-[#0f172a] text-white border-slate-700 border-b-transparent'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>Mapeamento de Registradores Modbus ({mapeamentos.length})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('SCRIPT_PYTHON')}
          className={`px-4 py-2.5 font-mono text-xs font-bold rounded-t-lg transition flex items-center gap-2 border-t border-x ${
            abaAtiva === 'SCRIPT_PYTHON'
              ? 'bg-[#0f172a] text-white border-slate-700 border-b-transparent'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span>Script Python Industrial (PyModbus + Supabase)</span>
        </button>

        <button
          onClick={() => setAbaAtiva('FLUXO_NODERED')}
          className={`px-4 py-2.5 font-mono text-xs font-bold rounded-t-lg transition flex items-center gap-2 border-t border-x ${
            abaAtiva === 'FLUXO_NODERED'
              ? 'bg-[#0f172a] text-white border-slate-700 border-b-transparent'
              : 'text-slate-400 hover:text-slate-200 border-transparent'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Fluxo JSON para Node-RED</span>
        </button>
      </div>

      {/* ABA 1: TABELA DE REGISTRADORES MODBUS */}
      {abaAtiva === 'MAPA_MEMORIA' && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Mapa de Memória Modbus (Coils, Discrete Inputs, Input Registers, Holding Registers)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Endereçamento padrão internacional para comunicação com PLCs e IHMs de campo.
              </p>
            </div>

            {/* Filtros de Tipos de Registrador */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['TODOS', 'COIL', 'DISCRETE_INPUT', 'INPUT_REGISTER', 'HOLDING_REGISTER'].map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                    filtroTipo === tipo
                      ? 'bg-sky-600 text-white shadow'
                      : 'bg-[#070c17] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">Endereço Modbus</th>
                  <th className="pb-2">Tipo Registrador</th>
                  <th className="pb-2">Tag SCADA</th>
                  <th className="pb-2">Descrição Funcional</th>
                  <th className="pb-2">Tipo / Escala</th>
                  <th className="pb-2">Acesso</th>
                  <th className="pb-2 text-right">Valor em Tempo Real</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mapeamentosFiltrados.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 font-bold text-sky-400">
                      <code>{m.endereco}</code>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        m.tipoRegistrador === 'COIL' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                        m.tipoRegistrador === 'DISCRETE_INPUT' ? 'bg-indigo-950 text-indigo-300 border-indigo-700' :
                        m.tipoRegistrador === 'INPUT_REGISTER' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                        'bg-purple-950 text-purple-300 border-purple-700'
                      }`}>
                        {m.tipoRegistrador}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-slate-200">
                      {m.nome}
                    </td>
                    <td className="py-2.5 text-slate-400 max-w-xs truncate">
                      {m.descricao}
                    </td>
                    <td className="py-2.5 text-slate-300">
                      {m.tipoDado} {m.fatorEscala !== 1 ? `(x${m.fatorEscala})` : ''}
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-bold ${m.somenteLeitura ? 'text-slate-400' : 'text-amber-400'}`}>
                        {m.somenteLeitura ? 'RO (Leitura)' : 'RW (Leitura/Escrita)'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      <span className="text-emerald-400 bg-[#070c17] px-2 py-1 rounded border border-slate-800">
                        {typeof m.ultimoValorLido === 'boolean' 
                          ? (m.ultimoValorLido ? 'LIGADO / TRUE' : 'DESLIGADO / FALSE')
                          : `${m.ultimoValorLido} ${m.unidade}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: SCRIPT PYTHON */}
      {abaAtiva === 'SCRIPT_PYTHON' && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                Script Python de Campo (fte_cdi_modbus_gateway.py)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pronto para execução como serviço autônomo (systemd) em Raspberry Pi ou computador industrial na planta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarPython}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                {copiadoPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiadoPython ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
              <button
                onClick={handleDownloadPython}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .py</span>
              </button>
            </div>
          </div>

          <pre className="bg-[#050811] border border-slate-800 p-4 rounded-xl text-emerald-300 font-mono text-xs overflow-x-auto max-h-[500px]">
            <code>{scriptPython}</code>
          </pre>
        </div>
      )}

      {/* ABA 3: FLUXO NODE-RED */}
      {abaAtiva === 'FLUXO_NODERED' && (
        <div className="bg-[#0b1220] border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Fluxo Node-RED para Importação Direta (flows.json)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Importe este arquivo no Node-RED através do menu <em>Import &gt; Clipboard</em> para ler e enviar ao Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarNodeRed}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
              >
                {copiadoNodeRed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiadoNodeRed ? 'Copiado!' : 'Copiar JSON'}</span>
              </button>
              <button
                onClick={handleDownloadNodeRed}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar JSON</span>
              </button>
            </div>
          </div>

          <pre className="bg-[#050811] border border-slate-800 p-4 rounded-xl text-purple-300 font-mono text-xs overflow-x-auto max-h-[500px]">
            <code>{fluxoNodeRed}</code>
          </pre>
        </div>
      )}

    </div>
  );
};
