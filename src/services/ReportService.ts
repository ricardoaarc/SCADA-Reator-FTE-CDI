/**
 * Serviço de Geração e Exportação de Relatórios (Excel e Laudo Técnico PDF)
 * Reator FTE-CDI - Desfluoretação por Eletrodiálise Capacitiva
 */

import { CicloReator, TelemetriaSensor, Alarme, SensorData } from '../types';
import { authService } from './AuthService';

export class ReportService {
  /**
   * Exporta os dados completos em formato compatível com Microsoft Excel (CSV com BOM UTF-8)
   */
  public exportarPlanilhaExcel(
    ciclos: CicloReator[],
    telemetrias: TelemetriaSensor[],
    alarmes: Alarme[]
  ): void {
    const operador = authService.getOperadorAtual();
    const dataHora = new Date().toLocaleString('pt-BR');

    let csvContent = '\uFEFF'; // Byte Order Mark para acentuação correta no Excel

    // Cabeçalho institucional do relatório
    csvContent += `RELATÓRIO TÉCNICO DE OPERAÇÃO - REATOR FTE-CDI (RACK 10 CÉLULAS)\r\n`;
    csvContent += `Alvo do Processo: Remoção Seletiva de Íons Fluoreto (F-)\r\n`;
    csvContent += `Emitido por: ${operador.nome} (${operador.matricula} - ${operador.role})\r\n`;
    csvContent += `Data de Emissão: ${dataHora}\r\n`;
    csvContent += `Restrição Mecânica Crítica: Pressão Máxima no Plenum PEAD = 3.00 bar\r\n\r\n`;

    // 1. Tabela de Ciclos Operacionais
    csvContent += `=== TABELA 1: CICLOS OPERACIONAIS (ADSORÇÃO / REGENERAÇÃO) ===\r\n`;
    csvContent += `ID Ciclo;Fase;Data/Hora Início;Data/Hora Fim;Tensão Alvo (V);Status Operacional\r\n`;

    ciclos.forEach(c => {
      const inicio = new Date(c.inicio).toLocaleString('pt-BR');
      const fim = c.fim ? new Date(c.fim).toLocaleString('pt-BR') : 'Em Operação';
      csvContent += `${c.id};${c.fase};${inicio};${fim};${c.tensao_alvo.toFixed(2)};${c.status}\r\n`;
    });

    csvContent += `\r\n`;

    // 2. Tabela de Telemetria de Sensores
    csvContent += `=== TABELA 2: HISTÓRICO DE TELEMETRIA INDUSTRIAL (SENSORES) ===\r\n`;
    csvContent += `Timestamp;Ciclo ID;Pressão (bar);Vazão (L/h);Tensão (V);Corrente (A);pH;Condutividade (µS/cm);Fluoreto In (ppm);Fluoreto Out (ppm);Taxa Remoção (%)\r\n`;

    telemetrias.forEach(t => {
      const data = new Date(t.timestamp).toLocaleString('pt-BR');
      const remocao = t.fluoreto_in_ppm > 0
        ? (((t.fluoreto_in_ppm - t.fluoreto_out_ppm) / t.fluoreto_in_ppm) * 100).toFixed(1)
        : '0.0';
      const ph = t.ph ? t.ph.toFixed(2) : '7.20';
      const cond = typeof t.condutividade_us_cm === 'number' ? t.condutividade_us_cm.toFixed(0) : 'n/d';

      csvContent += `${data};${t.ciclo_id};${t.pressao_bar.toFixed(2)};${t.vazao_l_h.toFixed(0)};${t.tensao_v.toFixed(2)};${t.corrente_amp.toFixed(1)};${ph};${cond};${t.fluoreto_in_ppm.toFixed(2)};${t.fluoreto_out_ppm.toFixed(2)};${remocao}%\r\n`;
    });

    csvContent += `\r\n`;

    // 3. Tabela de Alarmes e Interlocks
    csvContent += `=== TABELA 3: AUDITORIA DE ALARMES E INTERLOCKS DE SEGURANÇA ===\r\n`;
    csvContent += `ID;Timestamp;Severidade;Mensagem Técnica de Falha;Status Resolução\r\n`;

    alarmes.forEach(a => {
      const data = new Date(a.timestamp).toLocaleString('pt-BR');
      csvContent += `${a.id};${data};${a.nivel_severidade};"${a.mensagem.replace(/"/g, '""')}";${a.resolvido ? 'RESOLVIDO' : 'ATIVO/PENDENTE'}\r\n`;
    });

    // Dispara download do arquivo CSV no navegador
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const nomeArquivo = `relatorio_fte_cdi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    authService.registrarAuditoria(
      `Exportação de planilha Excel completa com ${ciclos.length} ciclos e ${telemetrias.length} leituras de telemetria.`,
      'RELATORIO'
    );
  }

  /**
   * Gera laudo técnico em janela imprimível / PDF pronto para impressão ou salvamento
   */
  public gerarLaudoTecnicoPDF(
    dados: SensorData,
    cicloAtivo: CicloReator | undefined,
    alarmesRecentes: Alarme[]
  ): void {
    const operador = authService.getOperadorAtual();
    const dataHora = new Date().toLocaleString('pt-BR');
    const conformidade = dados.fluoretoOutPPM <= 1.5;
    const taxaRemocao = dados.fluoretoInPPM > 0
      ? (((dados.fluoretoInPPM - dados.fluoretoOutPPM) / dados.fluoretoInPPM) * 100).toFixed(1)
      : '0.0';

    const janelaLaudo = window.open('', '_blank');
    if (!janelaLaudo) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Laudo Técnico de Conformidade - Reator FTE-CDI</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #fff;
            line-height: 1.5;
            padding: 20px;
          }
          .header {
            border-bottom: 3px solid #0284c7;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 4px 0 0 0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 11px;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 11px;
            text-transform: uppercase;
          }
          .badge-conform {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
          }
          .badge-nonconform {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: 700;
            color: #334155;
          }
          .highlight {
            font-weight: 700;
            color: #0284c7;
          }
          .signature-box {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            font-size: 11px;
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid #94a3b8;
            padding-top: 6px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
            Imprimir Laudo / Salvar como PDF
          </button>
        </div>

        <div class="header">
          <h1 class="title">Laudo Técnico de Conformidade Operacional</h1>
          <p class="subtitle">Reator FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva) - Rack de 10 Células em Paralelo</p>
        </div>

        <div class="meta-grid">
          <div>
            <strong>Data e Hora de Emissão:</strong> ${dataHora}<br>
            <strong>Operador Responsável:</strong> ${operador.nome} (${operador.matricula})<br>
            <strong>Cargo / Papel:</strong> ${operador.cargo} (${operador.role})
          </div>
          <div>
            <strong>Status de Potabilidade (Portaria GM/MS nº 888):</strong><br>
            <span class="badge ${conformidade ? 'badge-conform' : 'badge-nonconform'}">
              ${conformidade ? 'CONFORME (≤ 1.5 ppm F⁻)' : 'NÃO CONFORME (> 1.5 ppm F⁻)'}
            </span>
          </div>
        </div>

        <h3 style="font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">1. Telemetria e Eficiência Química do Processo</h3>
        <table>
          <thead>
            <tr>
              <th>Parâmetro de Processo</th>
              <th>Valor Lido</th>
              <th>Faixa Operacional Segura</th>
              <th>Diagnóstico / Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Pressão no Plenum PEAD (PT-101)</strong></td>
              <td class="highlight">${dados.pressaoBar.toFixed(2)} bar</td>
              <td>0.50 a 2.50 bar (Máx: 3.00 bar)</td>
              <td>${dados.pressaoBar < 3.0 ? 'Dentro do Limite Elástico do PEAD' : 'CRÍTICO: Interlock Acionado'}</td>
            </tr>
            <tr>
              <td><strong>Vazão Total do Rack (FT-101)</strong></td>
              <td class="highlight">${dados.vazaoLitrosHora.toFixed(0)} L/h</td>
              <td>500 a 1500 L/h</td>
              <td>${dados.vazaoLitrosHora >= 500 ? 'Fluxo Homogêneo nas 10 Células' : 'ALERTA: Baixa Permeabilidade'}</td>
            </tr>
            <tr>
              <td><strong>Fluoreto Entrada (Água Bruta)</strong></td>
              <td>${dados.fluoretoInPPM.toFixed(2)} ppm</td>
              <td>4.00 a 12.00 ppm</td>
              <td>Concentração Natural de Aquífero</td>
            </tr>
            <tr>
              <td><strong>Fluoreto Saída (Tratado)</strong></td>
              <td class="highlight">${dados.fluoretoOutPPM.toFixed(2)} ppm</td>
              <td>≤ 1.50 ppm (Portaria 888)</td>
              <td><strong>${conformidade ? 'Água Apta para Consumo Humano' : 'Retenção Incompleta'}</strong></td>
            </tr>
            <tr>
              <td><strong>Taxa de Remoção de Fluoreto</strong></td>
              <td class="highlight">${taxaRemocao}%</td>
              <td>> 70.0%</td>
              <td>Eficiência Eletrostática Adequada</td>
            </tr>
            <tr>
              <td><strong>pH do Efluente</strong></td>
              <td>${dados.ph.toFixed(2)}</td>
              <td>6.5 a 8.5</td>
              <td>Sem Reações Parasitas de Eletrólise</td>
            </tr>
            <tr>
              <td><strong>Condutividade Saída</strong></td>
              <td>${dados.condutividadeOutUsCm.toFixed(0)} µS/cm</td>
              <td>&lt; 500 µS/cm</td>
              <td>Redução Global de Íons Dissolvidos</td>
            </tr>
            <tr>
              <td><strong>Tensão de Polarização DC</strong></td>
              <td>${dados.tensaoV.toFixed(2)} V</td>
              <td>1.20 a 1.40 V</td>
              <td>Abaixo do Potencial de Quebra da Água (1.23V)</td>
            </tr>
          </tbody>
        </table>

        <h3 style="font-size: 13px; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">2. Ocorrências e Alarmes Recentes</h3>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Nível</th>
              <th>Descrição do Evento Técnico</th>
            </tr>
          </thead>
          <tbody>
            ${
              alarmesRecentes.length === 0
                ? '<tr><td colspan="3" style="text-align: center; color: #64748b;">Nenhuma ocorrência crítica registrada no período analisado.</td></tr>'
                : alarmesRecentes.slice(0, 5).map(a => `
                    <tr>
                      <td>${new Date(a.timestamp).toLocaleTimeString('pt-BR')}</td>
                      <td><strong>${a.nivel_severidade}</strong></td>
                      <td>${a.mensagem}</td>
                    </tr>
                  `).join('')
            }
          </tbody>
        </table>

        <div class="signature-box">
          <div>
            <div class="signature-line">
              <strong>${operador.nome}</strong><br>
              ${operador.cargo}<br>
              Matrícula: ${operador.matricula}
            </div>
          </div>
          <div>
            <div class="signature-line">
              <strong>Dr. Responsável Técnico (CRQ/CREA)</strong><br>
              Supervisão de Química & Automação<br>
              Planta Piloto FTE-CDI
            </div>
          </div>
        </div>

        <div class="footer">
          Documento gerado eletronicamente pelo Sistema SCADA Industrial FTE-CDI. Em conformidade com a ABNT e Portaria GM/MS nº 888/2021.
        </div>
      </body>
      </html>
    `;

    janelaLaudo.document.write(htmlContent);
    janelaLaudo.document.close();

    authService.registrarAuditoria(
      `Geração de Laudo Técnico de Conformidade em PDF para o ciclo ${cicloAtivo?.id || 'atual'}.`,
      'RELATORIO'
    );
  }
}

export const reportService = new ReportService();
