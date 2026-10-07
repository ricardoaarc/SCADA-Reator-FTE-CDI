# RELATÓRIO TÉCNICO OFICIAL: HOMOLOGAÇÃO DO PR-2 CONCLUÍDO
## Saneamento de Ingestão de Permissões (SCD-DAT-001) e Higiene Estrutural do Sistema

> **Data de Emissão:** 06 de Outubro de 2026  
> **Sistema:** Supervisório SCADA PurifyWave / FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva — 180 m³/h, 50 L/s)  
> **Banco de Dados Principal:** Supabase Industrial (`https://ivurdxdcpwwjcphhszdg.supabase.co`)  
> **Etapa Executada:** **PR-2 (Pacote 2 do Cronograma Cirúrgico)**  
> **Status:** **HOMOLOGADO COM SUCESSO (100% PASS, 0 REGRESSÕES, BUILD VÁLIDO)**

---

## 1. Sumário Executivo

Em conformidade com a autorização expressa do Operador (*"Autorizo dar início ao PR-2"*), foi implementada e validada com sucesso a segunda fase do plano cirúrgico de engenharia SCADA.

O PR-2 atacou cirurgicamente a causa raiz do alarme visual **`SCD-DAT-001`** (identificado na Imagem 1 como aviso de integridade de dados salvos) e realizou a higiene estrutural definitiva do repositório, mantendo o validador estrito de dados intacto e blindando a aplicação contra permissões corrompidas ou vazias.

---

## 2. Ações Executadas no PR-2

### 2.1. Causa Raiz e Solução Definitiva do SCD-DAT-001
- **Causa Raiz Identificada:** Quando usuários eram consultados ou sincronizados com o Supabase sem permissões granulares explícitas (ou com objeto vazio `{}` gravado por ferramentas legadas), a carga do cache local tentava validar o registro contra `esquemaOperador`. Como o validador estrito exige booleanos concretos para cada chave (`canViewSynoptic`, `canManageUsers`, etc.), o objeto `{}` falhava na checagem e disparava o alarme `SCD-DAT-001` ("Dados salvos inválidos no localStorage").
- **Solução Implementada (Defesa em Profundidade na Ingestão):**
  1. **`server/usuariosGateway.ts` (API Express / Conduíte Seguro):**
     - No endpoint `GET /api/scada/usuarios`, cada linha vinda do Supabase passa compulsoriamente por `normalizarPermissoes(row.role, row.permissoes_granulares)`. Nenhuma resposta HTTP envia `{}` ao cliente.
     - No endpoint `PUT /api/scada/usuarios/:matricula`, a atualização de permissões é normalizada e o payload retornado também é sanitizado.
  2. **`src/services/AuthService.ts` (Núcleo de Autenticação e RBAC):**
     - Em `carregarUsuariosPersistidos()`, o leitor seguro `lerLista` recebeu uma função de transformação normalizadora que garante a integridade de qualquer usuário lido do cache.
     - Em `sincronizarUsuariosComSupabase()`, a checagem de operadores existentes agora valida e normaliza `row.permissoes_granulares`, corrigindo instantaneamente qualquer divergência sem disparar alarmes.
     - Em `cadastrarOperador()` e `atualizarOperador()`, as permissões são normalizadas com `PERMISSOES_PADRAO[role]` antes de qualquer persistência local ou remota.
  3. **Manutenção da Validação Estrita:**
     - O validador `storageSeguro.ts` e o esquema `esquemaOperador` **não foram enfraquecidos nem flexibilizados**. O teste unitário que exige rejeição de permissões incompletas continua passando 100%, garantindo que dados efetivamente corrompidos continuem sendo interceptados.

### 2.2. Higiene Estrutural do Repositório
- **Exclusão do Controlador v1 Obsoleto:**
  - O arquivo `src/services/FteCdiController.ts` (621 linhas da primeira versão legada inativa) foi **completamente excluído**.
  - Todo o sistema de controle, P&ID, modais, sinóptico híbrido e rotinas de scan operam unicamente via `src/services/fte_cdi_controller_v2.ts` (`controllerV2Instance`).
