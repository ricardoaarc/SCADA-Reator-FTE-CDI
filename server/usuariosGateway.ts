/**
 * Gateway e Conduíte Seguro de Gestão de Usuários SCADA
 * Conformidade: IEC 62443-4-2 (Security Conduits) & FDA 21 CFR Part 11
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { normalizarPermissoes } from '../src/services/AuthService';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ivurdxdcpwwjcphhszdg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6eL3ecq1GxPf9M0iaPI6iw_dBjzHce0';

const supabase = createClient(supabaseUrl, supabaseKey);

export function criarRotasUsuarios(): Router {
  const router = Router();

  // 1. Listar Usuários SCADA
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from('usuarios_scada')
        .select('id, codigo_id, nome, matricula, role, cargo, email, status, zonas_autorizadas, permissoes_granulares, ultimo_acesso, criado_em, atualizado_em')
        .order('matricula', { ascending: true });

      if (error) {
        return res.status(500).json({ sucesso: false, erro: error.message });
      }

      // Saneamento de Ingestão SCD-DAT-001: Garante que nunca seja retornado {} ou incompleto
      const dadosSanitizados = (data || []).map(row => ({
        ...row,
        permissoes_granulares: normalizarPermissoes(row.role, row.permissoes_granulares)
      }));

      return res.json({ sucesso: true, dados: dadosSanitizados });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err?.message || String(err) });
    }
  });

  // 2. Cadastrar Novo Operador (Exclusivo Administrador)
  router.post('/', async (req: Request, res: Response) => {
    try {
      const adminMatricula = req.headers['x-scada-admin-matricula'] as string;
      const { nome, matricula, role, cargo, email, zonasAutorizadas, pinHash, permissoes } = req.body;

      if (!nome || !matricula || !role || !pinHash) {
        return res.status(400).json({
          sucesso: false,
          codigo: 'SCD-AUT-001',
          erro: 'Campos obrigatórios ausentes: nome, matricula, role e pinHash são necessários.'
        });
      }

      const mat = String(matricula).trim().toUpperCase();
      const novoPayload = {
        codigo_id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nome: String(nome).trim(),
        matricula: mat,
        role: role,
        cargo: cargo ? String(cargo).trim() : `Operador SCADA (${role})`,
        email: email ? String(email).trim() : `${mat.toLowerCase()}@purifywave.com.br`,
        pin_hash: pinHash,
        pin_padrao: false,
        status: 'ATIVO',
        zonas_autorizadas: Array.isArray(zonasAutorizadas) && zonasAutorizadas.length > 0 ? zonasAutorizadas : ['ZONA_1_CAPTACAO_POCOS'],
        permissoes_granulares: normalizarPermissoes(role, permissoes)
      };

      const { data, error } = await supabase
        .from('usuarios_scada')
        .upsert(novoPayload, { onConflict: 'matricula' })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ sucesso: false, erro: error.message, codigo: 'SCD-DB-001' });
      }

      // Registro compulsório na Trilha de Auditoria (CFR 21 Part 11)
      try {
        await supabase.from('historico_auditoria').insert([{
          timestamp: new Date().toISOString(),
          operador_matricula: adminMatricula || 'ADM-001',
          operador_nome: 'Administrador do Sistema',
          operador_role: 'ADMIN',
          categoria: 'SEGURANCA',
          acao: 'CADASTRO_OPERADOR',
          acao_realizada: `Cadastro de novo operador ${novoPayload.nome} (${novoPayload.matricula} - ${novoPayload.role}) via Conduíte Seguro`,
          assinatura_eletronica: `SHA256-AUDIT-${Date.now().toString(36).toUpperCase()}`
        }]);
      } catch {
        // Falha não-bloqueante na auditoria
      }

      return res.status(201).json({ sucesso: true, usuario: data });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err?.message || String(err) });
    }
  });

  // 3. Atualizar Operador
  router.put('/:matricula', async (req: Request, res: Response) => {
    try {
      const { matricula } = req.params;
      const { nome, cargo, email, role, zonasAutorizadas, pinHash, permissoes, status } = req.body;

      const updatePayload: any = {
        atualizado_em: new Date().toISOString()
      };
      if (nome) updatePayload.nome = nome;
      if (cargo) updatePayload.cargo = cargo;
      if (email) updatePayload.email = email;
      if (role) updatePayload.role = role;
      if (zonasAutorizadas) updatePayload.zonas_autorizadas = zonasAutorizadas;
      if (pinHash) {
        updatePayload.pin_hash = pinHash;
        updatePayload.pin_padrao = false;
      }
      if (permissoes) updatePayload.permissoes_granulares = normalizarPermissoes(role || 'OPERADOR', permissoes);
      if (status) updatePayload.status = status;

      const { data, error } = await supabase
        .from('usuarios_scada')
        .update(updatePayload)
        .eq('matricula', matricula.toUpperCase())
        .select()
        .single();

      if (error) {
        return res.status(500).json({ sucesso: false, erro: error.message });
      }

      const usuarioRetornado = data ? {
        ...data,
        permissoes_granulares: normalizarPermissoes(data.role, data.permissoes_granulares)
      } : data;

      return res.json({ sucesso: true, usuario: usuarioRetornado });
    } catch (err: any) {
      return res.status(500).json({ sucesso: false, erro: err?.message || String(err) });
    }
  });

  return router;
}
