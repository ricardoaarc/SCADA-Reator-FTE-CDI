# RELATÓRIO TÉCNICO OFICIAL: ANÁLISE CIRÚRGICA DE VIABILIDADE E RISCOS
## Confronto do Parecer do Operador com o Plano de Engenharia SCADA

> **Data de Emissão:** 06 de Outubro de 2026  
> **Sistema:** Supervisório SCADA PurifyWave / FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva — 180 m³/h, 50 L/s)  
> **Banco de Dados Principal:** Supabase (`https://ivurdxdcpwwjcphhszdg.supabase.co`)  
> **Documento Analisado:** *"Revisão - O parecer e o meu plano.pdf"* (Análise e Parecer Técnico do Operador)  
> **Especialidade:** Engenharia Sênior de Automação, Sistemas Supervisórios SCADA e Cibersegurança Industrial  
> **Status do Código:** **100% INALTERADO** (Respeito rigoroso à diretriz: *«Não faça nenhuma alteração, somente quando eu autorizar»*)

---

## 1. Pergunta e Solicitação do Operador

> *"1 - Analise de forma Cirúrgica de Viabilidade e Riscos como profissional e engenheiro sênior, o meu parecer e o meu plano sugerido (em anexo Revisão - O parecer e o meu plano.pdf) versus o seu apresentado (4 Pacotes Sugeridos) e crie um Artifacts com todo o planejamento detalhado e explicado cada ponto analisado caso a caso.*  
> *Quero um relatório completo e detalhado de todas perguntas e observações, e soluções propostas, não invente nada, quero tudo de forma profissional e de forma real.*  
> *(«Não faça nenhuma alteração, somente quando eu autorizar»).*"

---

## 2. Veredito Técnico de Engenharia Sênior

A análise do operador apresentada no documento *"Revisão - O parecer e o meu plano.pdf"* é de **excepcional rigor técnico**. Ela identificou fragilidades concretas na interface entre o software supervisório e o hardware de controle que uma abordagem meramente teórica de desenvolvimento de software não havia antecipado:

1. **A Causa Raiz Real do Erro `SCD-DAT-001`**: A raiz do problema não era um campo opcional em falta, mas o operador de *fallback* `permissoes || {}` gravando objetos vazios `{}` no banco Supabase e no cache local, provocando a rejeição pelo validador estrito no boot seguinte. Tornar `canViewSynoptic` opcional mascararia o problema em vez de saná-lo. O correto é a **normalização e enriquecimento na entrada com `PERMISSOES_PADRAO[role]`**.
2. **A Contradição Física no Controle PID**: A malha no código regula **Vazão** (500 a 1500 L/h) com override de **Pressão** (2.70 bar), enquanto o mapa Modbus novo rotulava o registrador `40010` como *Setpoint de Pressão* e o código de simulação gravava *Temperatura* analógica no mesmo endereço. Além disso, **inexiste registrador de saída analógica (MV/CV)** para modular o inversor de frequência (VFD) da bomba P-101.
3. **O Conflito de Segurança da Coil 3 Modbus**: A Coil 3 foi mapeada simultaneamente como *Válvula de Purga ZLD (XV-102)* e como *Intertravamento / E-STOP Físico*. O gateway Modbus bloqueia a escrita na Coil 3 para proteger o intertravamento, inviabilizando a abertura da válvula de purga pelo processo.
4. **As 5 Regras de Ouro para Blindagem contra Regressões**: Adoção de teste de contrato Modbus formal antes de qualquer refatoração, script unificado `npm test`, entregas atômicas em PRs pequenos, isolamento do banco Supabase durante testes locais e separação irrevogável entre segurança física e novidades de interface.

---

## 3. Confronto Cirúrgico Ponto a Ponto (Caso a Caso)

### Caso 1: Diagnóstico Real de `SCD-DAT-001` (Normalização vs. Mascaramento)
* **Análise Real no Código:**
  - Em `server/usuariosGateway.ts` (linha 61) e `src/services/supabaseSyncService.ts` (linha 155), o código executa `permissoes_granulares: u.permissoes || {}`.
  - Ao salvar `{}`, o esquema estrito de `esquemasDados.ts` rejeita o objeto na inicialização subsequente, acionando o alarme de integridade `SCD-DAT-001`.
  - Se apenas tornássemos `canViewSynoptic` opcional, o operador continuaria sem permissões essenciais (`canOperateActuators`, `canAcknowledgeAlarms`), quebrando o princípio de menor privilégio.