- **Verificação de Arquivos de Patch (`.rej`):**
  - Varredura completa realizada em toda a árvore de diretórios: **0 arquivos `.rej` encontrados**.
- **Integridade do Serviço PurifyWave:**
  - `src/services/purifywaveIntegrationService.ts` validado com 1405 linhas legíveis, tipagem TypeScript estrita, sem `@ts-nocheck` e integrado a `dbInstance` e `storageSeguro`.

---

## 3. Matriz de Testes e Validação Automatizada

O script de testes `scripts/teste-usuarios-supabase-hibrido.mts` foi enriquecido com novos testes específicos do PR-2:

| # | Teste Automatizado | Escopo | Resultado |
|---|---|---|:---:|
| 1 | Sessão inicializa em perfil básico OPERADOR (IEC 62443 / CFR 21) | RBAC | **PASS** |
| 2 | Cadastro bloqueado com ScadaError SCD-AUT-001 para operador comum | Segurança | **PASS** |
| 3 | Autenticação como Administrador ADM-001 com PIN aprovada | Autenticação | **PASS** |
| 4 | PIN fraco/previsível (123456) recusado na criação | Política PIN | **PASS** |
| 5 | Operador criado com sucesso pelo Administrador | Gestão Usuários | **PASS** |
| 6 | Novo operador consta na lista do SCADA sem credenciais expostas | Privacidade | **PASS** |
| 7 | Ação registrada na Trilha de Auditoria CFR 21 Part 11 com assinatura | Auditoria | **PASS** |
| 8 | Edição do operador aprovada | Gestão Usuários | **PASS** |
| 9 | Cargo do operador atualizado na lista | Consistência | **PASS** |
| 10 | Exclusão do operador aprovada e removido da lista ativa | Ciclo de Vida | **PASS** |
| 11 | **SCD-DAT-001:** Objeto vazio `{}` normalizado preenche 100% dos campos de OPERADOR | PR-2 Sanitização | **PASS** |
| 12 | **Menor Privilégio:** Tentativa de injetar permissões de Admin em OPERADOR é bloqueada | PR-2 RBAC | **PASS** |
| 13 | **Conformidade:** Usuário com permissões normalizadas passa sem erros no `esquemaOperador` | PR-2 Integridade | **PASS** |
| 14 | **Novo cadastro:** Sem permissões manuais recebe conjunto completo (não `{}`) | PR-2 Ingestão | **PASS** |
| 15 | **Higiene:** Controlador v1 legado `FteCdiController.ts` excluído com sucesso | PR-2 Higiene | **PASS** |
| 16 | **Higiene:** Repositório sem arquivos residuais de rejeição (`.rej`) | PR-2 Higiene | **PASS** |

### Resultado da Bateria de Testes Unificada
- **`teste-usuarios-supabase-hibrido.mts`**: **16/16 PASS (100%)**
- **Compilação do Applet (`compile_applet`)**: **Sucesso absoluto (Build Succeeded)**
- **Regressões:** **Zero regressões identificadas.**

---

## 4. Próxima Etapa no Cronograma Cirúrgico

Com o PR-2 100% homologado e concluído, a próxima etapa estruturada é o **PR-3 (Fatiamento Atômico do Mapa Modbus v2.1)**:

- **PR-3a:** Criação do módulo fonte-única `src/services/mapaModbus.ts` com os endereços e tags atuais (sem alteração de comportamento em tempo de execução).
- **PR-3b:** Ativação do Mapa v2.1 no SCADA protegido por verificação cíclica do registrador `40099: MAP_VERSION` (código de erro `SCD-PLC-009` em caso de incompatibilidade).
- **PR-3c:** Extensão das Funções 02 (Discrete Inputs) e 04 (Input Registers) no gateway Modbus `server/plcGateway.ts`.
- **PR-3d:** Watchdog industrial rodando a cada 1.000 ms no servidor Express/Node.js com timeout de 5,0 s no CLP.

Aguardamos sua autorização expressa para dar início ao **PR-3a**.
