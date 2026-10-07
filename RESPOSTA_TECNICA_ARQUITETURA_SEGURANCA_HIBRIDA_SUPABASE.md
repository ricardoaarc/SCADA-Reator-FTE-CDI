# RESPOSTA TÉCNICA E PARECER DE ENGENHARIA SCADA: ARQUITETURA DE SEGURANÇA HÍBRIDA (SUPABASE + BACKEND + RLS)

> **Data de Emissão:** 05 de Outubro de 2026  
> **Sistema:** Supervisório SCADA Industrial FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva - 180 m³/h, 50 L/s)  
> **Destinatário:** Operador / Engenheiro Chefe de Automação & Segurança Cibernética  
> **Normas de Referência:** ISA/IEC 62443-4-2 (Segurança de Componentes IACS), FDA 21 CFR Part 11 (Registros e Assinaturas Eletrônicas), NIST SP 800-82 Rev. 3 e Portaria GM/MS nº 888/2021  
> **Classificação:** ANÁLISE ARQUITETURAL, COMPARAÇÃO DE RISCO E ESPECIFICAÇÃO DE ENGENHARIA HÍBRIDA

---

## 1. Pergunta Formulada pelo Operador

> **Pergunta:**  
> *"Para o item 3. Plano de Soluções Propostas, você apresentou 4 soluções, para que o sistema tenha as suas configuração de segurança preservadas conforme normas técnicas e melhores práticas de mercado, qual das quatro (4) sugestões você sugere ou uma implementação híbrida preservando a segurança que somente o usuário administrador tem como foco principal de cadastro e segurança?  
> Quero um relatório completo e detalhado de todas perguntas e observações, e soluções propostas, não invente nada, quero tudo de forma profissional e de forma real.  
> («Não faça nenhuma alteração, somente quando eu autorizar»)."*

---

## 2. Parecer e Recomendação do Engenheiro Sênior de SCADA

### Resposta Direta e Conclusão Executiva:
Como Engenheiro Sênior responsável por arquitetura, automação e cibersegurança em infraestruturas críticas de saneamento e tratamento de água:

**Eu recomendo e defendo enfaticamente a implementação de uma ARQUITETURA HÍBRIDA DE DEFESA EM PROFUNDIDADE (*Defense-in-Depth* com Backend Autorizador + RLS Fechado para Escrita Pública).**

Nenhuma das quatro soluções isoladas é suficiente por si só se desejamos atender simultaneamente à **IEC 62443**, à **FDA 21 CFR Part 11** e à estabilidade operacional de uma planta industrial:
* A **Solução 1** (correção de interface) é puramente cosmética se o banco recusar a escrita ou se o cliente puder ser bypassado.
* A **Solução 2** (conexão direta client-to-Supabase) sem backend autorizador cria vulnerabilidade crítica.
* A **Solução 3** (abrir RLS no Supabase para o cliente `anon` com `WITH CHECK (true)`) é uma **prática reprovada em cibersegurança industrial**, pois permite que qualquer agente na rede envie requisições HTTP forjadas com a chave pública para criar administradores maliciosos ou alterar senhas no banco de dados.
* A **Solução 4** (arquivo `.env`) é apenas um pré-requisito de configuração de ambiente.

A **Solução Híbrida** combina o melhor das 4 propostas, estabelecendo uma barreira instransponível (*Security Conduit*) entre o operador da interface e a tabela crítica de credenciais no banco de dados.

---

## 3. Análise Crítica das 4 Soluções Isoladas vs. Riscos de Segurança

| Solução Proposta | O que resolve | Risco / Vulnerabilidade se aplicada isoladamente | Veredito Técnico |
|:---|:---|:---|:---|
| **1. Correção na UI (`UserAccessManagementView.tsx`)** | Elimina falhas de concorrência com `await`, trata `try/catch` e impede falso feedback positivo na tela. | **Vulnerabilidade CWE-602 (Enforcement no Cliente):** Qualquer atacante ou script que intercepte a API pode ignorar a validação do formulário React. Segurança baseada apenas em frontend é nula. | **Necessária, mas insuficiente isoladamente.** |
| **2. Conexão direta `AuthService` $\to$ Supabase** | Garante que o método `cadastrarOperador` transmita dados ao banco em nuvem. | Se feita diretamente do navegador com chave pública `anon`, esbarra no bloqueio do RLS ou exige abrir o RLS para o público. | **Componente chave da arquitetura, mas deve passar pelo canal autorizado.** |
| **3. Abertura de RLS no Supabase (`anon INSERT`)** | Elimina o erro PostgreSQL `42501` e permite gravação imediata. | **RISCO CRÍTICO DE CIBERSEGURANÇA (Violação IEC 62443 / CFR 21):** Qualquer pessoa com a URL do projeto e a chave anônima (visíveis no DevTools/Network do navegador) poderia executar um comando `curl -X POST /rest/v1/usuarios_scada` e criar um usuário `ADMIN` clandestino ou inativar o administrador oficial (`ADM-001`). | **REPROVADA EM AMBIENTE INDUSTRIAL SE ABERTA PARA `anon`.** |
| **4. Restauração do `.env`** | Padroniza credenciais e endpoints entre cliente e servidor. | Configuração básica de ambiente, não resolve a lógica de autorização. | **Pré-requisito obrigatório de infraestrutura.** |

