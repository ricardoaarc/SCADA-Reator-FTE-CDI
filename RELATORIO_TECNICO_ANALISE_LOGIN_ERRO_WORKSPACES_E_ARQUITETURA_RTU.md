# RELATÓRIO TÉCNICO PERICIAL DE ENGENHARIA SCADA: ANÁLISE DE LOGIN, DIAGNÓSTICO DO ERRO SCD-DAT-001, AMBIENTES DE TRABALHO E ARQUITETURA DE RTUS

> **Data de Emissão:** 05 de Outubro de 2026  
> **Sistema:** Supervisório SCADA PurifyWave / FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva - 180 m³/h, 50 L/s)  
> **Especialidade:** Engenharia Sênior de Automação, Sistemas SCADA & Cibersegurança Industrial (IEC 62443 / FDA 21 CFR Part 11)  
> **Status:** PARECER TÉCNICO COMPLETO E PROPOSIÇÃO ARQUITETURAL (AGUARDANDO AUTORIZAÇÃO DO OPERADOR)

---

## 1. Pergunta 1: Tela de Login Segura, Limpa e Suave com Solicitação de Cadastro (Conforme Imagem 2)

### Pergunta do Operador:
*"O Sistema precisa de uma tela de login segura, limpa e suave, com opção para solicitação de cadastro (Conforme Image 2 anexa), é possível criar a tela para acesso ao sistema e integrar tudo ao banco de dados do Supabase?"*

### Análise Pericial e Resposta:
**SIM, é 100% viável, recomendado e perfeitamente integrável ao Supabase.**

#### 1.1. Análise da Interface Proposta (Imagem 2)
A Imagem 2 apresenta um padrão visual de alta sofisticação ergonômica (*Split View Card* com transição suave):
* **Painel Esquerdo (Apresentação / Alternador de Modo):** Fundo gradiente em verde-água / ciano (`#00bfa5` a `#00897b`), tipografia branca, mensagem de acolhimento *"Bem - vindo de volta / Acesse sua conta agora"* e botão de alternância *"ENTRAR"*.
* **Painel Direito (Formulário de Cadastro/Login):** Fundo limpo e suave, título *"SOLICITAR CADASTRO"*, campos com ícones padronizados (Nome com ícone de usuário, E-mail com ícone de envelope, Senha/PIN com ícone de cadeado) e botão de submissão *"ENVIAR"*.
* **Efeito Visual Suave:** Animação de transição fluida (*slide/fade*) ao alternar entre as abas *"Entrar"* e *"Solicitar Cadastro"*.

#### 1.2. Integração com o Banco de Dados Supabase no Padrão Industrial
Em sistemas industriais de infraestrutura crítica (IEC 62443 / FDA 21 CFR Part 11), um usuário que solicita cadastro **não pode ter acesso imediato às telas de controle ou manobra de bombas**:
1. **Envio da Solicitação:** O formulário da Imagem 2 grava na tabela do Supabase (`usuarios_scada`) com o status `'PENDENTE_APROVACAO'` e hash de senha PBKDF2-SHA256.
2. **Triagem pelo Administrador:** O Administrador oficial (`Ricardo Arcanjo - ADM-001`) recebe a notificação na tela de Gestão de Acessos do SCADA.
3. **Liberação e Atribuição de Crachá:** O Administrador define a matrícula formal (ex: `OP-105`), a função (`OPERADOR`, `SUPERVISOR`, `ENGENHEIRO`), as zonas de processo autorizadas (`ZONA_1_CAPTACAO`, `ZONA_3_FTE_CDI`) e aprova o acesso.
4. **Login e Sessão Segura:** Ao fazer login, o sistema valida as credenciais diretamente no Supabase, emite a assinatura na trilha de auditoria e abre a IHM com o perfil correspondente.

---

## 2. Pergunta 2: Diagnóstico da Mensagem de Problema/Erro Acima do Sinóptico Híbrido (Imagem 1)

### Pergunta do Operador:
*"Acima da tela do Sinóptico Híbrido, o Sistema está apresentando uma mensagem de problema/erro (Image 1) o que isso significa? É possivel consertar?"*

### Análise Pericial e Diagnóstico de Causa Raiz:

#### 2.1. O Que a Mensagem Significa?
A mensagem exibida no banner superior da Imagem 1 é:
> **DADOS SALVOS COM PROBLEMA (1) [Dispensar]**  
> `[SCD-DAT-001] Usuários cadastrados: 3 de 8 item(ns) inválido(s) descartado(s). Primeiro problema: item 5.permissoes.canViewSynoptic: esperado verdadeiro/falso. Itens válidos mantidos; os inválidos foram descartados.`  
> `Uma cópia do valor inválido foi guardada no navegador (chaves scada_backup_corrompido:*) para análise do suporte.`