* **Solução de Engenharia Adotada:**
  - Sanitizar e enriquecer os dados na camada de ingestão (`AuthService.ts` e `usuariosGateway.ts`), combinando `PERMISSOES_PADRAO[role]` com os dados remotos, garantindo que o objeto sempre seja completo e nunca exceda as permissões do papel.
  - Manter o validador `esquemaOperador` 100% estrito, preservando o teste `teste-dados-salvos.mts` (linha 73) sem nenhuma regressão.

---

### Caso 2: As Lacunas do Roadmap Identificadas
O operador apontou itens essenciais admitidos no parecer anterior que haviam ficado sem cobertura nos 4 pacotes propostos. O plano foi reestruturado para acolhê-los formalmente:

* **P0-3 (Políticas RLS e Isolamento de Testes):**
  - Implementação de script SQL para fechar escritas anônimas nas tabelas operacionais do Supabase.
  - Implementação de mecanismo de bypass/mock em ambiente de teste (`NODE_ENV=test` ou flag em scripts) para que as execuções de `npx tsx scripts/...` nunca emitam escritas no banco de produção.
* **P1-3 (Indicador Visual de Sincronização Supabase):**
  - Adição de indicador de status no cabeçalho da IHM informando: Conectado (latência em ms), Sincronizando (contagem de lotes) ou Offline (armazenamento local ativo com contagem de pendências para reconciliação).
* **P1-4 (Integração Efetiva do PID):**
  - Criação dos registradores e variáveis necessárias para fechar a malha no CLP.
* **Dívida P2 (Diálogos Modais Assíncronos):**
  - Substituição de `window.alert()` e `window.confirm()` por modais React orientados a Promises (`dialogService.confirm()`), evitando o travamento do loop de eventos a 50 FPS do AntV X6.
* **P3 (Comissionamento em CLP Real):**
  - Procedimento de teste e certificação com hardware físico em bancada via Modbus TCP (porta 502).

---

### Caso 3: O Conflito do PID e a Variável Manipulada (VFD)
* **Análise Real no Código:**
  - `src/services/PidController.ts` possui a malha calculada:
    - Processo controlado: **Vazão FT-101** (SP = 980 L/h, nominal 500 a 1500 L/h);
    - Proteção de alívio: **Pressão PT-101** (Override atuando a 2.70 bar contra ruptura de placas a 3.0 bar);
    - Saída calculada: **Sinal do Inversor VFD** (0 a 100%, modulando frequência da bomba P-101).
  - No entanto:
    - O registrador `40010` foi chamado de "Setpoint Pressão PID (SP-PID)".
    - O método `atualizarDadosSimulados` de `PlcService.ts` grava `dados.temperaturaC * 10` no registrador `40010`.
    - Não existe registrador holding para escrita da saída de 0 a 100% no inversor de frequência.
* **Solução de Engenharia Adotada:**
  - Definir formalmente a arquitetura da malha:
    - PV1 = Vazão FT-101 (Reg. `40002`);
    - PV2 = Pressão PT-101 (Reg. `40001`);
    - SP_Vazao = Setpoint Operacional (IHM / Registrador de Setpoint);
    - CV / MV = Saída Analógica VFD Bomba P-101 (Novo Registrador Holding, ex.: `40011`);
    - Reg. `40010` = Setpoint de Limitação de Pressão (Override);
    - Reg. `40012` ou `40009` = Temperatura Processo TT-101 (sem conflito).

---

### Caso 4: Pacote 1 (Segurança e Saneamento) e o Conflito da Coil 3
* **Análise de Risco:**
  - **A Coil 3 é o maior ponto de vulnerabilidade e confusão do sistema**:
    - No código: `const COIL_INTERLOCK = 3;` e `regs[3].valor = estado.interlockDisparado`.
    - No mapa de nomes: `3 = Válvula Purga ZLD (XV-102)`.
    - No gateway: lista de escrita `1,2,4` (Coil 3 travada contra escrita externa por segurança).
    - Tentativas de acionar a purga pelo SCADA sofrem bloqueio de escrita no gateway (`SCD-PLC-003`).
* **Solução:** O intertravamento (E-STOP) e os atuadores de purga devem ter endereços distintos no mapa oficial de CLP físico.
* **Restauração de `purifywaveIntegrationService.ts`:**
  - Reversão segura da minificação para o código legível original (commit `da60488`, 1303 linhas), reaplicando as correções cirúrgicas de import de `dbInstance` e validação de schema.
* **Remoção do Controlador v1:**
  - Exclusão do arquivo legado `fte_cdi_controller.ts` (sem dependências ativas no projeto).

