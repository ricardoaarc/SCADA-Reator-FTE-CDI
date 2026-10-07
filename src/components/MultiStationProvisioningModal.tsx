/**
 * Painel e Modal de Provisionamento e Gerenciamento de Estações Remotas Multi-Site (ISA-95 Nível 3)
 * Suporte a CRUD de Estações, Instrumentos e Mapeamento Modbus/MQTT com Supabase
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  MapPin, 
  Radio, 
  Activity, 
  CheckCircle2, 
  Sliders, 
  Server, 
  ShieldCheck, 
  Cpu, 
  Wrench,
  Gauge,
  Compass
} from 'lucide-react';
import { 
  multiStationServiceInstance, 
  StationConfig, 
  StationInstrument 
} from '../services/multiStationService';

interface MultiStationProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEstacaoAtiva?: (nomeEstacao: string) => void;
}

export const MultiStationProvisioningModal: React.FC<MultiStationProvisioningModalProps> = ({
  isOpen,
  onClose,
  onSelectEstacaoAtiva
}) => {
  const [estacoes, setEstacoes] = useState<StationConfig[]>(multiStationServiceInstance.getEstacoes());
  const [estacaoEditando, setEstacaoEditando] = useState<StationConfig | null>(null);
  const [modalFormAberto, setModalFormAberto] = useState(false);

  // Mapeamento de Instrumentos da Estação Selecionada
  const [estacaoParaInstrumentos, setEstacaoParaInstrumentos] = useState<StationConfig | null>(null);
  const [instrumentos, setInstrumentos] = useState<StationInstrument[]>([]);
  const [modalInstFormAberto, setModalInstFormAberto] = useState(false);
  const [instEditando, setInstEditando] = useState<StationInstrument | null>(null);

  // Campos Form Estação
  const [codigoEstacao, setCodigoEstacao] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<StationConfig['tipo']>('ETA');
  const [latitude, setLatitude] = useState('-23.55052');
  const [longitude, setLongitude] = useState('-46.633308');
  const [ipGateway, setIpGateway] = useState('192.168.1.100:502');
  const [protocolo, setProtocolo] = useState<StationConfig['protocolo']>('MODBUS_TCP');
  const [frequenciaPingS, setFrequenciaPingS] = useState('5');

  // Campos Form Instrumento
  const [tagEquipamento, setTagEquipamento] = useState('');
  const [nomeAmigavel, setNomeAmigavel] = useState('');
  const [tipoEquipamento, setTipoEquipamento] = useState<StationInstrument['tipoEquipamento']>('SENS_PRESSAO');
  const [enderecoModbus, setEnderecoModbus] = useState('40001 (Holding Reg 1)');
  const [unidadeMedida, setUnidadeMedida] = useState('bar');
  const [limiteMin, setLimiteMin] = useState('');
  const [limiteMax, setLimiteMax] = useState('');

  if (!isOpen) return null;

  const handleAbrirCriacaoEstacao = (e?: StationConfig) => {
    if (e) {
      setEstacaoEditando(e);
      setCodigoEstacao(e.codigoEstacao);
      setNome(e.nome);
      setTipo(e.tipo);
      setLatitude(String(e.latitude));
      setLongitude(String(e.longitude));
      setIpGateway(e.ipGateway);
      setProtocolo(e.protocolo);
      setFrequenciaPingS(String(e.frequenciaPingS));
    } else {
      setEstacaoEditando(null);
      setCodigoEstacao(`ETA-BAIRRO-${String(estacoes.length + 1).padStart(2, '0')}`);
      setNome(`ETA Bairro ${String.fromCharCode(65 + estacoes.length)} — Tratamento FTE-CDI`);
      setTipo('ETA');
      setLatitude('-23.55000');
      setLongitude('-46.63000');
      setIpGateway('192.168.1.200:502');
      setProtocolo('MQTT_TLS');
      setFrequenciaPingS('5');
    }
    setModalFormAberto(true);
  };

  const handleSalvarEstacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !codigoEstacao) return;

    multiStationServiceInstance.salvarEstacao({
      id: estacaoEditando ? estacaoEditando.id : undefined,
      codigoEstacao,
      nome,
      tipo,
      latitude: parseFloat(latitude) || -23.55,
      longitude: parseFloat(longitude) || -46.63,
      ipGateway,
      protocolo,
      frequenciaPingS: parseInt(frequenciaPingS) || 5,
      statusConexao: 'ONLINE'
    });

    setEstacoes([...multiStationServiceInstance.getEstacoes()]);
    setModalFormAberto(false);
  };

  const handleExcluirEstacao = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente remover esta estação e todos os seus instrumentos cadastrados?')) {
      multiStationServiceInstance.excluirEstacao(id);
      setEstacoes([...multiStationServiceInstance.getEstacoes()]);
    }
  };

  const handleAbrirInstrumentos = (e: StationConfig, event: React.MouseEvent) => {
    event.stopPropagation();
    setEstacaoParaInstrumentos(e);
    setInstrumentos(multiStationServiceInstance.getInstrumentosPorEstacao(e.id));
  };

  const handleAbrirCriacaoInstrumento = (i?: StationInstrument) => {
    if (i) {
      setInstEditando(i);
      setTagEquipamento(i.tagEquipamento);
      setNomeAmigavel(i.nomeAmigavel);
      setTipoEquipamento(i.tipoEquipamento);
      setEnderecoModbus(i.enderecoModbus);
      setUnidadeMedida(i.unidadeMedida);
      setLimiteMin(i.limiteAlertaMin !== undefined ? String(i.limiteAlertaMin) : '');
      setLimiteMax(i.limiteAlertaMax !== undefined ? String(i.limiteAlertaMax) : '');
    } else {
      setInstEditando(null);
      setTagEquipamento(`PT_${100 + instrumentos.length + 1}`);
      setNomeAmigavel('Novo Sensor Telemetrado');
      setTipoEquipamento('SENS_PRESSAO');
      setEnderecoModbus(`400${10 + instrumentos.length} (Holding Reg)`);
      setUnidadeMedida('bar');
      setLimiteMin('0.5');
      setLimiteMax('4.5');
    }
    setModalInstFormAberto(true);
  };

  const handleSalvarInstrumento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estacaoParaInstrumentos || !tagEquipamento) return;

    multiStationServiceInstance.salvarInstrumento({
      id: instEditando ? instEditando.id : undefined,
      stationId: estacaoParaInstrumentos.id,
      tagEquipamento,
      nomeAmigavel,
      tipoEquipamento,
      enderecoModbus,
      unidadeMedida,
      limiteAlertaMin: limiteMin ? parseFloat(limiteMin) : undefined,
      limiteAlertaMax: limiteMax ? parseFloat(limiteMax) : undefined,
      statusOperacional: 'OK'
    });

    setInstrumentos(multiStationServiceInstance.getInstrumentosPorEstacao(estacaoParaInstrumentos.id));
    setModalInstFormAberto(false);
  };

  const handleExcluirInstrumento = (id: string) => {
    if (confirm('Deseja remover este instrumento da estação?')) {
      multiStationServiceInstance.excluirInstrumento(id);
      if (estacaoParaInstrumentos) {
        setInstrumentos(multiStationServiceInstance.getInstrumentosPorEstacao(estacaoParaInstrumentos.id));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                <span>Provisionamento & Gestão de Estações Remotas Multi-Site</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700">
                  PADRÃO ISA-95 MASTER
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre e configure novas ETAs, ETEs, Poços e Adutoras em tempo real sincronizados com o Supabase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAbrirCriacaoEstacao()}
              className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-sky-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Nova Estação Remota</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Grid de Estações Cadastradas */}
        <div className="py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estacoes.map(e => {
            const insts = multiStationServiceInstance.getInstrumentosPorEstacao(e.id);
            return (
              <div
                key={e.id}
                onClick={() => {
                  if (onSelectEstacaoAtiva) {
                    onSelectEstacaoAtiva(e.nome);
                    onClose();
                  }
                }}
                className="bg-[#0b1220] border border-slate-800 hover:border-sky-500 p-4 rounded-xl shadow-lg transition-all flex flex-col justify-between cursor-pointer group hover:scale-[1.01]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                      {e.codigoEstacao}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(event) => handleAbrirInstrumentos(e, event)}
                        className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded text-[10px] font-mono font-bold flex items-center gap-1 transition border border-purple-500/40"
                        title="Gerenciar Instrumentos da Estação"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>{insts.length} Equip.</span>
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleAbrirCriacaoEstacao(e);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Editar Estação"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(event) => handleExcluirEstacao(e.id, event)}
                        className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
                        title="Excluir Estação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-2.5 group-hover:text-sky-300 transition line-clamp-1">{e.nome}</h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      GPS: {e.latitude.toFixed(3)}, {e.longitude.toFixed(3)}
                    </span>
                  </div>

                  <div className="bg-[#050914] p-2.5 rounded-lg border border-slate-800/80 my-3 font-mono text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway IP:</span>
                      <span className="text-sky-400 font-bold">{e.ipGateway}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Protocolo:</span>
                      <span className="text-purple-300 font-semibold">{e.protocolo}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Status: ONLINE ({e.frequenciaPingS}s)
                  </span>
                  <span className="text-slate-500">
                    Clique para Ativar ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL FORMULÁRIO DE ESTAÇÃO (CRIAR/EDITAR) */}
        {modalFormAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0a1120] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl p-5 relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <span>{estacaoEditando ? `Editar Estação: ${estacaoEditando.codigoEstacao}` : 'Cadastrar Nova Estação Remota'}</span>
                </h3>
                <button onClick={() => setModalFormAberto(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSalvarEstacao} className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Código Estação:</label>
                    <input
                      type="text"
                      value={codigoEstacao}
                      onChange={(e) => setCodigoEstacao(e.target.value)}
                      placeholder="Ex: ETA-BAIRRO-X01"
                      required
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Tipo de Unidade:</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as any)}
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="ETA">ETA — Estação Tratamento Água</option>
                      <option value="ETE">ETE — Estação Tratamento Efluentes</option>
                      <option value="POCO_ADUTORA">Poço Tubular / Adutora</option>
                      <option value="RESERVATORIO">Reservatório Distribuído</option>
                      <option value="REBOOT_PUMP">Estação de Elevatória</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Nome Completo da Estação:</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: ETA Bairro X 01 — Tratamento FTE-CDI"
                    required
                    className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Latitude GPS:</label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Longitude GPS:</label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">IP Gateway CLP:</label>
                    <input
                      type="text"
                      value={ipGateway}
                      onChange={(e) => setIpGateway(e.target.value)}
                      placeholder="Ex: 192.168.1.100:502"
                      required
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Protocolo SCADA:</label>
                    <select
                      value={protocolo}
                      onChange={(e) => setProtocolo(e.target.value as any)}
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="MODBUS_TCP">Modbus TCP/IP</option>
                      <option value="MQTT_TLS">MQTT over TLS</option>
                      <option value="OPC_UA">OPC UA Server</option>
                      <option value="REST_API">REST API / HTTPS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Ping Freq (s):</label>
                    <input
                      type="number"
                      value={frequenciaPingS}
                      onChange={(e) => setFrequenciaPingS(e.target.value)}
                      className="w-full bg-[#050914] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button type="button" onClick={() => setModalFormAberto(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-bold">
                    Cancelar
                  </button>
                  <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-600/30">
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar no Supabase</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL MAPPING DE INSTRUMENTOS DA ESTAÇÃO SELECIONADA */}
        {estacaoParaInstrumentos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-[#0a1120] border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl p-5 relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white font-display text-base">
                    Instrumentação & Mapeamento I/O — {estacaoParaInstrumentos.codigoEstacao}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAbrirCriacaoInstrumento()}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Instrumento</span>
                  </button>
                  <button onClick={() => setEstacaoParaInstrumentos(null)} className="p-1 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {instrumentos.length === 0 ? (
                  <p className="text-center py-8 text-xs font-mono text-slate-500">Nenhum instrumento cadastrado nesta estação remota.</p>
                ) : (
                  instrumentos.map(inst => (
                    <div key={inst.id} className="bg-[#050914] p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-300">{inst.tagEquipamento}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">{inst.tipoEquipamento}</span>
                          <span className="text-slate-400 text-[11px]">{inst.nomeAmigavel}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Registrador CLP/Modbus: {inst.enderecoModbus} | Unidade: {inst.unidadeMedida}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAbrirCriacaoInstrumento(inst)} className="p-1 text-slate-400 hover:text-white">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleExcluirInstrumento(inst.id)} className="p-1 text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* FORMULÁRIO DE NOVO INSTRUMENTO */}
              {modalInstFormAberto && (
                <form onSubmit={handleSalvarInstrumento} className="p-4 bg-[#080e1a] rounded-xl border border-purple-800/80 space-y-3 font-mono text-xs">
                  <h4 className="font-bold text-purple-300 mb-2">{instEditando ? 'Editar Instrumento' : 'Cadastrar Novo Instrumento na Estação'}</h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Tag Equipamento:</label>
                      <input
                        type="text"
                        value={tagEquipamento}
                        onChange={(e) => setTagEquipamento(e.target.value)}
                        placeholder="Ex: PT_101"
                        required
                        className="w-full bg-[#050914] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Tipo Equipamento:</label>
                      <select
                        value={tipoEquipamento}
                        onChange={(e) => setTipoEquipamento(e.target.value as any)}
                        className="w-full bg-[#050914] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white cursor-pointer"
                      >
                        <option value="SENS_PRESSAO">Transmissor de Pressão</option>
                        <option value="FIT_VAZAO">Medidor de Vazão FIT</option>
                        <option value="ANALISADOR_F">Analisador de Fluoreto</option>
                        <option value="PHMETRO">Medidor de pH</option>
                        <option value="TURBIDIMETRO">Turbidímetro</option>
                        <option value="BOMBA">Bomba Centrifuga/Submersa</option>
                        <option value="VALVULA">Válvula Motorizada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Unidade Medida:</label>
                      <input
                        type="text"
                        value={unidadeMedida}
                        onChange={(e) => setUnidadeMedida(e.target.value)}
                        placeholder="Ex: bar, m³/h, mg/L"
                        className="w-full bg-[#050914] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Nome Amigável:</label>
                      <input
                        type="text"
                        value={nomeAmigavel}
                        onChange={(e) => setNomeAmigavel(e.target.value)}
                        placeholder="Ex: Transmissor Entrada"
                        required
                        className="w-full bg-[#050914] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Endereço Registrador Modbus:</label>
                      <input
                        type="text"
                        value={enderecoModbus}
                        onChange={(e) => setEnderecoModbus(e.target.value)}
                        placeholder="Ex: 40001 (Holding Reg 1)"
                        required
                        className="w-full bg-[#050914] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setModalInstFormAberto(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded font-bold">Cancelar</button>
                    <button type="submit" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Instrumento</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