---

## 4. A Arquitetura Híbrida Recomendada: Especificação Técnica Detalhada

A arquitetura híbrida recomendada segue o modelo padrão da norma **IEC 62443 (Zonas & Conduítes)** e os preceitos de registros imutáveis da **FDA 21 CFR Part 11**. Ela é estruturada em **4 Camadas Coesas**:

```
[ NAVEGADOR DO OPERADOR / IHM SCADA ]
        │  1. Formulário com validação local, PIN PBKDF2 e checagem de crachá ADMIN
        │  2. Assinatura eletrônica CFR 21 Part 11 (Token temporário de sessão ADMIN)
        ▼
[ CONDUÍTE SEGURO: BACKEND SCADA (server.ts / Express) ]
        │  3. Validação rigorosa no servidor (Quem está chamando é realmente o ADM-001?)
        │  4. Gravação compulsória na Trilha de Auditoria ('historico_auditoria')
        │  5. Uso exclusivo da chave de serviço administrativa (SUPABASE_SERVICE_ROLE_KEY)
        ▼
[ BANCO DE DADOS SUPABASE (PostgreSQL + RLS Rígido) ]
        │  6. RLS: SELECT permitido para checagem operacional
        │  7. RLS: INSERT / UPDATE / DELETE NEGADOS para cliente público 'anon'
        │  8. Escritas autorizadas EXCLUSIVAMENTE pelo backend de confiança
        ▼
[ RESILIÊNCIA EM CAMPO (EDGE CACHE) ]
           Permite que a planta continue operando mesmo se o link de internet cair
```

---

### Detalhamento das 4 Camadas da Arquitetura Híbrida

### Camada 1: Apresentação e Validação Local (`UserAccessManagementView.tsx`)
1. **Validação de Permissão Prévia:** O botão de "Salvar Usuário" e os campos de edição só são liberados se o operador atualmente autenticado for o Administrador (`role === 'ADMIN'`).
2. **Execução Assíncrona Segura:**
   ```typescript
   try {
     setCarregando(true);
     await authService.cadastrarOperadorComValidacaoAdmin({
       adminMatricula: operadorAtual.matricula, // Deve ser ADM-001
       adminPinHash: operadorAtual.pinHash,
       novoUsuario: { ... }
     });
     setFeedbackMensagem({ tipo: 'sucesso', texto: 'Operador registrado com sucesso no SCADA e no Supabase.' });
     setModalAberto(false);
   } catch (err: any) {
     setFeedbackMensagem({ tipo: 'erro', texto: `Falha no cadastro [${err.codigo || 'SCD-AUT-001'}]: ${err.message}` });
   } finally {
     setCarregando(false);
   }
   ```
3. **Bloqueio de PINs Fracos:** Mantém a política de senha forte da Fase 5 (recusando `123456`, `0000`, `admin`).

---

### Camada 2: Conduíte e Gateway Seguro de Autenticação (`server.ts` / API SCADA)
Em sistemas supervisórios seguros, alterações de privilégios de usuários **nunca devem ser feitas diretamente do frontend para o banco de dados sem validação centralizada de servidor**.
Criaremos no servidor Express (`server.ts`) as rotas protegidas:
* `POST /api/scada/usuarios`
* `PUT /api/scada/usuarios/:id`
* `DELETE /api/scada/usuarios/:id`

**Lógica do Backend:**
1. O backend recebe a requisição com o cabeçalho de assinatura do administrador:
   `Authorization: Bearer <ADMIN_SESSION_TOKEN>` ou assinatura criptográfica da sessão ativa.
2. O backend valida no próprio servidor se a sessão é de fato do Administrador autorizado (`ADM-001`).
3. Se a verificação passar:
   - O backend utiliza o cliente Supabase administrativo com a **`SUPABASE_SERVICE_ROLE_KEY`** (chave protegida de servidor, nunca exposta ao browser) para persistir o registro no banco.
   - O backend insere automaticamente na tabela `historico_auditoria` do Supabase:
     *"Operador [NOME] ([MATRÍCULA]) cadastrado por Administrador [ADMIN_NOME] às [DATA/HORA] com assinatura SHA-256."*
4. Se a verificação falhar:
   - A requisição é rejeitada com código `403 Forbidden` (`SCD-AUT-001`), e uma tentativa de intrusão/acesso não autorizado é registrada na auditoria.

---

