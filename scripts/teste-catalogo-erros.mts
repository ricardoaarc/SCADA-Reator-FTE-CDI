import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const { CATALOGO_ERROS, ScadaError, comCodigo } = await import('../src/services/errorCatalog.ts');

let ok = 0, bad = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? 'PASS ' : 'FAIL ') + n);
  if (c) ok++; else bad++;
};

const walk = (d: string): string[] =>
  readdirSync(d).flatMap(f => {
    const p = path.join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : [];
  });

const arquivos = [...walk(path.join(rootDir, 'src')), path.join(rootDir, 'server.ts')].filter(p => !p.endsWith('errorCatalog.ts'));
const fonte = arquivos.map(p => readFileSync(p, 'utf8')).join('\n');
const usados = new Set([...fonte.matchAll(/SCD-[A-Z]{2,3}-\d{3}/g)].map(m => m[0]));
const cat = Object.keys(CATALOGO_ERROS);

t('todo código usado no código existe no catálogo', [...usados].every(c => cat.includes(c)));
console.log('   usados:', [...usados].sort().join(', '));

t('formato SCD-ÁREA-NNN válido', cat.every(c => /^SCD-[A-Z]{2,3}-\d{3}$/.test(c)));
t('todas as entradas têm ação, origem e mensagem ao usuário', cat.every(c => {
  const d = (CATALOGO_ERROS as any)[c];
  return d.acaoOperador && d.origem && d.mensagemUsuario && d.titulo;
}));

const e = new ScadaError('SCD-AUT-001', 'sem permissão');
t('ScadaError mantém código e mensagem', e.codigo === 'SCD-AUT-001' && e.message === 'sem permissão' && e instanceof Error);
t('ScadaError sem texto usa mensagem do catálogo', new ScadaError('SCD-SEN-001').message === (CATALOGO_ERROS as any)['SCD-SEN-001'].mensagemUsuario);
t('comCodigo', comCodigo('SCD-SAF-001', 'x') === '[SCD-SAF-001] x');

// AUT-001 lançado de verdade
const { plcService } = await import('../src/services/PlcService.ts');
const { authService } = await import('../src/services/AuthService.ts');

authService.encerrarSessao(); // Garante perfil básico (OPERADOR)
let capturado: any = null;
try {
  plcService.setModoFonteDados('CLP_REAL');
} catch (x) {
  capturado = x;
}
t('PlcService lança ScadaError SCD-AUT-001 sem permissão', capturado instanceof ScadaError && capturado.codigo === 'SCD-AUT-001');

console.log(`\n${ok} passaram, ${bad} falharam`);
process.exit(bad > 0 ? 1 : 0);
