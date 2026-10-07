# RELATÓRIO TÉCNICO PERICIAL: ANÁLISE COMPARATIVA DO PLANO DE CORREÇÕES E BENCHMARKING COM O MANUAL AUTONICS SCADAMASTER v2.2.3

> **Data de Emissão:** 05 de Outubro de 2026  
> **Sistema:** Supervisório SCADA PurifyWave / FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva - 180 m³/h, 50 L/s)  
> **Especialidade:** Engenharia Sênior de Software SCADA, Automação Industrial e Cibersegurança (IEC 62443 / FDA 21 CFR Part 11)  
> **Documentos Analisados:**  
> 1. `PLANO_DE_CORRECOES.txt` (Auditoria de Código e Vulnerabilidades)  
> 2. `SW_SCADAMaster_v2.2.3_EN_20260622_W.pdf` (Manual de Referência Técnica do Software SCADAMaster v2.2.3 - Autonics Corporation, 704 páginas)  
> **Status:** PARECER DE ENGENHARIA COMPLETO (SEM ALTERAÇÃO DE CÓDIGO - AGUARDANDO AUTORIZAÇÃO)

---

## 1. PARTE 1: Comparativo com o "PLANO_DE_CORRECOES.txt"

Realizamos a leitura e o confronto detalhado entre o arquivo `PLANO_DE_CORRECOES.txt` fornecido pelo operador e as análises e propostas de arquitetura que formulamos nas sessões anteriores.

### 1.1. Tabela de Convergência e Acordo Técnico

| Item do Plano de Correções | Diagnóstico no Plano Anexo | Situação no Sistema Atual & Proposta do Engenheiro | Veredito de Concordância |
|:---|:---|:---|:---:|
| **P0-1: RLS Aberta no Supabase & Confiança Cega do Cliente** | O script de RLS com `USING (true)` para `anon` e a sincronização do cliente sobrescrevendo usuários locais abrem brecha crítica onde qualquer um cria ADMIN via API REST pública do Supabase. | **Total acordo.** Diagnosticamos exatamente essa vulnerabilidade no relatório `RESPOSTA_TECNICA_ARQUITETURA_SEGURANCA_HIBRIDA_SUPABASE.md`. Rejeitamos a abertura de RLS para `anon` e propusemos fechar o RLS no Supabase, canalizando a gestão de usuários por um backend seguro com sessão. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P0-2: `/api/scada/usuarios` sem Autenticação Robusta** | Endpoint do servidor não pode confiar em cabeçalho solto `x-scada-admin-matricula`; auditoria engolida em catch vazio; assinatura eletrônica simplista. | **Total acordo.** O Conduíte Seguro deve validar um token de sessão ou cookie seguro emitido pelo login formal do Administrador (`ADM-001`), e falha na gravação da auditoria deve abortar a operação. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P0-3: RLS das Demais Tabelas do Supabase** | Verificar se telemetria, alarmes e ciclos possuem RLS protegida contra injeções forjadas externas. | **Total acordo.** As tabelas devem possuir políticas que permitam inserção apenas com autenticação e validação de schema. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P1-1: `purifywaveIntegrationService.ts` Minificado** | O arquivo teve 1303 linhas condensadas em 12 linhas com `@ts-nocheck` e `any`, impossibilitando revisão e quebrando tipagem estrita. | **Total acordo.** Deve ser restaurado a partir da versão legível do commit `da60488`, com tipagem TypeScript estrita e sem `@ts-nocheck`. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P1-2: Higiene do Repositório (Arquivos `.rej` e `.gitignore`)** | Existem 20 arquivos `.rej` rastreados pelo git decorrentes de conflitos de merge anteriores, ausência de `.gitignore` completo e `.env` rastreado. | **Total acordo.** Eliminar os 20 arquivos `.rej`, blindar o `.gitignore` para nunca comitar arquivos de ambiente e atualizar a documentação. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P1-3: Falhas Silenciosas de Sincronização** | `.catch(() => {})` e `if (error) return;` escondem falhas de conexão; o operador não sabe quando o sync parou. | **Total acordo.** Conforme proposto no nosso relatório de Workspaces, deve haver um indicador visual no cabeçalho (*Online / Offline / Sincronizando / Erro*). | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P1-4: Controlador v1 Morto e Painel PID Desconectado** | `FteCdiController.ts` (v1) usa `Math.random` e está morto, enquanto o v2 é o controlador real; o painel PID precisa atuar no laço real do CLP. | **Total acordo.** O código morto v1 deve ser removido e o PID deve ler e atuar nos registradores reais do CLP (40001 e 40010). | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P1-5: Dois Mapas Modbus Incompatíveis** | `hardwareGatewayService.ts` (coils 1, 2, 4, 10; registradores 30001+) diverge de `PlcService.ts` (coils 1 a 4; holding 40001+). | **Total acordo.** O mapa Modbus deve ser único e coincidir exatamente com a fiação e mapa do CLP físico da planta. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |
| **P2: Dívida Técnica (`alert()`, laudos `?? 0`, `npm test`)** | 7 usos de `alert/confirm` bloqueiam o runtime; laudos não medidos plotam zero em vez de null; falta script `npm test`. | **Total acordo.** Todos os 5 itens de P2 coincidem com os princípios de ergonomia e estabilidade que defendemos. | ✅ **CONVERGÊNCIA TOTAL (100% em acordo)** |

