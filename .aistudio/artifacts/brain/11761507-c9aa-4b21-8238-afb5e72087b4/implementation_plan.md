# Plano de Implementação: Módulos Avançados de Automação SCADA FTE-CDI (Paridade 100% com SCADA-LTS & Rapid SCADA v6)

Plano mestre em 3 fases para equipar o sistema SCADA FTE-CDI com motor de expressões matemáticas em tempo real, disparador de alarmes multicanal externo e gateway de comunicação física de campo integrado ao Supabase.

---

### Decisões Críticas e Preferências do Usuário

> [!IMPORTANT]
> A implementação foi dividida em 3 fases modulares e incrementais, garantindo que o sistema continue funcionando perfeitamente em cada etapa sem quebrar a operação do reator ou a emissão de laudos oficiais da Portaria GM/MS nº 888/2021.

* **Banco de Dados Central:** **Supabase / PostgreSQL** para armazenamento de telemetria, configurações de canais calculados, logs de alarmes e fila de mensagens.
* **Segurança e Interlocks:** Todos os módulos respeitam a trava de segurança de corte hidráulico ($P > 2{,}8\text{ bar}$) e normas NR-10/NR-12.
* **Acessibilidade:** 100% compatível com a interface web responsiva (Desktop, Tablet e Smartphone).

---

## 1. Visão Geral das 3 Fases de Implementação

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA DAS 3 FASES DE EVOLUÇÃO                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   FASE 1: Motor de Tags Virtuais & Fórmulas Matemáticas (Meta Data Points)             │
│   ├── Editor de expressões matemáticas em tempo real no navegador                      │
│   ├── Validador de sintaxe com teste de valor instantâneo                              │
│   └── Persistência no Supabase e injeção automática na Watchlist e Gráficos           │
│                                                                                        │
│   FASE 2: Central de Alertas e Notificações Externas Multicanal                        │
│   ├── Configuração de canais de despacho (Telegram Bot, E-mail SMTP, Webhook)         │
│   ├── Roteamento de prioridade ISA-18.2 (Informativo, Atenção, Interlock Crítico)      │
│   └── Botão de disparo de teste e log de confirmação de entrega                       │
│                                                                                        │
│   FASE 3: Gateway de Conexão Física a PLCs & Barramento de Campo                      │
│   ├── Mapeador visual de registradores Modbus TCP / RTU (Coils, Holding Registers)     │
│   ├── Script exportável de ponte industrial (Python / Node-RED) para IPC/Raspberry Pi  │
│   └── Sincronização bidirecional via Supabase Realtime (WebSockets)                    │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento Fase a Fase

### FASE 1: Motor de Tags Virtuais e Fórmulas Matemáticas em Tempo Real
* **Objetivo:** Permitir que o operador crie canais calculados dinamicamente sem alterar código-fonte.
* **Componentes e Recursos:**
  1. **Nova Aba ou Painel "Fórmulas & Tags Virtuais":**
     - Lista de tags calculadas cadastradas;
     - Seletor de tags de entrada (ex: `PT-101`, `PT-102`, `FT-101`, `F_IN`, `F_OUT`);
     - Editor de expressão com suporte a operadores aritméticos (`+`, `-`, `*`, `/`, `^`), funções matemáticas (`Math.abs`, `Math.sqrt`, `Math.max`, `Math.min`) e condicionais ternários (`P > 2.0 ? 1 : 0`);
     - Campo de unidade de engenharia (ex: `bar`, `L/h`, `%`, `m³/h`, `kW`);
     - Testador de expressão em tempo real (*Live Preview* com os valores atuais da planta).
  2. **Persistência no Supabase:**
     - Tabela `scada_formula_tags` para salvar nome, expressão, unidade, limiares de alarme e autor da fórmula.
  3. **Integração no Ecossistema SCADA:**
     - A tag calculada aparece automaticamente na **Watchlist de Tags**, no seletor de canetas dos **Gráficos de Tendência** e pode ser vinculada a caixas de texto do **Sinóptico P&ID**.

---