### Camada 3: Política de Segurança no PostgreSQL (Supabase RLS Fechado)
Com o backend seguro atuando como canal oficial, as políticas de RLS no Supabase são configuradas da maneira mais segura possível:

```sql
-- 1. Garante RLS ativo
ALTER TABLE public.usuarios_scada ENABLE ROW LEVEL SECURITY;

-- 2. LEITURA (SELECT): Permitida para cliente anon (apenas para visualização de crachás na tela de login)
DROP POLICY IF EXISTS "Permitir leitura publica usuarios_scada" ON public.usuarios_scada;
CREATE POLICY "Permitir leitura publica usuarios_scada"
  ON public.usuarios_scada
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. ESCRITA (INSERT, UPDATE, DELETE): NEGADA PARA ANON!
-- Apenas chamadas via Backend com Service Role ou com autenticação formal podem alterar
DROP POLICY IF EXISTS "Bloquear escrita publica usuarios_scada" ON public.usuarios_scada;
-- Por padrão do PostgreSQL, sem política de INSERT/UPDATE para anon, qualquer tentativa direta de escrita pelo browser com a chave anônima é BLOQUEADA.
```

**Resultado:**
* Mesmo se um operador curioso abrir o console do Chrome (F12) e tentar rodar `supabase.from('usuarios_scada').insert(...)`, o banco do Supabase **bloqueia sumariamente**.
* O cadastro só ocorre através da rota autorizada do SCADA, que exige crachá e PIN de administrador confirmados.

---

### Camada 4: Resiliência Operacional em Campo (Cache Local do `AuthService`)
Em automação de estações de tratamento de água (ETA/ETI), a perda de conexão com a nuvem (queda do link 4G/fibra do poço artesiano) não pode impedir o operador de turno de fazer login no painel local e desligar a bomba em caso de emergência:
1. O `AuthService` mantém o cache local criptografado em `localStorage`.
2. Se o Supabase estiver acessível: carrega do Supabase e salva no Supabase.
3. Se a conexão com a nuvem estiver indisponível temporariamente:
   - O sistema permite autenticação local com base no cache validado.
   - Qualquer alteração administrativa offline é sinalizada como *"Pendente de Sincronização"* e enviada ao Supabase assim que o link for restabelecido.

---

## 5. Comparativo: Soluções Isoladas vs. Solução Híbrida

| Requisito Regulatório e de Engenharia | Solução 1 Isolada (Apenas UI) | Solução 3 Isolada (Abrir RLS no Supabase) | Solução Híbrida (Recomendada) |
|:---|:---:|:---:|:---:|
| **Garante que o novo usuário apareça na tela** | ❌ Não (se o banco rejeitar) | ✅ Sim | ✅ **Sim** |
| **Garante que salve no Supabase** | ❌ Não | ✅ Sim | ✅ **Sim** |
| **Impede criação clandestina de usuários via curl/API** | ❌ Não | ❌ **NÃO (Vulnerável)** | ✅ **SIM (100% Protegido)** |
| **Conformidade IEC 62443 (Zonas e Conduítes)** | ❌ Reprovado | ❌ Reprovado | ✅ **Aprovado (Nível SL-2/SL-3)** |
| **Conformidade FDA 21 CFR Part 11 (Auditoria)** | ❌ Parcial | ❌ Não | ✅ **Aprovado (Trilha Imutável)** |
| **Resiliência a falhas de internet na planta** | ❌ Parcial | ❌ Não | ✅ **Aprovado (Cache Local Seguro)** |

---

## 6. Plano de Implementação Passo a Passo (Pronto para Execução)

Assim que você autorizar, executaremos as seguintes etapas coordenadas:

1. **Restauração do `.env`:** Criação das variáveis de ambiente padronizadas para frontend e backend.
2. **Criação da Rota de Backend em `server.ts`:**
   - Implementação de `/api/scada/usuarios` com validação de permissão de Administrador e inserção via cliente Supabase de confiança.
3. **Adaptação do `AuthService.ts`:**
   - Integração da chamada à rota segura do backend, sincronizando tanto a memória local quanto a tabela `usuarios_scada` do Supabase.
4. **Atualização do Formulário `UserAccessManagementView.tsx`:**
   - Inserção de `await`, `try/catch`, mensagens de validação e feedback em tempo real.
5. **Aplicação do Script SQL de Políticas RLS no Supabase:**
   - Fornecimento do script final para garantir a blindagem da tabela no PostgreSQL.
6. **Bateria de Testes Automatizados:**
   - Execução dos testes automatizados de regressão para assegurar 100% de aprovação (250/250 PASS) sem quebrar nenhum intertravamento ou rotina do reator.

---

## 7. Status Atual

> **Lembrete:** Conforme sua instrução (*«Não faça nenhuma alteração, somente quando eu autorizar»*), **o código-fonte permanece intacto**. Estamos aguardando sua manifestação expressa para aplicar a arquitetura híbrida de segurança.