---

## 2. PARTE 2: Análise Profunda do Manual Autonics SCADAMaster v2.2.3

O software **Autonics SCADAMaster v2.2.3** é uma plataforma industrial de classe internacional para automação de manufatura, saneamento e utilidades. Analisamos suas 704 páginas e identificamos as **melhores práticas, recursos e arquiteturas que podem ser diretamente empregados no sistema PurifyWave / FTE-CDI**.

Estruturamos as melhorias em **8 Pilares Tecnológicos**:

---

### Pilar 1: Sistema de Segurança de Usuários, FDA 21 CFR Part 11 e Controle de Sessão (Capítulos 7.10 e 12, p. 259–270, 481–482)

O SCADAMaster possui um dos módulos de segurança industrial mais completos da categoria:

1. **Níveis Numéricos de Segurança (Security Levels 0 a 99):**
   * *Conceito do Manual:* Cada objeto gráfico, botão de comando ou campo de escrita possui um nível mínimo (ex: Nível 0 = Consulta básica; Nível 30 = Operação de bombas; Nível 60 = Calibração de reagentes; Nível 90 = Parametrização PID; Nível 99 = Administração).
   * *Aplicação no PurifyWave:* No nosso editor AntV X6 e sinóptico, podemos atribuir `securityLevel` a cada válvula, célula CDI e bomba. Se o operador logado tiver nível inferior, o comando sequer abre a caixa de diálogo de acionamento.
2. **Política Rígida de Bloqueio de Conta (*Account Lockout Policy* - p. 264–266):**
   * *Conceito do Manual:* Configuração de número máximo de tentativas de login (1 a 10) e tempo de bloqueio (1 a 1440 minutos ou ilimitado).
   * *Aplicação no PurifyWave:* Integrar na tela de login (Imagem 2) o bloqueio da conta após 3 tentativas inválidas de PIN, exigindo liberação manual pelo Administrador (`Disable User Account Lockout`).
3. **Expiração e Política de Senhas (p. 265):**
   * *Conceito do Manual:* Obrigatoriedade de troca de senha no primeiro login (*User must change password at first login*); validade da senha (ex: 30 a 90 dias com lembrete configurável); histórico para proibir reuso das últimas $N$ senhas (*Prevent password reuse*).
   * *Aplicação no PurifyWave:* Implementar no `AuthService` a obrigatoriedade de alteração do PIN no primeiro acesso e controle de histórico de PINs.
4. **Logout Automático por Inatividade (*Auto Logout Time* - p. 263):**
   * *Conceito do Manual:* Tempo configurável (1 a 99 minutos) sem movimentação do mouse ou toques na tela provoca o encerramento automático da sessão.
   * *Aplicação no PurifyWave:* Implementar hook de inatividade na IHM web para evitar que estações de campo fiquem com login aberto quando o operador se afastar do painel.
5. **Rastreabilidade e Trilha de Auditoria com Log ID Sequencial (*Audit Tracking* - p. 42, 481):**
   * *Conceito do Manual:* Cada evento no sistema recebe um `Log ID` sequencial com preenchimento de zeros à esquerda (`Zero Padding`, ex: `000042`), guardando Usuário, Valor Anterior e Valor Novo ($A \to B$).
   * *Aplicação no PurifyWave:* Aperfeiçoar a tabela `historico_auditoria` do Supabase com cadeia de numeração estrita e comparação $A \to B$ de parâmetros de processo alterados.

---

### Pilar 2: Arquitetura de Tags, Variáveis de Sistema e Escalonamento de Engenharia (Capítulo 5.2, p. 95–112)

O modelo de dados do SCADAMaster é centrado em **Tags**:

