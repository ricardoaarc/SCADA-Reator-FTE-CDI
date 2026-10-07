/**
 * Gera docs/CODIGOS_DE_ERRO.md a partir de src/services/errorCatalog.ts.
 * Uso: npx tsx scripts/gerar-doc-erros.mts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { CATALOGO_ERROS } from '../src/services/errorCatalog.ts';

const ordem = { CRITICO: 0, ALTO: 1, MEDIO: 2, BAIXO: 3 } as const;
const linhas = Object.entries(CATALOGO_ERROS).sort(
  ([a, x], [b, y]) => ordem[x.gravidade] - ordem[y.gravidade] || a.localeCompare(b)
);
const cel = (t: string) => t.replace(/\|/g, '\\|');

let md = `# Códigos de erro do SCADA\n\n`;
md += `> Arquivo gerado de \`src/services/errorCatalog.ts\`. Não edite à mão: altere o catálogo e rode \`npx tsx scripts/gerar-doc-erros.mts\`.\n\n`;
md += `Formato \`SCD-<ÁREA>-<NNN>\`: SEN sensor, SAF segurança, CTL controle, PLC comunicação CLP, NOT notificação, OCR laudos, DAT dados salvos, AUT autorização.\n\n`;
md += `| Código | Gravidade | Título | Repetível | Ação do operador | Origem | Em uso |\n|---|---|---|---|---|---|---|\n`;
for (const [cod, d] of linhas) {
  md += `| \`${cod}\` | ${d.gravidade} | ${cel(d.titulo)} | ${d.repetivel ? 'Sim' : 'Não'} | ${cel(d.acaoOperador)} | ${cel(d.origem)} | ${d.emUso ? 'Sim' : 'Planejado'} |\n`;
}
md += `\n## Detalhes\n`;
for (const [cod, d] of linhas) {
  md += `\n### ${cod}: ${d.titulo}\n\n- **Causa:** ${d.descricao}\n- **Mensagem ao usuário:** ${d.mensagemUsuario}\n`;
}
mkdirSync('docs', { recursive: true });
writeFileSync('docs/CODIGOS_DE_ERRO.md', md);
console.log(`docs/CODIGOS_DE_ERRO.md gerado (${linhas.length} códigos)`);