### FASE 2: Central de Alertas e Notificações Externas Multicanal
* **Objetivo:** Enviar avisos instantâneos para o celular do operador/supervisor quando ocorrerem interlocks ou desvios de potabilidade.
* **Componentes e Recursos:**
  1. **Painel "Configuração de Notificações":**
     - Cadastro de canais: Telegram (Token do Bot e Chat ID), Webhook genérico (para WhatsApp API / Discord / PagerDuty) e E-mail de Notificação;
     - Matriz de disparo por severidade:
       - *Nível 1 (Informativo):* Registro apenas em log local;
       - *Nível 2 (Atenção / Aviso):* Notificação silenciosa por mensagem;
       - *Nível 3 (Interlock / Emergência):* Alerta imediato com som no celular, indicação da tag violada e timestamp exato.
  2. **Regras de Silenciamento e Histerese:**
     - Prevenção de "tempestade de mensagens" (*Alarm Flood*), permitindo configurar tempo mínimo entre notificações do mesmo alarme (ex: 5 minutos).
  3. **Ferramenta de Diagnóstico:**
     - Botão "Enviar Alarme de Teste" para validar conectividade imediata com o Telegram/Webhook.

---

### FASE 3: Gateway de Conexão Física a PLCs e Barramento de Campo
* **Objetivo:** Estabelecer a ponte física entre os Controladores Lógicos Programáveis (Siemens, Schneider, Rockwell, WEG, ESP32 industrial) e a nuvem Supabase.
* **Componentes e Recursos:**
  1. **Mapeador de Registradores Industriais (Memory Map View):**
     - Tabela de mapeamento visual exibindo o tipo de registrador Modbus:
       - `00001 - 09999` (Coils - Relés de bombas e válvulas);
       - `10001 - 19999` (Discrete Inputs - Sensores de fim de curso e status de disjuntores);
       - `30001 - 39999` (Input Registers - Sensores analógicos 4-20mA de pressão e vazão);
       - `40001 - 49999` (Holding Registers - Setpoints de tensão DC e temporizadores de retrolavagem).
  2. **Gerador de Script de Gateway de Campo (Field Gateway Pack):**
     - Código completo em **Python (`pymodbus` + `supabase-py`)** e fluxo pronto para **Node-RED**;
     - O script roda em um Raspberry Pi / IPC industrial na planta, lê os PLCs via cabo RS-485 ou Ethernet Modbus TCP (porta 502) e sincroniza as tags com o Supabase em intervalos de 500ms a 2000ms.
  3. **Indicador de Status do Link Físico:**
     - Indicador visual no cabeçalho do SCADA (`LINK HARDWARE: ONLINE / OFFLINE`) calculando o *Heartbeat* do gateway de campo.

---

## 3. Estrutura de Telas e Navegação

```
[ BARRA SUPERIOR DO SCADA FTE-CDI ]
 ├── [Status Planta] [Operador] [Laudos & PDF] [Console Alarmes] [Link Hardware Status]
 └── [ABAS DE OPERAÇÃO]:
      ├── 1. Visão Geral (16 Células)
      ├── 2. Sinóptico P&ID (Animado)
      ├── 3. Watchlist Tags
      ├── 4. Gráficos de Tendência
      ├── 5. Portaria GM/MS 888 (Laudos A4)
      ├── 6. Retrolavagem & CIP
      ├── 7. Manifold PEAD (Teste T4)
      ├── 8. Fórmulas & Tags Virtuais (NOVO - FASE 1)
      ├── 9. Alertas & Notificações Externas (NOVO - FASE 2)
      └── 10. Gateway & Barramento Modbus (NOVO - FASE 3)
```

---

## 4. Plano de Verificação e Testes

1. **Teste de Fórmulas Dinâmicas:**
   - Criar uma fórmula de teste: `(PT101 - PT102) * 10.197` (diferencial de pressão convertido para metros de coluna d'água $mca$);
   - Validar se o cálculo é reavaliado a cada ciclo de amostragem sem latência perceptível.
2. **Teste de Notificação de Alarme:**
   - Disparar um alarme de teste simulando pressão de $2{,}85\text{ bar}$ e verificar o disparo do payload para o canal configurado.
3. **Teste de Integridade do Banco:**
   - Verificar a persistência e recuperação das fórmulas e configurações no Supabase.
4. **Verificação de Compilação & Lint:**
   - Executar `tsc --noEmit` e `npm run build` para garantir zero erros de tipagem TypeScript.