1. **Tags de Sistema Padronizadas ($SystemTags$ - p. 108–110):**
   * *Conceito do Manual:* Variáveis pré-definidas pelo kernel do SCADA iniciadas e terminadas por `$`:
     - `$CurrentUser$`: Nome/ID do operador logado;
     - `$CurrentUserLevel$`: Nível de segurança ativo;
     - `$LoginUptime$`: Tempo decorrido desde o login;
     - `$CPU_Usage$` e `$Ram_Usage$`: Carga do servidor de automação;
     - `$SystemStatus$` e `$GatewayStatus$`: Saúde da conexão com os PLCs;
     - `$Uptime$`: Tempo de operação contínua da planta em segundos.
   * *Aplicação no PurifyWave:* Criar no nosso motor de telemetria as variáveis de sistema correspondentes para exibição em tempo real na barra de status da IHM e gravação periódica no Supabase.
2. **Propriedades Dinâmicas de Tag (`tag:variable` - p. 110–111):**
   * *Conceito do Manual:* Acesso direto a metadados: `Tag:Maxvalue`, `Tag:Minvalue`, `Tag:Datatype`, `Tag:Desc`, `Tag:Stationname`.
   * *Aplicação no PurifyWave:* Padronizar as tags dos instrumentos (PT-101, FT-101, CT-101, etc.) com metadados unificados para instrumentação ISA-5.1.
3. **Processamento e Escalonamento de Valores (*Value Processing / Scaling* - p. 103–105):**
   * *Conceito do Manual:* Conversão de valor bruto do CLP (*Raw*) para unidade de engenharia (*Engineering Unit*) via função linear:
     $$\text{Valor Engenharia} = \frac{\text{Raw} - \text{RawMin}}{\text{RawMax} - \text{RawMin}} \times (\text{TagMax} - \text{TagMin}) + \text{TagMin}$$
   * *Aplicação no PurifyWave:* O transmissor piezoresistivo de pressão lê registradores 0..10000 e converte matematicamente no gateway para 0.00..5.00 bar com inversão ou swap de bytes configurável (`Data Swap: Byte/Word/DWord`).
4. **Comunicação Cíclica vs. Sob Demanda (*Always Activation* - p. 98, 112):**
   * Tags críticas (interlocks de sobrepressão, paradas de emergência) comunicam continuamente (*Always Activation*); tags de telas secundárias comunicam apenas quando a tela correspondente estiver aberta, economizando banda de rede.

---

### Pilar 3: Motor de Alarmes Avançado e Fila de Sirenes (Capítulo 7.3 e 9.6, p. 190–198, 328–332)

1. **Fila Inteligente de Reprodução de Alarmes Sonoros (*Alarm Playback Queue* - p. 197–198):**
   * *Conceito do Manual:* Quando múltiplos alarmes disparam simultaneamente, o alarme de maior prioridade tem precedência. Se um alarme crítico (ex: Sobrepressão 2,80 bar) ocorrer enquanto toca um alarme informativo, o som antigo é interrompido imediatamente e a sirene de emergência assume o alto-falante.
   * *Aplicação no PurifyWave:* Aperfeiçoar o subsistema de áudio em `NotificationService.ts` com fila de prioridades ISA-18.2 para Web Audio API.
2. **Faixa Rolante de Alarme em Tempo Real (*Scroll Alarm Ticker* - p. 191, 196):**
   * *Conceito do Manual:* Banner animado contínuo no topo/rodapé da tela exibindo as mensagens mais recentes com cores de texto, destaque e velocidade ajustáveis.
   * *Aplicação no PurifyWave:* Substituir banners estáticos por um ticker discreto e elegante com histórico de reconhecimento.
3. **Tabela de Alarmes com Modos Histórico e Tempo Real (p. 328–332):**
   * Filtragem instantânea por Grupo de Equipamento (Bomba, Válvula, Células FTE-CDI), Nível de Severidade (1 a 100) e Estado (*Warning*, *Ack*, *Clear*), com exportação direta para CSV.

---

### Pilar 4: Sistema de Gestão de Receitas de Processo (*Recipes* - Capítulo 7.6, p. 208–214)

Este é um dos recursos mais poderosos do SCADAMaster para plantas físico-químicas de tratamento de água:
* **Conceito do Manual:** Permite criar tabelas de receitas onde um conjunto completo de setpoints é armazenado no banco de dados e transferido em lote (*Batch Write*) para os registradores do CLP quando o operador seleciona a receita.
* **Aplicação no PurifyWave / FTE-CDI:**
  - *Receita 1: Efluente Alta Carga de Fluoreto ($F^- > 12\text{ mg/L}$):* Tensão 1,40 V, Vazão 120 m³/h, Ciclo de Adsorção 1200 s, Dessorção 300 s.
  - *Receita 2: Água de Poço Padrão Portaria 888 ($F^- \approx 4,5\text{ mg/L}$):* Tensão 1,20 V, Vazão 180 m³/h, Ciclo de Adsorção 1800 s, Dessorção 240 s.
  - *Receita 3: Ciclo Rápido de Regeneração:* Tensão 0,00 V, Inversão de Polaridade temporária (-0,50 V), Vazão de Purga 50 m³/h.
  - *Receita 4: Sanitização e Retrolavagem Periódica da Malha Ti/Ru-Ir.*