---

### Caso 5: Pacote 2 (Login e Aprovação) — Contenção de Riscos
* **Análise de Risco:**
  - Permitir solicitações `PENDENTE_APROVACAO` via `insert` anônimo direto no Supabase recriaria a brecha de escrita pública (P0-1), permitindo injeção de dados maliciosos.
* **Solução:**
  - Endpoint dedicado no backend Express `/api/scada/solicitar-cadastro` com proteção de taxa (*Rate Limiting* estrito de 3 req/15 min por IP) e validação server-side com gravação via chave de serviço.
  - Sincronização entre política de bloqueio de tentativas de PIN (3 vs. 5 falhas) e a asserção no teste `teste-pin-hash.mts`.

---

### Caso 6: Pacote 3 (Workspaces, Receitas e Alarmes) — Viabilidade Parcial
* **Análise de Risco:**
  - Descarregar receitas em lote de forma atômica no CLP exige autorização de escrita em múltiplos registradores analógicos. Sem validação de faixas seguras (*Safety Ranges*), há risco físico de queima de placas por sobretensão ou cavitação de bomba.
* **Solução:**
  - Módulo de validação prévia de faixas no backend antes de qualquer escrita em bloco no Modbus.
  - Trilha de auditoria obrigatória (21 CFR Part 11) registrando valores anteriores e novos.
  - Enforcement de níveis numéricos de privilégio (0 a 99) validado no Express, não apenas na interface visual.

---

### Caso 7: Pacote 4 (MQTT, DNP3 e RTUs) — Módulo Desacoplado
* **Análise de Risco:**
  - O ambiente web/navegador não suporta conexões TCP diretas nem protocolos industriais binários brutos.
* **Solução:**
  - Criação de adaptadores isolados no servidor Node.js (`server/dnp3Bridge.ts`) para atuar como gateway de borda, sem acoplamento com o loop principal do SCADA. Redundância de servidores mantida para fase posterior após desacoplamento de estado em memória.

---

## 4. As 5 Diretrizes de Ouro para Blindagem Contra Regressões

1. **Teste de Contrato Modbus Primeiro:** Criar `scripts/teste-contrato-modbus.mts` antes de alterar qualquer código de comunicação com o CLP.
2. **Esteira de Testes Unificada (`npm test`):** Integrar todos os scripts em um comando único no `package.json`.
3. **PRs Atômicos e Sequenciais:** Uma alteração isolada por ciclo, validada por todos os testes e por `compile_applet`.
4. **Isolamento de Ambiente Supabase:** Mocks e flags que impeçam que testes automatizados gravem no banco de produção.
5. **Separação Rígida:** Não misturar correções de segurança física e integridade de dados com novos recursos visuais.

---

## 5. A Decisão Central que Bloqueia a Execução

Para iniciar a execução com 100% de precisão e segurança, o operador deve definir o **Mapa Oficial do CLP Físico**:

| Elemento | Opção A (Mapa Legado) | Opção B (Mapa P&ID Expandido) |
|:---|:---|:---|
| **Coil 1** | Bomba Principal P-101 | Bomba Principal P-101 |
| **Coil 2** | Fonte DC Células | Fonte DC Células |
| **Coil 3** | **Intertravamento / E-STOP** | **Válvula Purga ZLD (XV-102)** |
| **Coil 4** | Válvula Reúso T-102 (XV-103) | Válvula Reúso T-102 (XV-103) |
| **Coil 5** | *(Não utilizada)* | **Intertravamento / E-STOP Geral** |
| **40001** | Pressão Entrada PT-101 (x100) | Pressão Entrada PT-101 (x100) |
| **40002** | Vazão Alimentação FT-101 | Vazão Alimentação FT-101 |
| **40010** | **Temperatura TT-101 (x10)** | **Setpoint Pressão Override PID** |
| **40011** | *(Não definido)* | **Saída Modulada VFD Inversor (0-100%)** |
| **40012** | *(Não definido)* | **Temperatura Processo TT-101 (x10)** |

---

## 6. Conclusão

O planejamento cirúrgico está concluído, documentado e refletido no artefato [`analise_comparativa_e_plano_cirurgico_scada.md`](/.aistudio/artifacts/brain/9b0b139f-b3e6-4572-9825-40769a597866/analise_comparativa_e_plano_cirurgico_scada.md).

O código-fonte do sistema permanece **100% íntegro e inalterado**, no aguardo da decisão do operador sobre o mapa Modbus e da autorização formal para a primeira etapa.
