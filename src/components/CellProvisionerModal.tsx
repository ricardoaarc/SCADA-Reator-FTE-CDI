/**
 * Modal de Provisionamento e Configuração Modular de Células (1-Click Expansion)
 * Supervisório SCADA Reator FTE-CDI (Arquitetura Orientada a Objetos / UDT)
 * Permite adicionar, habilitar, desabilitar e arquivar células no rack dinamicamente
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Power, 
  X, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Save,
  ShieldCheck,
  Settings,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { CelulaInfo, Usuario } from '../types';

interface CellProvisionerModalProps {
  celulas: CelulaInfo[];
  usuarioAtual: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onAdicionarCelula: (config?: Partial<CelulaInfo>) => void;
  onRemoverCelula: (celulaId: number) => void;
  onAlternarAtivacaoCelula: (celulaId: number, ativa: boolean) => void;
}

export const CellProvisionerModal: React.FC<CellProvisionerModalProps> = ({
  celulas,
  usuarioAtual,
  isOpen,
  onClose,
  onAdicionarCelula,
  onRemoverCelula,
  onAlternarAtivacaoCelula,
}) => {
  if (!isOpen) return null;

  const [codigoNovo, setCodigoNovo] = useState<string>(`CEL-${celulas.length + 1 < 10 ? '0' + (celulas.length + 1) : celulas.length + 1}`);
  const [paresEletrodo, setParesEletrodo] = useState<number>(146);
  const [vazaoNominalLh, setVazaoNominalLh] = useState<number>(11250);
  const [dimensoesMm, setDimensoesMm] = useState<string>('2000 x 1600 x 900');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const totalAtivas = celulas.filter(c => c.ativa).length;
  const vazaoProjetadaM3h = (totalAtivas * vazaoNominalLh) / 1000;
  const areaAtivaTotalM2 = totalAtivas * (paresEletrodo * 2.56);

  const handleCriarCelula = () => {
    onAdicionarCelula({
      codigo: codigoNovo,
      pares_eletrodo: paresEletrodo,
      vazaoLh: vazaoNominalLh,
      dimensoes_mm: dimensoesMm,
      area_ativa_m2: paresEletrodo * 2.56,
      ativa: true
    });

    setMensagemSucesso(`Célula ${codigoNovo} provisionada com sucesso e integrada ao Rack!`);
    setCodigoNovo(`CEL-${celulas.length + 2 < 10 ? '0' + (celulas.length + 2) : celulas.length + 2}`);
    setTimeout(() => setMensagemSucesso(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0e1422] border border-sky-500/40 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal */}
        <div className="p-5 bg-gradient-to-r from-[#11192e] to-[#151f38] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Provisionador Modular de Células (1-Click Expansion)
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-700">
                  UDT TEMPLATE SCADA
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Adicione, dimensione ou isole células no Skid FTE-CDI com recálculo automático de balanço hidráulico.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de Sucesso */}
        {mensagemSucesso && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500 text-xs font-mono text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* 1. Indicadores de Dimensionamento do Skid em Tempo Real */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-[#070a10] border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Células Ativas no Rack</span>
              <span className="text-xl font-bold text-sky-400">{totalAtivas} de {celulas.length} células</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Grid dinâmico auto-ajustável</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a10] border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Vazão Total Projetada</span>
              <span className="text-xl font-bold text-emerald-400">{vazaoProjetadaM3h.toFixed(1)} m³/h</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{(vazaoProjetadaM3h / 3.6).toFixed(1)} L/s (DN200 PN10)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070a10] border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Área Ativa Total de Feltro</span>
              <span className="text-xl font-bold text-purple-400">{areaAtivaTotalM2.toFixed(0)} m²</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">{totalAtivas * paresEletrodo} pares de eletrodos</span>
            </div>
          </div>

          {/* 2. Formulário de Provisionamento Rápido (1-Click) */}
          <div className="p-4 rounded-xl bg-[#111625] border border-purple-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Provisionar Nova Célula com 1 Clique (Template UDT)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Operador: <span className="text-white font-bold">{usuarioAtual.nome} ({usuarioAtual.nivel_acesso})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Código da Célula:</label>
                <input
                  type="text"
                  value={codigoNovo}
                  onChange={(e) => setCodigoNovo(e.target.value)}
                  className="w-full bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Pares de Eletrodo:</label>
                <input
                  type="number"
                  value={paresEletrodo}
                  onChange={(e) => setParesEletrodo(Number(e.target.value))}
                  className="w-full bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Vazão Nominal (L/h):</label>
                <input
                  type="number"
                  value={vazaoNominalLh}
                  onChange={(e) => setVazaoNominalLh(Number(e.target.value))}
                  className="w-full bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Dimensões (mm):</label>
                <input
                  type="text"
                  value={dimensoesMm}
                  onChange={(e) => setDimensoesMm(e.target.value)}
                  className="w-full bg-[#070a10] border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCriarCelula}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                Criar e Conectar Célula no Skid
              </button>
            </div>
          </div>

          {/* 3. Tabela de Gerenciamento das Células Instaladas */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
              Células Provisionadas no Rack ({celulas.length} Unidades)
            </span>

            <div className="overflow-x-auto max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-[#070a10]">
              <table className="w-full text-xs font-mono text-left">
                <thead className="sticky top-0 bg-[#0c101c] border-b border-slate-800 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Célula</th>
                    <th className="p-2.5">Posição Rack</th>
                    <th className="p-2.5">Pares</th>
                    <th className="p-2.5">Área Ativa</th>
                    <th className="p-2.5">Vazão Atual</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Ações (LOTO / Remoção)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {celulas.map((c) => (
                    <tr key={c.id} className="hover:bg-[#111827] transition">
                      <td className="p-2.5 font-bold text-white">{c.codigo}</td>
                      <td className="p-2.5 text-slate-400">Linha {c.linhaRack}, Coluna {c.colunaRack}</td>
                      <td className="p-2.5 text-slate-300">{c.pares_eletrodo} pares</td>
                      <td className="p-2.5 text-purple-300">{(c.area_ativa_m2 ?? 375).toFixed(1)} m²</td>
                      <td className="p-2.5 text-sky-300">{(c.vazaoLh / 1000).toFixed(2)} m³/h</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          !c.ativa
                            ? 'bg-slate-800 text-slate-400'
                            : c.interlockDisparado
                              ? 'bg-red-950 text-red-300 border border-red-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        }`}>
                          {!c.ativa ? 'ISOLADA (STANDBY)' : c.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onAlternarAtivacaoCelula(c.id, !c.ativa)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                            c.ativa
                              ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900/60'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                          }`}
                          title={c.ativa ? 'Isolar célula para manutenção (LOTO)' : 'Habilitar célula'}
                        >
                          <Power className="w-3 h-3" />
                          {c.ativa ? 'Isolar (LOTO)' : 'Habilitar'}
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Confirma a remoção da ${c.codigo} do Rack FTE-CDI?`)) {
                              onRemoverCelula(c.id);
                            }
                          }}
                          className="p-1 rounded text-red-400 hover:bg-red-950/60 border border-transparent hover:border-red-700 transition"
                          title="Remover célula do rack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-[#0a0e17] border-t border-slate-800 flex justify-between items-center text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-400" />
            <span>As modificações atualizam o CLP e a tabela `celulas` no Supabase instantaneamente.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