* **Controle de Escrita Atômica:** O sistema monitora o status de escrita (0 = Concluído, 1 = Pronto, 2 = Gravando) e impede que a planta opere com parâmetros pela metade.

---

### Pilar 5: Agendador de Eventos e Calendário Industrial (*Scheduler* - Capítulo 7.5, p. 201–207)

* **Conceito do Manual:** Motor de agendamento de comandos diários, semanais, mensais ou anuais, com tabela de feriados (*Holiday settings*) para ignorar rotinas em dias não úteis.
* **Aplicação no PurifyWave:**
  - Agendamento da retrolavagem das membranas do skid CONTHEC diariamente às 03:00 (horário de menor demanda da rede);
  - Geração automática e envio de relatório consolidado de conformidade Portaria 888 por e-mail no final de cada turno;
  - Rotina de calibração automática dos eletrodos de pH a cada 7 dias.

---

### Pilar 6: Aquisição de Dados (DAQ), Tendências (Trends) e Relatórios em Excel/PDF (Capítulos 7.1, 7.9 e 9.7, p. 177–184, 249–258, 333–350)

1. **Gráficos de Tendência Multicanais (até 24 penas):**
   * *Recurso:* Eixos Y combinados ou independentes (*Integrated Y-Axis*), amostragem estatística (Mínimo, Média e Máximo por intervalo) para não sobrecarregar a GPU, e linhas de guia (*Guide Lines*) fixas (ex: traço vermelho em 1,50 mg/L de Fluoreto).
2. **Exportação de Relatórios com Template Pré-formatado (*Report Settings* - p. 249–258):**
   * *Recurso:* Preenchimento automático de planilhas Excel (*.xlsx) ou relatórios PDF com cabeçalho da empresa, tabela de dados consolidados e estatísticas de processo (`getAvgValue`, `getMaxValue`, `getMinValue`, `getRunTime`).
   * *Aplicação no PurifyWave:* Emissão automática do Laudo Oficial de Operação diário para atendimento à vigilância sanitária.

---

### Pilar 7: Conectividade Aberta (OPC UA e MQTT - Capítulos 6.2 e 6.4, p. 123–126, 145–158)

* **OPC UA Server / Client (IEC 62541):**
  - O SCADAMaster integra servidor e cliente OPC UA com criptografia Basic256Sha256 e assinatura de mensagens.
* **Broker MQTT Integrado (Mosquitto):**
  - Publicação e subscrição de tópicos com QoS 0, 1 e 2, formatação JSON e suporte a retenção de mensagens (*Retain*).
* **Aplicação no PurifyWave:** Conectar o SCADA tanto a sensores IoT de campo (via MQTT) quanto a sistemas ERP corporativos (SAP, Totvs) via OPC UA.

---

### Pilar 8: Redundância de Servidores e Redes (*Redundancy* - Capítulo 6.7, p. 170–176)

* **Conceito do Manual:** Arquitetura de dois servidores: Primário (*Active*) e Secundário (*Standby*). Se o servidor ativo falhar por hardware ou queda de energia, o secundário assume a comunicação com o CLP e o banco de dados sem desarmar os relés da planta (*Switchover*).
* **Aplicação no PurifyWave:** Redundância entre o servidor local do painel (Edge) e o servidor em nuvem.

---

## 3. Síntese Comparativa: PurifyWave Atual vs. Autonics SCADAMaster

