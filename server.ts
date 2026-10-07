import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { criarRotasPlc, lerConfigPlc } from './server/plcGateway.ts';
import { criarRotasUsuarios } from './server/usuariosGateway.ts';
import { limitarTaxa, validarEntradaLaudo } from './server/protecao.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// Gateway Modbus TCP (desligado por padrão; ver server/plcGateway.ts e docs/GATEWAY_MODBUS.md).
// Montado ANTES de qualquer parser global: o roteador tem o próprio parser (10 kb); um express.json global
// de 25 MB aqui na frente anularia esse limite.
const plcConfig = lerConfigPlc(process.env);
app.use('/api/plc', criarRotasPlc(plcConfig));
if (plcConfig.habilitado) {
  console.log(`[PLC-GATEWAY] Ligado: ${plcConfig.host}:${plcConfig.porta} (unit ${plcConfig.unitId}); escrita ${plcConfig.permitirEscrita ? 'HABILITADA' : 'desabilitada'}.`);
  if (!plcConfig.token) {
    console.warn('[PLC-GATEWAY] ATENÇÃO: sem PLC_GATEWAY_TOKEN, qualquer um que alcance este servidor pode LER os registradores do CLP. Defina o token e proteja a rede.');
  }
} else {
  console.log(`[PLC-GATEWAY] ${plcConfig.avisos.join(' ')}`);
}

// Conduíte Seguro de Gestão de Usuários (Conformidade IEC 62443 / FDA 21 CFR Part 11)
app.use('/api/scada/usuarios', express.json({ limit: '1mb' }), criarRotasUsuarios());

// O corpo grande (imagem/PDF de laudo) só é aceito no endpoint de IA, com limite de requisições por IP
app.use('/api/gemini', limitarTaxa({ janelaMs: 60_000, max: 20 }), express.json({ limit: '25mb' }));

// Inicialização do cliente GoogleGenAI no backend (só se houver chave: sem ela o endpoint responde 503 claro)
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// Modelo configurável (GEMINI_MODEL). CONFIRME que o nome padrão existe na sua conta; nome inválido faz toda leitura de laudo falhar.
const MODELO_GEMINI = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
if (!ai) console.warn('[GEMINI] GEMINI_API_KEY não definida: a leitura de laudos por IA ficará indisponível (HTTP 503).');

// Endpoint de análise e extração de Laudos Laboratoriais com IA
app.post('/api/gemini/analisar-laudo', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ sucesso: false, erro: 'Leitura de laudos por IA indisponível: GEMINI_API_KEY não configurada no servidor.' });
    }

    const entrada = validarEntradaLaudo(req.body);
    if (!entrada.ok) {
      return res.status(400).json({ sucesso: false, erro: entrada.erro });
    }
    const { textoLaudo, imagemBase64, mimeType } = entrada.entrada;

    const systemInstruction = `
Você é um especialista em Química de Águas, Engenharia Sanitária e Eletrodissolução/Eletroadsorção Capacitiva (FTE-CDI).
Sua função é ler laudos analíticos laboratoriais de água bruta, efluentes e água tratada (ex: normas Portaria GM/MS 888/2021, CONAMA 357/430, Standard Methods SMWW).

Extraia com exatidão máxima todos os dados do laudo fornecido no formato JSON com a seguinte estrutura:
{
  "numeroLaudo": "string",
  "laboratorio": "string",
  "solicitante": "string",
  "matriz": "string (ex: Água Bruta, Efluente, Lodo)",
  "localColeta": "string",
  "dataColeta": "string",
  "dataEmissao": "string",
  "responsavelTecnico": "string",
  "conclusaoGeral": "string com resumo executivo",
  "conformidadePortaria888": boolean,
  "parametros": [
    {
      "nome": "string",
      "resultado": "string ou número",
      "unidade": "string (ex: mg/L, µg/L, UFC/100mL, NTU, U pH)",
      "vmp": "string (Valor Máximo Permitido segundo norma)",
      "metodologia": "string (ex: EPA 300.1, SMWW 4500)",
      "emConformidade": boolean,
      "impactoFteCdi": "string explicando o impacto eletroquímico ou operacional no reator CDI"
    }
  ],
  "parametrosChaveFteCdi": {
    "fluoretoMgL": number | null,
    "ph": number | null,
    "condutividadeUsCm": number | null,
    "stdMgL": number | null,
    "cloretosMgL": number | null,
    "sulfatosMgL": number | null,
    "nitratosMgL": number | null,
    "ferroMgL": number | null,
    "durezaMgL": number | null,
    "coliformesUfc100ml": number | null,
    "dboMgL": number | null
  },
  "recomendacoesOperacionais": [
    "string com diretrizes para ajuste de tensão, vazão, retrolavagem e regeneração no reator CDI"
  ]
}
`;

    const parts: any[] = [];
    if (imagemBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: imagemBase64.replace(/^data:image\/[a-z]+;base64,/, '').replace(/^data:application\/pdf;base64,/, '')
        }
      });
    }
    if (textoLaudo) {
      parts.push({ text: `Analise o seguinte laudo de laboratório:\n\n${textoLaudo}` });
    } else {
      parts.push({ text: 'Analise o laudo laboratorial contido na imagem/documento anexado.' });
    }

    const response = await ai.models.generateContent({
      model: MODELO_GEMINI,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const resultadoTexto = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(resultadoTexto);
    } catch {
      console.error('[SCD-OCR-003] Resposta da IA não é JSON válido.');
      return res.status(422).json({
        sucesso: false,
        codigo: 'SCD-OCR-003',
        erro: 'A IA não retornou um JSON válido para este laudo. Reenvie o arquivo ou revise manualmente.'
      });
    }

    res.json({ sucesso: true, dados: parsedData });
  } catch (error: any) {
    // Detalhes só no log do servidor: a mensagem do provedor não vai para o navegador
    console.error('Erro na análise de laudo com Gemini:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao processar o laudo com a IA. Tente novamente; se persistir, avise o suporte.'
    });
  }
});

// Inicialização com suporte a Vite Middleware em desenvolvimento ou estático em produção
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[SCADA FTE-CDI] Servidor operacional na porta ${PORT}`);
  });
}

startServer();
