const mem: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; }
};

const R = '../src/services/';
const { chamarOcr, montarLaudoDeOcr, normalizarFalha, resumoDoLote, OcrError } = await import(R + 'laudoOcr.ts');
const { dbInstance } = await import(R + 'database.ts');

let ok = 0, bad = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? 'PASS ' : 'FAIL ') + n);
  if (c) ok++; else bad++;
};

const resp = (status: number, body: any) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (body === undefined) throw new Error('bad');
    return body;
  }
}) as any;

const cod = async (p: Promise<any>) => {
  try {
    await p;
    return 'OK';
  } catch (e: any) {
    return e.codigo || ('ERR:' + e.message);
  }
};

// chamarOcr
t('HTTP 500 -> SCD-OCR-001', await cod(chamarOcr('x', 'image/png', { fetchFn: resp(500, { sucesso: false, erro: 'falhou' }) })) === 'SCD-OCR-001');
t('corpo não-JSON -> SCD-OCR-001', await cod(chamarOcr('x', 'image/png', { fetchFn: resp(200, undefined) })) === 'SCD-OCR-001');
t('sucesso:false -> falha (não ignora)', await cod(chamarOcr('x', 'image/png', { fetchFn: resp(200, { sucesso: false }) })) === 'SCD-OCR-001');
t('IA sem JSON (422) -> SCD-OCR-003', await cod(chamarOcr('x', 'image/png', { fetchFn: resp(422, { sucesso: false, codigo: 'SCD-OCR-003', erro: 'x' }) })) === 'SCD-OCR-003');
t('rede cai -> SCD-OCR-001', await cod(chamarOcr('x', 'image/png', { fetchFn: (async () => { throw new Error('ECONNRESET'); }) as any })) === 'SCD-OCR-001');

const lento = ((_u: any, o: any) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('abort'))))) as any;
const tm = await (async () => {
  try {
    await chamarOcr('x', 'image/png', { timeoutMs: 30, fetchFn: lento });
  } catch (e: any) {
    return e;
  }
})();
t('timeout -> SCD-OCR-001 com msg de tempo', tm?.codigo === 'SCD-OCR-001' && /Tempo esgotado/.test(tm.message));

const d: any = await chamarOcr('x', 'image/png', { fetchFn: resp(200, { sucesso: true, dados: { a: 1 } }) });
t('sucesso devolve dados', d?.a === 1);

// montarLaudoDeOcr
t('textoBruto (sem dados) -> SCD-OCR-002', await cod((async () => montarLaudoDeOcr({ textoBruto: 'blah' }, 'a.png', 0))()) === 'SCD-OCR-002');

const cheio = montarLaudoDeOcr({
  numeroLaudo: 'L-1',
  laboratorio: 'Lab X',
  dataColeta: '2026-03-10',
  conformidadePortaria888: false,
  parametros: [{ nome: 'Fluoreto' }],
  parametrosChaveFteCdi: { fluoretoMgL: '2,10', ph: 7.9 }
}, 'a.png', 0);

t('completo -> SALVO', cheio.statusSql === 'SALVO' && !cheio.camposAusentes);
t('"2,10" convertido para 2.1', cheio.parametrosChaveFteCdi.fluoretoMgL === 2.1);
t('conformidade false preservada (não vira true)', cheio.conformidadePortaria888 === false);
t('não inventa outros parâmetros (null)', cheio.parametrosChaveFteCdi.stdMgL === null && cheio.parametrosChaveFteCdi.cloretosMgL === null);

const parc = montarLaudoDeOcr({
  parametros: [{ nome: 'pH' }],
  parametrosChaveFteCdi: { ph: 7 }
}, 'laudo 7.pdf', 2);

t('parcial -> PENDENTE_REVISAO', parc.statusSql === 'PENDENTE_REVISAO');
t('conformidade ausente = null (antes: true)', parc.conformidadePortaria888 === null);
t('fluoreto ausente = null (antes: 1.40)', parc.parametrosChaveFteCdi.fluoretoMgL === null);
t('campos ausentes listados', ['numeroLaudo', 'dataColeta', 'fluoretoMgL', 'conformidadePortaria888'].every(c => parc.camposAusentes!.includes(c)));
t('texto ausente = "(não informado)" (antes: CRQ Responsável)', parc.responsavelTecnico === '(não informado)' && parc.laboratorio === '(não informado)');
t('data ausente não vira "hoje"', parc.dataColeta === '');
t('aviso SCD-OCR-002 nas recomendações', parc.recomendacoesOperacionais[0].includes('SCD-OCR-002'));

// banco + série
dbInstance.salvarLaudo({ ...parc, localColeta: 'PocoTeste' });
const salvo = dbInstance.getLaudos().find((l: any) => l.id === parc.id);
t('banco preserva PENDENTE_REVISAO (antes: forçava SALVO)', salvo?.statusSql === 'PENDENTE_REVISAO');
t('pendente fora da série temporal', !dbInstance.getSerieHistoricaPoco('PocoTeste').some((p: any) => p.laudoId === parc.id));

dbInstance.salvarLaudo({ ...cheio, localColeta: 'PocoTeste' });
const serie = dbInstance.getSerieHistoricaPoco('PocoTeste');
t('completo entra na série com conformidade=false', serie.length === 1 && serie[0].conformidadeGeral === false);

// resumo do lote
const f = [
  normalizarFalha('x.png', new OcrError('SCD-OCR-002', 'vazio')),
  normalizarFalha('y.png', new Error('boom'))
];
const r = resumoDoLote(4, 1, 1, f);
t('resumo honesto (falhas e revisão)', /1 salvo/.test(r) && /1 para revisão/.test(r) && /2 com falha/.test(r) && r.includes('x.png [SCD-OCR-002]'));

console.log(`\n${ok} passaram, ${bad} falharam`);
if (bad > 0) process.exit(1);