| Capacidade Técnica | Sistema PurifyWave Atual | Recursos Disponíveis no SCADAMaster | Melhoria Recomendada para Implementação |
|:---|:---|:---|:---|
| **Segurança e Login** | Sessão básica local; PIN PBKDF2; RLS em transição | Security Levels 0–99; Account Lockout; Expiração; Auto-logout | Adicionar a tela da Imagem 2 com Account Lockout e Auto-logout por inatividade. |
| **Integridade de Dados** | `storageSeguro.ts` com validação de esquema (alerta `SCD-DAT-001`) | Validação de projeto (*Validation tool*); Data tables tipadas | Flexibilizar `esquemasDados.ts` e normalizar com `PERMISSOES_PADRAO`. |
| **Tags de Sistema** | Variáveis dispersas nos serviços | `$CurrentUser$`, `$CPU_Usage$`, `$SystemStatus$`, etc. | Padronizar variáveis `$SystemTags$` no cabeçalho do SCADA. |
| **Alarmes** | Disparo de alertas e interlock 2,80 bar | Fila sonora com prioridade; Ticker rolante; Tabela com filtro | Adicionar fila de prioridade de áudio e scroll ticker de alarmes. |
| **Receitas de Processo** | Setpoints fixos no código e nos formulários | Módulo de Receitas com transferência em lote para o CLP | Criar painel de Receitas para dosagem e ciclos de adsorção/dessorção. |
| **Agendador** | Rotinas periódicas por `setInterval` | Calendário visual (*Scheduler*) com exceção de feriados | Criar agendador de retrolavagens e relatórios diários. |
| **Protocolos de Rede** | Modbus TCP ativo | Modbus TCP/RTU, OPC UA, MQTT, Redundância de rede | Manter Modbus TCP e planejar conector MQTT e DNP3/OPC UA. |
| **Relatórios** | Extração de laudos laboratoriais via IA | Relatórios automatizados em Excel/PDF com estatísticas | Implementar gerador de relatórios com estatísticas diárias da planta. |

---

## 4. Proposta de Roadmap Integrado e Harmonizado

Harmonizando o **Plano de Correções do Repositório (`PLANO_DE_CORRECOES.txt`)** com os **Melhores Recursos do SCADAMaster (Autonics)** e as **Necessidades do Operador (Imagens 1, 2 e 3)**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ FASE 0: CONTENÇÃO & SEGURANÇA IMEDIATA (PLANO DE CORREÇÕES P0)                  │
│ • Fechar políticas RLS abertas para anon no Supabase                            │
│ • Bloquear escrita anônima em /api/scada/usuarios e usar sessão de servidor    │
│ • Parar sync cego que sobrescreve usuários locais com dados remotos             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FASE 1: SANEAMENTO & HIGIENE DO SISTEMA (IMAGEM 1 + PLANO P1)                   │
│ • Sanar o erro SCD-DAT-001 (canViewSynoptic opcional e defaults de permissões)  │
│ • Limpar os 20 arquivos .rej e configurar .gitignore rigoroso                  │
│ • Restaurar purifywaveIntegrationService.ts legível e tipado (commit da60488)   │
│ • Remover controlador v1 morto e unificar mapa Modbus oficial                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FASE 2: TELA DE LOGIN SUAVE & AUDITORIA CFR 21 (IMAGEM 2 + SCADAMASTER)         │
│ • Criar LoginAuthModal.tsx com Split-View (Ciano/Branco) fiel à Imagem 2       │
│ • Fluxo de solicitação de cadastro com status PENDENTE_APROVACAO no Supabase    │
│ • Painel de aprovação para o Administrador (ADM-001) com liberação de zonas     │
│ • Recursos SCADAMaster: Account Lockout (3 falhas) e Auto-Logout por inatividade│
├─────────────────────────────────────────────────────────────────────────────────┤
│ FASE 3: AMBIENTE DE TRABALHO ADAPTATIVO & RECEITAS (SCADAMASTER + IMAGEM 1)     │
│ • Customizar Toolbar, Árvore de Projeto e Guias por perfil (Operador, Eng, etc.)│
│ • Módulo de Receitas Industriais (transferência em lote de setpoints ao CLP)    │
│ • Fila de prioridade de alarmes sonoros e Ticker rolante no topo                │
│ • Persistência de preferências de tela no Supabase por usuário                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ FASE 4: EXPANSÃO DE TELEMETRIA DISTRIBUÍDA (IMAGEM 3 + DNP3 / MQTT)            │
│ • Módulo de telemetria por exceção compatível com semântica DNP3                │
│ • Ingestão MQTT para sensores IoT remotos de água tratada                      │
│ • Painel de diagnóstico de nós de campo e RTUs remotas                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Próximo Passo

> **Lembrete:** Em cumprimento estrito à sua instrução (*«Não faça nenhuma alteração, somente quando eu autorizar»*), **o código-fonte permaneceu 100% intacto**.

Este relatório fornece a base completa e profissional para embasar suas decisões técnicas.

**Como prefere conduzir os próximos passos?**  
Deseja autorizar a **Fase 0/1 (Contenção de Segurança + Saneamento do Erro SCD-DAT-001 da Imagem 1 e Higiene)** como primeiro pacote de entrega?