**Causa Raiz Exata:**
* O sistema supervisório possui um subsistema de **integridade estrita de dados** (`src/services/storageSeguro.ts` e `src/services/esquemasDados.ts`).
* Quando implementamos a sincronização com a tabela `usuarios_scada` do Supabase, o sistema realizou o download de registros pré-existentes. No banco do Supabase, o campo `permissoes_granulares` de alguns usuários (como os registros 5, 6, etc.) continha apenas um subconjunto de chaves (ex: `canManageUsers: true, podeEditarLayout: true`), **mas não continha o atributo `canViewSynoptic`**.
* O validador local de esquema (`esquemaOperador` em `src/services/esquemasDados.ts`) possui a seguinte regra rígida:
  ```typescript
  permissoes: esq.opcional(esq.objeto({
    canViewSynoptic: bool, // ⚠️ Exige estritamente true ou false (rejeita undefined)
    canEditLayout: bool,
    canOperatePumps: bool,
    ...
  }))
  ```
* Ao ler o registro vindo do Supabase sem essa chave booleana explícita, o validador agiu em modo **à prova de falhas (*fail-safe*)**:
  1. Descartou os 3 itens com atributos incompletos para não travar a aplicação com erros de ponteiro nulo (`undefined`);
  2. Manteve os itens válidos ativos no sistema;
  3. Salvou um backup de segurança em `scada_backup_corrompido:*`;
  4. Emitiu o aviso operacional `[SCD-DAT-001]`.

#### 2.2. É Possível Consertar?
**SIM, 100% solúvel e de correção imediata.**  
A correção é definitiva e envolve três passos de engenharia:
1. **No validador (`src/services/esquemasDados.ts`):** Tornar as chaves internas de `permissoes` opcionais com valor padrão (`canViewSynoptic: esq.opcional(bool)`), aceitando registros com dicionários parciais de permissões.
2. **Na sincronização (`src/services/AuthService.ts`):** Ao ler os usuários do Supabase, mesclar sempre os campos com `PERMISSOES_PADRAO[role]`:
   ```typescript
   permissoes: { ...PERMISSOES_PADRAO[roleVal], ...(row.permissoes_granulares || {}) }
   ```
   Isso garante que `canViewSynoptic` nunca venha nulo ou ausente.
3. **Na IHM:** Clicar no botão **"Dispensar"** no canto direito do banner para limpar a notificação após a sanitização dos registros.

---

## 3. Pergunta 3: Criação de Ambiente de Trabalho Personalizado por Usuário e Componentes Mínimos

### Pergunta do Operador:
*"É possível criar no Sistema um ambiente de trabalho para cada usuário conforme suas credencias de login (Usuário, Senha e permissões), ou isso já está implementado com os componentes mínimos (Toolbar, Árvore do Projeto, Área de trabalho e Painel de guias)? Caso precise de mais detalhes para essa pergunta, solicite de forma isolada."*

### Parecer de Engenharia:
**SIM, é perfeitamente viável e os 4 componentes mínimos da arquitetura SCADA já existem no sistema, com capacidade de personalização profunda.**

#### 3.1. Estado Atual dos 4 Componentes Mínimos no Sistema:

| Componente Mínimo SCADA | Estado Atual no Sistema PurifyWave | Onde Está Localizado |
|:---|:---:|:---|
| **1. Toolbar (Barra de Ferramentas)** | **IMPLEMENTADO** | Topo do Sinóptico Híbrido: exibe status do reator, taxa de quadros (50 FPS), botão "Usuários & Zonas", botão "Destravar Engenharia", comandos de rotação e zoom. |
| **2. Árvore do Projeto (Project Tree)** | **IMPLEMENTADO** | Menu seletor de Estações industriais (ETA Central 180 m³/h, Poço T-100, Skid CONTHEC, Reator FTE-CDI) e navegação entre zonas. |
| **3. Área de Trabalho (Workspace)** | **IMPLEMENTADO** | Canvas central AntV X6 com tubulações ortogonais dinâmicas, instrumentação ISA-5.1 e animação fluídica. |
| **4. Painel de Guias (Tabs Panel)** | **IMPLEMENTADO** | Abas de alternância de processo: *Controles de Processo*, *Topologias ZLD*, *Laudo Duplo*, *PurifyWave Sinóptico* e *Painel de Células*. |

#### 3.2. Como Customizar o "Ambiente de Trabalho" por Perfil de Usuário (*Role-Based Workspace*):
Atualmente, as restrições ocorrem por bloqueio lógico (ex: o Operador vê o botão "Destravar Engenharia", mas ao clicar é bloqueado por falta de permissão).

