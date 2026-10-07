import React, { useState } from 'react';
import { Database, Download, Copy, Check, Table, Code2, Users, Lock, RotateCcw } from 'lucide-react';
import { dbInstance } from '../services/database';

export const SqlSchemaViewer: React.FC = () => {
  const [tabelaAtiva, setTabelaAtiva] = useState<'DDL' | 'CELULAS' | 'RELES' | 'TELEMETRIA' | 'ALARMES' | 'EVENTOS_REARME' | 'LAUDOS'>('DDL');
  const [copiado, setCopiado] = useState(false);

  const reles = dbInstance.getReles();
  const telemetria = dbInstance.getHistoricoTelemetriaGeral(32);
  const alarmes = dbInstance.getAlarmes();
  const eventosRearme = dbInstance.getEventosRearme();
  const laudosSalvos = dbInstance.getLaudos();

  const ddlSql = `-- Modelagem Relacional SCADA FTE-CDI Industrial (16 Células - 180 m³/h / 50 L/s)
-- Compatibilidade: PostgreSQL / Supabase / MySQL

CREATE TABLE celulas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,      -- 'CEL-01' a 'CEL-16'
    posicao_rack INT NOT NULL,               -- 1 a 16 (Grid 4x4)
    ativa BOOLEAN DEFAULT TRUE,
    criada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reles_atuadores (
    id SERIAL PRIMARY KEY,
    celula_id INT REFERENCES celulas(id) NOT NULL,
    tipo VARCHAR(30) NOT NULL,              -- 'FONTE_DC', 'VALVULA_ALIMENTACAO', 'BOMBA_FEED'
    estado VARCHAR(10) NOT NULL DEFAULT 'FECHADO',
    motivo_ultimo_estado TEXT,
    requer_rearme_manual BOOLEAN DEFAULT FALSE,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(celula_id, tipo)
);

CREATE TABLE ciclos_reator (
    id SERIAL PRIMARY KEY,
    celula_id INT REFERENCES celulas(id) NOT NULL,
    fase VARCHAR(20) NOT NULL,              -- 'ADSORCAO' ou 'REGENERACAO'
    inicio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fim TIMESTAMPTZ,
    tensao_alvo DECIMAL(4,2),
    motivo_encerramento VARCHAR(30),
    eficiencia_final_pct DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'EM_ANDAMENTO'
);

CREATE TABLE telemetria_sensores (
    id SERIAL PRIMARY KEY,
    celula_id INT REFERENCES celulas(id) NOT NULL,
    ciclo_id INT REFERENCES ciclos_reator(id),
    pressao_bar DECIMAL(4,2),               -- Corte de interlock em 2.80 bar (Limite estrutural: 3.00 bar)
    vazao_l_h DECIMAL(8,2),                 -- ~11.250 L/h por célula (180 m³/h total)
    corrente_amp DECIMAL(10,2),
    tensao_v DECIMAL(4,2),
    polaridade VARCHAR(10) DEFAULT 'NORMAL',
    ph DECIMAL(3,1),
    temperatura_c DECIMAL(4,1),
    fluoreto_in_ppm DECIMAL(6,2),
    fluoreto_out_ppm DECIMAL(6,2),
    conformidade_regulatoria BOOLEAN GENERATED ALWAYS AS (fluoreto_out_ppm <= 1.5) STORED,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetria_celula_tempo ON telemetria_sensores(celula_id, timestamp DESC);

CREATE TABLE alarmes (
    id SERIAL PRIMARY KEY,
    celula_id INT REFERENCES celulas(id),
    nivel_severidade VARCHAR(30) NOT NULL,  -- 'ALERTA' | 'CRITICO' | 'NAO_CONFORMIDADE_REGULATORIA' | 'INFO'
    codigo VARCHAR(30) NOT NULL,
    mensagem TEXT,
    resolvido BOOLEAN DEFAULT FALSE,
    resolvido_em TIMESTAMPTZ,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    nivel_acesso VARCHAR(20) NOT NULL DEFAULT 'OPERADOR' -- 'OPERADOR' | 'SUPERVISOR' | 'ENGENHEIRO'
);

CREATE TABLE eventos_rearme (
    id SERIAL PRIMARY KEY,
    celula_id INT REFERENCES celulas(id) NOT NULL,
    usuario_id INT REFERENCES usuarios(id) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    observacao TEXT
);`;

  const copiarDump = () => {
    const dump = dbInstance.exportarSqlDump();
    navigator.clipboard.writeText(dump);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const baixarDump = () => {
    const dump = dbInstance.exportarSqlDump();
    const blob = new Blob([dump], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scada_fte_cdi_16celulas_dump_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 rounded-2xl bg-[#0c1220] border border-slate-800 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Persistência Relacional SQL (PostgreSQL / Supabase)
            </h3>
            <p className="text-xs text-slate-400">
              Modelagem granular por célula (16 células), relés de hardware, rastreabilidade de rearme e auditoria regulatória.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <button
            onClick={copiarDump}
            className="px-3 py-1.5 bg-[#151f33] hover:bg-[#1f2d4a] text-xs font-mono text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado!' : 'Copiar DUMP'}
          </button>

          <button
            onClick={baixarDump}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-mono font-bold text-white rounded-lg shadow flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar .sql
          </button>
        </div>
      </div>

      {/* Navegação entre Tabelas */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
        <button
          onClick={() => setTabelaAtiva('DDL')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'DDL' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          Schema DDL
        </button>
        <button
          onClick={() => setTabelaAtiva('RELES')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'RELES' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          reles_atuadores ({reles.length})
        </button>
        <button
          onClick={() => setTabelaAtiva('TELEMETRIA')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'TELEMETRIA' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          telemetria_sensores ({telemetria.length})
        </button>
        <button
          onClick={() => setTabelaAtiva('ALARMES')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'ALARMES' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          alarmes ({alarmes.length})
        </button>
        <button
          onClick={() => setTabelaAtiva('EVENTOS_REARME')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'EVENTOS_REARME' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          eventos_rearme ({eventosRearme.length})
        </button>
        <button
          onClick={() => setTabelaAtiva('LAUDOS')}
          className={`px-3 py-1.5 rounded-lg transition font-bold shrink-0 ${
            tabelaAtiva === 'LAUDOS' ? 'bg-sky-600 text-white' : 'bg-[#151f33] text-slate-400 hover:text-white'
          }`}
        >
          laudos_laboratoriais ({laudosSalvos.length})
        </button>
      </div>

      {/* Conteúdo da Tabela Selecionada */}
      <div className="bg-[#070c16] rounded-xl p-4 border border-slate-800">
        {tabelaAtiva === 'DDL' && (
          <pre className="text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre">
            {ddlSql}
          </pre>
        )}

        {tabelaAtiva === 'RELES' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#0c1220] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2">celula_id</th>
                  <th className="p-2">tipo</th>
                  <th className="p-2">estado</th>
                  <th className="p-2">requer_rearme_manual</th>
                  <th className="p-2">motivo_ultimo_estado</th>
                  <th className="p-2">atualizado_em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reles.map(r => (
                  <tr key={r.id} className="hover:bg-[#111a2f]">
                    <td className="p-2 font-bold text-sky-400">CEL-{r.celula_id < 10 ? '0' + r.celula_id : r.celula_id}</td>
                    <td className="p-2 text-slate-200">{r.tipo}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.estado === 'FECHADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
                      }`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="p-2 text-slate-300">{r.requer_rearme_manual ? 'TRUE' : 'FALSE'}</td>
                    <td className="p-2 text-slate-400">{r.motivo_ultimo_estado}</td>
                    <td className="p-2 text-slate-500">{new Date(r.atualizado_em).toLocaleTimeString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tabelaAtiva === 'TELEMETRIA' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#0c1220] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2">celula_id</th>
                  <th className="p-2">pressao_bar</th>
                  <th className="p-2">vazao_l_h</th>
                  <th className="p-2">corrente_amp</th>
                  <th className="p-2">tensao_v</th>
                  <th className="p-2">fluoreto_in</th>
                  <th className="p-2">fluoreto_out</th>
                  <th className="p-2">portaria_888</th>
                  <th className="p-2">timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {telemetria.map(t => (
                  <tr key={t.id} className="hover:bg-[#111a2f]">
                    <td className="p-2 font-bold text-sky-400">CEL-{t.celula_id < 10 ? '0' + t.celula_id : t.celula_id}</td>
                    <td className={`p-2 font-bold ${t.pressao_bar >= 2.80 ? 'text-red-400' : 'text-slate-200'}`}>{t.pressao_bar.toFixed(2)}</td>
                    <td className="p-2 text-slate-200">{t.vazao_l_h.toFixed(0)}</td>
                    <td className="p-2 text-sky-300">{t.corrente_amp.toFixed(1)}</td>
                    <td className="p-2 text-emerald-400">{t.tensao_v.toFixed(2)}</td>
                    <td className="p-2 text-amber-300">{t.fluoreto_in_ppm.toFixed(2)}</td>
                    <td className={`p-2 font-bold ${t.fluoreto_out_ppm > 1.50 ? 'text-red-400' : 'text-emerald-400'}`}>{t.fluoreto_out_ppm.toFixed(2)}</td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.conformidade_regulatoria ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                        {t.conformidade_regulatoria ? 'CONFORME' : 'NÃO CONFORME'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-500">{new Date(t.timestamp).toLocaleTimeString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tabelaAtiva === 'EVENTOS_REARME' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#0c1220] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2">id</th>
                  <th className="p-2">celula_id</th>
                  <th className="p-2">usuario</th>
                  <th className="p-2">observacao_tecnica</th>
                  <th className="p-2">timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {eventosRearme.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">Nenhum evento de rearme manual registrado.</td>
                  </tr>
                ) : (
                  eventosRearme.map(e => (
                    <tr key={e.id} className="hover:bg-[#111a2f]">
                      <td className="p-2 text-slate-400">{e.id}</td>
                      <td className="p-2 font-bold text-sky-400">CEL-{e.celula_id < 10 ? '0' + e.celula_id : e.celula_id}</td>
                      <td className="p-2 text-white font-bold">{e.usuario_nome} ({e.usuario_matricula})</td>
                      <td className="p-2 text-slate-200">{e.observacao}</td>
                      <td className="p-2 text-slate-400">{new Date(e.timestamp).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tabelaAtiva === 'ALARMES' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#0c1220] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2">id</th>
                  <th className="p-2">origem</th>
                  <th className="p-2">severidade</th>
                  <th className="p-2">codigo</th>
                  <th className="p-2">mensagem</th>
                  <th className="p-2">reconhecido</th>
                  <th className="p-2">timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {alarmes.map(a => (
                  <tr key={a.id} className="hover:bg-[#111a2f]">
                    <td className="p-2 text-slate-400">{a.id}</td>
                    <td className="p-2 font-bold text-sky-400">{a.celula_id ? `CEL-${a.celula_id}` : 'Rack'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.nivel_severidade === 'CRITICO' ? 'bg-red-950 text-red-300' : a.nivel_severidade === 'NAO_CONFORMIDADE_REGULATORIA' ? 'bg-purple-950 text-purple-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {a.nivel_severidade}
                      </span>
                    </td>
                    <td className="p-2 text-amber-300">{a.codigo}</td>
                    <td className="p-2 text-slate-200">{a.mensagem}</td>
                    <td className="p-2 text-slate-400">{a.reconhecido ? `SIM (${a.reconhecido_por})` : 'NÃO'}</td>
                    <td className="p-2 text-slate-500">{new Date(a.timestamp).toLocaleTimeString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tabelaAtiva === 'LAUDOS' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-[#0c1220] text-slate-400 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2">numero_laudo</th>
                  <th className="p-2">local_coleta</th>
                  <th className="p-2">fluoreto_mg_l</th>
                  <th className="p-2">ph</th>
                  <th className="p-2">std_mg_l</th>
                  <th className="p-2">portaria_888</th>
                  <th className="p-2">laboratorio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {laudosSalvos.map(l => (
                  <tr key={l.id} className="hover:bg-[#111a2f]">
                    <td className="p-2 font-bold text-sky-400">{l.numeroLaudo}</td>
                    <td className="p-2 text-slate-200">{l.localColeta}</td>
                    <td className="p-2 font-bold text-amber-300">{l.parametrosChaveFteCdi.fluoretoMgL ?? '--'} mg/L</td>
                    <td className="p-2 text-emerald-400">{l.parametrosChaveFteCdi.ph ?? '--'}</td>
                    <td className="p-2 text-slate-300">{l.parametrosChaveFteCdi.stdMgL ?? '--'} mg/L</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.conformidadePortaria888 === null ? 'bg-amber-950 text-amber-300' : l.conformidadePortaria888 ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                      }`}>
                        {l.conformidadePortaria888 === null ? 'A VERIFICAR' : l.conformidadePortaria888 ? 'CONFORME' : 'NÃO CONFORME'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-400">{l.laboratorio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
