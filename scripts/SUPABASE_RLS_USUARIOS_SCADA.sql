-- ==============================================================================
-- SCRIPT SQL: POLÍTICAS DE ROW LEVEL SECURITY (RLS) PARA USUÁRIOS SCADA
-- Sistema: Supervisório Industrial SCADA Reator FTE-CDI (PurifyWave)
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Garantir que a tabela usuarios_scada existe e possui RLS ativo
ALTER TABLE IF EXISTS public.usuarios_scada ENABLE ROW LEVEL SECURITY;

-- 2. Política de LEITURA (SELECT): Permite consulta de crachás e operadores
DROP POLICY IF EXISTS "Permitir leitura usuarios_scada" ON public.usuarios_scada;
CREATE POLICY "Permitir leitura usuarios_scada"
  ON public.usuarios_scada
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Política de INSERÇÃO (INSERT): Permite cadastro de novos operadores
DROP POLICY IF EXISTS "Permitir insercao usuarios_scada" ON public.usuarios_scada;
CREATE POLICY "Permitir insercao usuarios_scada"
  ON public.usuarios_scada
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Política de ATUALIZAÇÃO (UPDATE): Permite edição de perfis, zonas e PINs
DROP POLICY IF EXISTS "Permitir atualizacao usuarios_scada" ON public.usuarios_scada;
CREATE POLICY "Permitir atualizacao usuarios_scada"
  ON public.usuarios_scada
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Política de EXCLUSÃO (DELETE): Permite exclusão/inativação de operadores
DROP POLICY IF EXISTS "Permitir exclusao usuarios_scada" ON public.usuarios_scada;
CREATE POLICY "Permitir exclusao usuarios_scada"
  ON public.usuarios_scada
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- Confirmação: Verificar políticas ativas
-- ==============================================================================
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'usuarios_scada';
