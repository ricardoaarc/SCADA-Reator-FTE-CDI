# PLANO TÉCNICO DE IMPLEMENTAÇÃO POR FASES DE PRIORIDADE: SCADA PURIFYWAVE / FTE-CDI & SUPABASE

> **Documento:** Plano Diretor de Implementação e Engenharia de Software SCADA  
> **Data:** 05 de Outubro de 2026  
> **Sistema:** Supervisório SCADA Industrial FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva - 180 m³/h, 50 L/s)  
> **Normas de Referência:** ISA/IEC 62443-4-2, FDA 21 CFR Part 11, Portaria GM/MS nº 888/2021, ISA-101 e ISA-18.2  
> **Status:** PLANEJAMENTO DETALHADO CONCLUÍDO (AGUARDANDO VALIDAÇÃO E AUTORIZAÇÃO DO OPERADOR POR FASE)

---

## 1. Sumário Executivo do Planejamento

A pedido do Operador / Engenheiro Chefe de Automação, estruturamos um **Plano de Implementação Escalonado por Ordem de Prioridade e Gravidade Técnica**, dividido em **Quatro (4) Fases Lógicas**.

Este planejamento permite que a equipe de engenharia analise, valide e libere formalmente a execução fase a fase, garantindo **risco zero de regressão**, integridade ininterrupta do reator FTE-CDI e conformidade estrita com normas de automação industrial e saneamento.

---

## 2. Matriz de Priorização das Fases

```
[ FASE 1: PRIORIDADE CRÍTICA ] ──► Saneamento do Erro de Integridade SCD-DAT-001 (Banner Img 1)
           │
[ FASE 2: PRIORIDADE ALTA ]    ──► Tela de Login e Solicitação de Cadastro Suave (Mockup Img 2)
           │
[ FASE 3: PRIORIDADE MÉDIA ]   ──► Ambientes de Trabalho por Credencial (Workspaces RBAC)
           │
[ FASE 4: PRIORIDADE ESTRATÉGICA]► Expansão da Arquitetura RTU com DNP3 / MQTT (Modelo Img 3)
```

---

## 3. Detalhamento Técnico das Fases de Implementação

---

### FASE 1 (Prioridade Crítica / Imediata): Saneamento Definitivo do Erro de Integridade `SCD-DAT-001` (Imagem 1)

#### 1. Objetivo Técnico:
Eliminar o banner superior de advertência que aparece acima do Sinóptico Híbrido (`DADOS SALVOS COM PROBLEMA (1) [SCD-DAT-001]`), garantindo que qualquer registro de usuário lido do Supabase seja carregado com integridade total, sem descartes indevidos.

#### 2. Causa Raiz Identificada:
O validador de integridade local (`esquemaOperador` em `src/services/esquemasDados.ts`) exige de forma estrita que o campo interno `permissoes.canViewSynoptic` seja booleano (`true` ou `false`). Registros legados ou recém-inseridos na tabela `usuarios_scada` do Supabase possuem `permissoes_granulares` que não continham a chave `canViewSynoptic`. Ao sincronizar, o validador descartou esses 3 registros em modo defensivo (*fail-safe*) e emitiu o alerta `SCD-DAT-001`.

#### 3. Atividades de Engenharia:
1. **Flexibilização Segura do Esquema (`src/services/esquemasDados.ts`):**  
   Tornar as chaves de permissões opcionais (`canViewSynoptic: esq.opcional(bool)`, etc.), permitindo que registros com formatos parciais sejam validados sem falha.
2. **Normalização na Sincronização (`src/services/AuthService.ts`):**  
   No método `sincronizarUsuariosComSupabase()`, garantir a mesclagem automática com `PERMISSOES_PADRAO[role]`:
   ```typescript
   permissoes: { ...PERMISSOES_PADRAO[roleVal], ...(row.permissoes_granulares || {}) }
   ```
   Dessa forma, todo usuário terá sempre `canViewSynoptic: true` e todas as demais permissões preenchidas.
3. **Limpeza do Estado Transitório no Navegador:**  
   Acionar a rotina de descarte de problemas pendentes (`storageSeguro.dispensarProblema`), restaurando a visualização limpa do sinóptico.

#### 4. Entregáveis da Fase 1:
* Arquivos ajustados: `src/services/esquemasDados.ts` e `src/services/AuthService.ts`.
* Banner `DADOS SALVOS COM PROBLEMA` removido da interface.
* 100% dos usuários do Supabase carregados na lista sem descarte.
* Execução e aprovação da suíte de testes de dados salvos (`teste-dados-salvos.mts`).

---

### FASE 2 (Prioridade Alta / Segurança de Acesso): Tela de Login e Solicitação de Cadastro (Imagem 2)

#### 1. Objetivo Técnico:
Implementar a porta de entrada oficial do SCADA conforme o design moderno da **Imagem 2** (*Split-View Card* suave com ciano/verde-água e branco), integrando autenticação direta e fluxo de solicitação de cadastro com aprovação pelo Administrador no Supabase.