Podemos elevar o sistema ao nível dos softwares industriais mais avançados (Elipse E3, Siemens WinCC, Ignition) implementando **Espaços de Trabalho Adaptativos**:

1. **Workspace do OPERADOR (`OPERADOR`):**
   * **Toolbar:** Remove botões de configuração de PID e CAD, mantendo apenas comandos de bomba, válvulas e parada de emergência.
   * **Árvore do Projeto:** Exibe somente as zonas físicas para as quais o operador tem crachá liberado (`zonasAutorizadas`).
   * **Área de Trabalho:** Focada estritamente no monitoramento do sinóptico e dosagem.
   * **Guias:** Oculta abas de parametrização avançada.

2. **Workspace do SUPERVISOR / QUÍMICO (`SUPERVISOR`):**
   * Destaque na barra de guias para o painel de **Laudos Laboratoriais (Portaria 888)**, curva histórica de remoção de fluoreto e gerenciamento de alarmes ISA-18.2.

3. **Workspace do ENGENHEIRO DE AUTOMAÇÃO (`ENGENHEIRO`):**
   * Liberação total da Toolbar de calibração CAD AntV X6, sintonia fina de malhas PID, parâmetros Modbus do CLP e comutação de topologias.

4. **Workspace do ADMINISTRADOR (`ADMIN`):**
   * Visão sistêmica irrestrita, com painel de aprovação de novos operadores e auditoria FDA 21 CFR Part 11.

*Nota:* Para levar essa personalização ao nível máximo, podemos salvar as preferências visuais de cada operador (zoom padrão, última tela aberta, abas favoritas) diretamente no Supabase em uma tabela `preferencias_workspace_scada`.

---

## 4. Pergunta 4: Análise da Arquitetura Distribuída com RTUs, DNP3 e Modbus (Modelo da Imagem 3)

### Pergunta do Operador:
*"As Unidades Terminais Remotas (RTUs), como o nome sugere, este componente é comum em aplicações remotas. As RTUs atuam como hubs de dados dentro do sistema SCADA, sendo instaladas em diversas plantas ou locais remotos para coletar e transmitir dados de sistemas externos, como sensores, atuadores e PLCs. Para Gestão de Água e Esgoto: DNP3 e Modbus são frequentemente utilizados em sistemas de gestão de água devido à sua capacidade de suportar o monitoramento e controle remoto de bombas, válvulas e estações de tratamento. A confiabilidade e a facilidade de implementação tornam esses protocolos ideais para sistemas distribuídos, como instalações de água e esgoto, essa Arquitetura (Conforme "Modelo" da Image 3) foi implementado no sistema?"*

### Análise Pericial e Comparativo Técnico com a Imagem 3:

A **Imagem 3** apresenta a clássica arquitetura de referência em três níveis da indústria de saneamento (padrão Elipse Water / Saneamento 4.0):
1. **Nível 1: Sistemas Locais (Field / Edge):** ETAs, ETEs, Poços e Estações Elevatórias remotas com PLCs, RTUs e gateways de campo.
2. **Nível 2: Cloud ou Máquinas Virtuais (Central Servers):** Servidores de Aplicação SCADA, Servidores de Comunicação (FEPs) e Banco Historiador (SQL Server / EPM).
3. **Nível 3: Operação e Engenharia (Control Center):** Estações de visualização, estúdio de engenharia e Centro de Controle Operacional (CCO).

#### 4.1. O que JÁ ESTÁ IMPLEMENTADO no nosso Sistema:
* **Protocolo Modbus TCP (Item 1 da Imagem 3 - *Protocolo baseado em Polling*):**  
  **IMPLEMENTADO COM SUCESSO.** O nosso gateway em `server/plcGateway.ts` e `src/services/PlcService.ts` implementa a comunicação industrial com PLCs/RTUs via Modbus TCP:
  - Leitura cíclica e serializada de Holding Registers (40001 a 40010: pressão do plenum, vazão FT-101, condutividade CT-101/102, tensão DC, corrente, nível e pH);
  - Escrita controlada em Coils (1 a 4: bomba P-101, fonte DC PW-201, válvulas de purga e reuso);
  - Intertravamento físico de segurança a 2,80 bar com desarme prioritário de relés.
* **Repositório Central em Nuvem (SQL Server / Historiador):**  
  **IMPLEMENTADO COM SUCESSO.** O **Supabase** atua com excelência no papel de historiador relacional e de eventos em nuvem, armazenando continuamente a telemetria das 16 células a cada 4 segundos, os alarmes ISA-18.2 e as trilhas de auditoria CFR 21.
