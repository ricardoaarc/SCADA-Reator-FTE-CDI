/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

// Configurações Padrão de Homologação / Produção Supabase
const DEFAULT_SUPABASE_URL = 'https://ivurdxdcpwwjcphhszdg.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_6eL3ecq1GxPf9M0iaPI6iw_dBjzHce0';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};

export const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

/**
 * Cliente Singleton do Supabase para o SCADA Industrial
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Testa a conectividade com o banco Supabase na nuvem
 */
export async function testarConexaoSupabase(): Promise<{ ok: boolean; mensagem: string }> {
  try {
    const { data, error } = await supabase.from('celulas_fte_cdi').select('id').limit(1);
    if (error) {
      // Se a tabela ainda não foi criada, testa ping básico do endpoint REST
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: supabaseAnonKey }
      });
      if (res.ok || res.status === 404 || res.status === 401) {
        return { ok: true, mensagem: `Supabase online em ${supabaseUrl}` };
      }
      return { ok: false, mensagem: `Erro de conexão Supabase: ${error.message}` };
    }
    return { ok: true, mensagem: `Conectado com sucesso ao Supabase (${data?.length ?? 0} registros)` };
  } catch (err: any) {
    return { ok: false, mensagem: `Falha de rede ao conectar no Supabase: ${err?.message || String(err)}` };
  }
}