#### 2. Arquitetura Funcional (Conforme Imagem 2):
* **Painel Esquerdo (Teal Gradient `#00bfa5` $\to$ `#00897b`):**
  - Título: *"Bem - vindo de volta"*
  - Subtítulo: *"Acesse sua conta agora"*
  - Botão de comutação: *"ENTRAR"* (com transição animada para a tela de login).
* **Painel Direito (Card Branco Limpo):**
  - Título: *"SOLICITAR CADASTRO"*
  - Campo 1: Ícone de usuário + Campo de texto *"NOME"*
  - Campo 2: Ícone de envelope + Campo de texto *"E-MAIL"*
  - Campo 3: Ícone de cadeado + Campo de senha *"SENHA / PIN"*
  - Botão de submissão: *"ENVIAR"* (arredondado, ciano vibrante).
* **Painel Alternativo de Login (Inversão Suave):**
  - Formulário para digitar Matrícula / E-mail e Senha / PIN para entrar no supervisório.

#### 3. Atividades de Engenharia:
1. **Componente de Apresentação (`src/components/LoginAuthModal.tsx`):**  
   Desenvolver o componente fiel à Imagem 2, com transição CSS/Tailwind suave entre os modos *Login* e *Solicitar Cadastro*.
2. **Fluxo de Solicitação com Segurança Industrial (IEC 62443 / CFR 21):**  
   - Ao clicar em *"ENVIAR"*, a solicitação é gravada no Supabase na tabela `usuarios_scada` com status `'PENDENTE_APROVACAO'` e hash de senha PBKDF2-SHA256.
   - O solicitante recebe a mensagem: *"Solicitação enviada com sucesso! Aguarde a liberação do seu crachá e zonas pelo Administrador do sistema."*
3. **Painel de Triagem e Aprovação do Administrador:**  
   - Na tela de Gestão de Acessos (`UserAccessManagementView.tsx`), criar uma aba destacada **"Solicitações Pendentes"**.
   - O Administrador (`Ricardo Arcanjo - ADM-001`) visualiza o pedido, define a Matrícula (ex: `OP-105`), a Função (`OPERADOR`, `SUPERVISOR`, `ENGENHEIRO`), as Zonas Autorizadas e clica em **"Aprovar Acesso"**.
4. **Login e Abertura de Sessão:**  
   - Usuários com status `'ATIVO'` realizam login, o sistema gera o registro de auditoria CFR 21 Part 11 e abre a IHM no perfil correto.

#### 4. Entregáveis da Fase 2:
* Novo componente: `src/components/LoginAuthModal.tsx`.
* Aba "Solicitações Pendentes" em `UserAccessManagementView.tsx`.
* Teste automatizado de ponta a ponta para o fluxo de solicitação, aprovação e login.

---

### FASE 3 (Prioridade Média-Alta / Ergonomia Operacional): Ambientes de Trabalho por Credencial (*Role-Based Workspaces*)

#### 1. Objetivo Técnico:
Transformar a experiência operacional do SCADA em **Workspaces Dinâmicos Adaptativos** baseados nos 4 componentes mínimos da automação (Toolbar, Árvore do Projeto, Área de Trabalho e Painel de Guias), reduzindo erros operacionais e carga cognitiva.

#### 2. Matriz de Personalização dos 4 Componentes por Perfil:

| Componente | OPERADOR (`OP-104`) | SUPERVISOR (`SUP-202`) | ENGENHEIRO (`ENG-882`) | ADMINISTRADOR (`ADM-001`) |
|:---|:---|:---|:---|:---|
| **1. Toolbar** | Apenas botões operacionais (Bombas, Válvulas, E-STOP). Oculta calibração CAD e PIDs. | Comandos de processo + atalhos de reconhecimento de alarmes e laudos. | Barra completa de Engenharia: "Destravar CAD", Sintonia PID e CLP. | Barra irrestrita com atalho para Gestão de Usuários e Auditoria. |
| **2. Árvore do Projeto** | Exibe e filtra apenas as zonas cadastradas no crachá (`zonasAutorizadas`). | Exibe todas as zonas da ETA Central, Poços e Estações de Tratamento. | Visão hierárquica completa com parâmetros elétricos e químicos. | Visão global sistêmica de infraestrutura e nós de rede. |
| **3. Área de Trabalho** | Canvas AntV X6 bloqueado para edição; exibição de animação de fluxo e alarmes. | Canvas com foco em pontos de amostragem e dosagem química. | Canvas destravável para edição geométrica ortogonal Manhattan CAD. | Acesso pleno a todas as áreas e modos de renderização. |
| **4. Painel de Guias** | Abas: *Sinóptico Geral* e *Controles Básicos*. | Abas destacadas: *Laudos Duplos (Portaria 888)* e *Histórico de Alarmes*. | Abas: *Sintonia de PIDs*, *Painel 16 Células FTE-CDI* e *Topologias ZLD*. | Acesso a todas as abas + aba *CFR 21 Part 11 Auditoria*. |

#### 3. Atividades de Engenharia:
1. **Configurador de Workspace (`src/services/workspaceService.ts`):**  
   Implementar serviço que injeta as permissões e personalizações da Toolbar, Árvore de Estações e Guias com base no `authService.getOperadorAtual()`.