* **IHM de Operação e Estação de Engenharia:**  
  **IMPLEMENTADO COM SUCESSO.** A aplicação web integra a estação de visualização em tempo real (50 FPS) e a ferramenta de modelagem CAD da planta.
* **Estrutura de Múltiplas Estações:**  
  O serviço `purifywaveIntegrationService.ts` suporta o cadastro de diferentes estações de tratamento.

#### 4.2. O que AINDA NÃO FOI IMPLEMENTADO (Diferenças em Relação ao Modelo Completo da Imagem 3):
1. **Protocolo DNP3 (Item 2 da Imagem 3 - *Protocolo por Exceção*):**  
   * **Situação Atual:** O nosso sistema se comunica via **Modbus TCP** (polling cíclico).  
   * **Diferença Técnica:** O Modbus interroga os registradores repetidamente em intervalos fixos (ex: a cada 1 segundo). O **DNP3 (Distributed Network Protocol)** foi desenvolvido especificamente para telemetria de água e energia onde o link de comunicação é intermitente (rádio enlace, satélite, 3G/4G rural). O DNP3 opera com **relatório por exceção (*Report by Exception - RBE*)**, gerando eventos apenas quando uma variável ultrapassa uma banda morta (*deadband*), carimbando o milissegundo exato na própria RTU e armazenando eventos em buffer local (*freeze buffers / classes 1, 2 e 3*) para não perder dados se o link cair.  
   * **Veredito:** O protocolo DNP3 **não** está presente no gateway atual. Ele pode ser implementado no backend para conectar RTUs de campo compatíveis com DNP3.
2. **Protocolos MQTT e OPC UA (Itens 4 e 5 da Imagem 3):**  
   * O sistema atualmente usa HTTP REST / Modbus TCP. A integração de um broker MQTT (para hidrômetros e sensores IoT remotos) ou um conector OPC UA (IEC 62541) enriqueceria a conformidade com a Imagem 3.
3. **RTU Física de Campo vs. Gateway de Software:**  
   * No nosso sistema atual, o serviço Node.js (`server/plcGateway.ts`) funciona como uma **RTU Virtual / Edge Gateway**. Em uma planta física remota distribuída (com poços a 50 km de distância), utiliza-se uma RTU de hardware industrial (ex: Schneider SCADAPack, Emerson ControlWave, Motorola ou Siemens) conectada a uma antena de rádio/satélite transmitindo DNP3 para o servidor central.

---

## 5. Resumo Comparativo e Recomendações de Engenharia

| Tópico Analisado | Situação Atual | Proposta de Engenharia | Complexidade |
|:---|:---|:---|:---:|
| **1. Tela de Login / Solicitação (Img 2)** | Inexistente (sistema abre direto no perfil básico de Operador) | Criar modal/tela de login e solicitação de cadastro com design da Image 2, integrado ao Supabase com fluxo de aprovação por Administrador. | Média |
| **2. Erro SCD-DAT-001 (Img 1)** | Banner ativo indicando atributo `canViewSynoptic` ausente em registros do Supabase | Flexibilizar `esquemaOperador` com `esq.opcional(bool)` e injetar defaults de `PERMISSOES_PADRAO` no sync do Supabase. | Baixa (Rápida) |
| **3. Ambientes de Trabalho (Workspaces)** | Componentes mínimos presentes (Toolbar, Árvore, Canvas, Abas), com travas por código | Customizar dinamicamente a Toolbar e Árvore do projeto conforme o perfil (`OPERADOR`, `SUPERVISOR`, `ENGENHEIRO`, `ADMIN`), com preferência salva no Supabase. | Média |
| **4. Arquitetura RTU / DNP3 (Img 3)** | Modbus TCP implementado; DNP3 e MQTT ausentes | O sistema atende à camada Modbus e Central Cloud. Como evolução futura, implementar adaptador DNP3 / MQTT no backend. | Alta |

---

## 6. Próximo Passo

> **Lembrete Mandatório:** Conforme sua instrução expressa (*«Não faça nenhuma alteração, somente quando eu autorizar»*), **o código-fonte permaneceu 100% inalterado nesta rodada**.

Aguardamos sua orientação sobre quais itens deseja priorizar para implementação:
- **Opção A:** Corrigir imediatamente o erro `SCD-DAT-001` (Imagem 1) para limpar o banner do sinóptico;
- **Opção B:** Criar a Tela de Login e Solicitação de Cadastro no padrão da Imagem 2 integrada ao Supabase;
- **Opção C:** Implementar a personalização do Ambiente de Trabalho (*Workspace por Usuário*);
- **Opção D:** Executar o plano coordenado (A + B + C).