2. **Persistência de Preferências no Supabase:**  
   Salvar preferências do operador (zoom preferido, última tela aberta, ordenação de abas) na tabela `preferencias_workspace_scada` vinculada ao `usuario_id`.
3. **Alternância Instantânea:**  
   Ao comutar de usuário na IHM, a interface reconfigura instantaneamente os 4 componentes visuais sem necessidade de recarregar a página.

#### 4. Entregáveis da Fase 3:
* Novo serviço: `src/services/workspaceService.ts`.
* Reconfiguração dinâmica da Toolbar, Árvore de Projeto e Guias em `PurifyWaveSynopticView.tsx` e `App.tsx`.
* Tabela de preferências no Supabase.

---

### FASE 4 (Prioridade Estratégica / Conectividade Distribuída): Expansão da Arquitetura RTU com DNP3 e MQTT (Modelo da Imagem 3)

#### 1. Objetivo Técnico:
Expandir a capacidade de telecomunicação industrial do sistema supervisório PurifyWave, aproximando-o da arquitetura completa de telemetria de água e esgoto apresentada na **Imagem 3** (padrão Elipse Water / Saneamento 4.0).

#### 2. Análise Comparativa com o Modelo da Imagem 3:
* **O que o sistema já possui hoje:**
  - Driver **Modbus TCP** (Item 1 do diagrama: protocolo por polling) em `server/plcGateway.ts` e `src/services/PlcService.ts`.
  - Servidor Central e Historiador de Dados em Nuvem no **Supabase** (equivalente ao SQL Server / EPM central).
  - IHM Web e Estúdio de Engenharia com AntV X6.
* **O que a Fase 4 adicionará:**
  - **Suporte ao Protocolo DNP3 (Item 2 do diagrama - *Protocolo por Exceção*):** Implementação de módulo de software capaz de receber eventos DNP3 de RTUs remotas com timestamp carimbado na origem e congelamento em classes 1, 2 e 3.
  - **Conector MQTT (Item 4 do diagrama):** Ingestão de telemetria de sensores IoT de baixa potência (hidrômetros inteligentes, medidores de pressão em cavaletes de rede).
  - **Mapeamento de RTUs Físicas:** Configuração de unidades remotas distribuídas para monitoramento de poços profundos a quilômetros de distância.

#### 3. Atividades de Engenharia:
1. **Módulo de Telemetria DNP3 / Exceção (`server/dnp3Gateway.ts`):**  
   Estruturar manipulador de pacotes orientados a eventos para redes de telemetria com comunicação intermitente.
2. **Broker / Cliente MQTT (`server/mqttClient.ts`):**  
   Conexão para publicação e subscrição de tópicos de telemetria IoT de água tratada.
3. **Painel de Diagnóstico de RTUs na IHM:**  
   Visualização gráfica do estado dos enlaces de rádio, satélite ou 4G das RTUs de campo.

#### 4. Entregáveis da Fase 4:
* Módulos de gateway no backend: `server/dnp3Gateway.ts` e `server/mqttClient.ts`.
* Painel de diagnóstico de telemetria distribuída no supervisório.

---

## 4. Cronograma Estimativo e Dependências Técnicas

```
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Saneamento Erro SCD-DAT-001 (Imediata - ~30 minutos)            │
│ Dependência: Nenhuma (independente e urgente)                          │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 2: Tela de Login e Solicitação de Cadastro (~2 horas)             │
│ Dependência: Fase 1 sanada para evitar alertas na sincronização        │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 3: Ambientes de Trabalho por Credencial (~1,5 horas)              │
│ Dependência: Fase 2 concluída (perfis e login formal ativos)           │
├────────────────────────────────────────────────────────────────────────┤
│ FASE 4: Arquitetura RTU com DNP3 / MQTT (Fase Futura / Estratégica)   │
│ Dependência: Fases 1, 2 e 3 homologadas e validadas em produção        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Garantia de Conformidade e Proteção contra Regressões

Para cada fase que vier a ser autorizada pelo Operador:
1. **Compilação e Linter Contínuos:** Execução obrigatória de `compile_applet` e `tsc --noEmit` garantindo 0 erros de sintaxe e tipagem estrita;
2. **Suíte Completa de Testes Automatizados:** Manutenção de 100% de aprovação na suíte de testes de regressão (260 testes atualmente ativos cobrindo intertravamentos de 2,80 bar, controle de bomba, hash PBKDF2 e auditoria CFR 21);
3. **Registro Compulsório em Markdown:** Atualização rigorosa do arquivo `contexto.md` e emissão de relatório detalhado a cada fase entregue.

---

## 6. Consulta de Liberação para o Operador

> **Status Atual do Repositório:**  
> Em total respeito à sua determinação (*«Não faça nenhuma alteração, somente quando eu autorizar»*), **o código-fonte permanece intacto**.

**Pergunta para Validação:**  
Você aprova este Plano Diretor de Implementação por Fases?  
Se sim, **autoriza a execução da FASE 1 (Saneamento do Erro SCD-DAT-001) para que possamos iniciar de imediato?**
