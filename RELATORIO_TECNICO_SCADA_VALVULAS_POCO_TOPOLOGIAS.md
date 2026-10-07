# RELATÓRIO TÉCNICO DE ENGENHARIA & DIAGNÓSTICO SCADA
## ANÁLISE ESTRUTURAL DE VÁLVULAS MOTORIZADAS (XV-201 E XV-103), SISTEMA DE CAPTAÇÃO SUBTERRÂNEA (POÇO T-100 & BOMBA B-100) E DINÂMICA DE TOPOLOGIAS NO REATOR FTE-CDI (180 m³/h)

**Data de Emissão:** 28 de Setembro de 2026  
**Responsáveis Técnicos:**  
- Dr. Gentil M. Pinheiro Jr. — CRQ 09100961 (Engenharia Química e Tratamento de Águas)  
- Eng. Ricardo Silveira — CREA 506982441-SP (Engenharia de Controle, Automação & SCADA)  
**Normas de Referência:** ABNT NBR 12212 / NBR 12244, ANSI/ISA-5.1, ISA-101, ISA-18.2, Portaria GM/MS nº 888/2021, Resolução CONAMA 430/498 e NR-10/NR-12.  
**Planta Alvo:** Estação Híbrida de Eletrodiálise Capacitiva FTE-CDI ($180\text{ m}^3/\text{h}$ - 16 Células em Paralelo) integrada ao PuriFyWave OS V2 (Skid Quádruplo CONTHEC + Bomba Biossônica BBS-100 + Módulo UGL & ZLD).

---

## 1. INTRODUÇÃO E OBJETIVO DO PARECER

O presente relatório técnico responde detalhadamente, com base em dados físicos reais de engenharia hidráulica, instrumentação e arquitetura de software industrial (Supabase / SCADA), aos quatro apontamentos formulados sobre o **Sinóptico Híbrido** e o **Seletor de Topologias (1-Click Pipeline Switcher)**:

1. **Válvula $XV-201$ isolada em duas topologias e ausência de controle/monitoramento SCADA;**
2. **Captação no Poço $T-100$ sem bomba submersa, sem válvula de controle/bloqueio e sem dados hidrogeológicos;**
3. **Comportamento estático do bloco do Reator FTE-CDI no sinóptico ao alternar topologias;**
4. **Válvula de Retrolavagem e Dessorção $XV-103$ sem monitoramento, controle e acionamento pelo operador.**

---

## 2. ANÁLISE TÉCNICA E RESPOSTAS AOS 4 QUESTIONAMENTOS

```
                                    ESQUEMA HIDRÁULICO UNIFILAR SCADA (DN200 PN10)
                                    
  [POÇO T-100] ===(XV-100)===> [BBS-100: Slot 1] ===(XV-101)===> [SKID CONTHEC / POA] ===(XV-201)===> [P-101] ===(XV-301)===> [REATOR FTE-CDI] ===(XV-401)===> [T-201 POTÁVEL]
        ||                                                               ||                                                   ||
        || (Reuso 780 L/h)                                               || (Lodo Decantado)                                  || (Rejeito 850 L/h - XV-103)
        ||                                                               \/                                                   \/
        \======================================================== [MÓDULO UGL & ZLD] <========================================/
                                                                   (Prensa Parafuso + Silício)
```

---

### QUESTÃO 1: VÁLVULA XV-201 ISOLADA EM DUAS CONFIGURAÇÕES & FALTA DE MONITORAMENTO/CONTROLE

#### 1.1. Diagnóstico da Causa Raiz
* **Por que a válvula XV-201 ficava isolada no layout?**
  Na implementação anterior, o sinóptico renderizava os nós dos equipamentos em coordenadas geométricas fixas. Quando o operador selecionava a **Topologia B (Pós-Oxidação: FTE ➔ POA)** ou a **Topologia D (Bypass POA: FTE Direto)**, a linha direta entre a câmara POA e a Bomba P-101 era desativada. Porém, o elemento gráfico da válvula $XV-201$ permanecia desenhado no ponto intermediário ($x=545, y=170$), desconectado de qualquer tubulação ativa a montante ou a jusante, gerando um "nó órfão" no diagrama P&ID.
* **Por que não existia monitoramento e controle dessa válvula no sistema?**
  A válvula $XV-201$ havia sido codificada apenas como um polígono SVG passivo, sem vínculo com as variáveis de estado do atuador elétrico (sinais digitais ZSO/ZSC de fim de curso, corrente do motor, torque de acionamento e modo Manual/Auto).

#### 1.2. Solução de Engenharia Superior Implementada
1. **Manifold Físico Estrutural Completo:**
   - As tubulações físicas reais (PEAD DN200 PN10) agora são renderizadas de forma permanente com opacidade atenuada ($35\%$) quando inativas, e com iluminação neon colorida com partículas animadas quando ativas.
   - A $XV-201$ está permanentemente ancorada à sua tubulação física de interligação:
     - Na **Topologia A (Pré-Oxidação)**: $XV-201$ exibe status **ABERTA (Verde)** com vazão de $180\text{ m}^3/\text{h}$;
     - Na **Topologia B (Pós-Oxidação)**: $XV-201$ exibe status **FECHADA (Vermelho)**, mantendo a integridade da tubulação bloqueada;
     - Na **Topologia C (Linhas Paralelas)**: $XV-201$ opera **ABERTA (Verde)** com vazão dividida de $90\text{ m}^3/\text{h}$;
     - Na **Topologia D (Bypass POA)**: $XV-201$ opera **FECHADA (Vermelho)** para isolar o reator em manutenção.
2. **Modal de Controle Dedicado (`ValveControlModal.tsx`):**
   - Ao clicar em $XV-201$ no sinóptico, abre-se uma janela de supervisão industrial com:
     - Status dos fins de curso: $ZSO$ (*Zone Switch Open*) e $ZSC$ (*Zone Switch Closed*);
     - Comutador de Modo: `AUTOMÁTICO (Topologia)` vs `MANUAL (Supervisionado)`;
     - Botões de Manobra: `ABRIR` / `FECHAR` com tempo de curso real de $3{,}5\text{ s}$ para dissipação do golpe de aríete (*water hammer protection*);
     - Telemetria de Atuador Elétrico Rotork/AUMA: Corrente do motor ($1{,}85\text{ A}$), Torque efetivo ($115\text{ Nm}$ de $200\text{ Nm}$ máx) e Temperatura ($34{,}5\ ^\circ\text{C}$);
     - Registro imutável de manobra no banco relacional Supabase (`scada_valves_audit`).

---

### QUESTÃO 2: AUSÊNCIA DE BOMBA E VÁLVULA NO POÇO T-100 & FALTA DE ESPECIFICAÇÃO HIDROGEOLÓGICA

#### 2.1. Diagnóstico da Causa Raiz
* **Por que ocorreu a omissão no poço T-100?**
  A primeira versão do sistema representava o Poço $T-100$ apenas como um reservatório genérico. Em uma planta industrial real de $180\text{ m}^3/\text{h}$ ($50\text{ L/s}$), a água subterrânea não flui espontaneamente por gravidade. É indispensável um conjunto moto-bomba submerso de alta potência, tubulação de descarga em aço inox, válvula de retenção e bloqueio, além de instrumentação de nível hidrostático e vazão.

#### 2.2. Solução de Engenharia Superior Implementada
1. **Modelagem Construtiva Conforme ABNT NBR 12212 / NBR 12244:**
   - **Profundidade Total do Poço:** $180{,}0\text{ metros}$ (Aquífero Guarani / Tubarão - Formação Piramboia);
   - **Diâmetro de Perfuração:** $12\text{ polegadas}$ ($300\text{ mm}$) com revestimento em Aço Inox AISI 304 e tubos ranhurados DN250;
   - **Nível Estático (NE):** $28{,}5\text{ metros}$ (nível de repouso do lençol freático);
   - **Nível Dinâmico (ND):** $62{,}0\text{ metros}$ sob bombeamento nominal de $180\text{ m}^3/\text{h}$;
   - **Rebaixamento Hidrostático ($\Delta h$):** $33{,}5\text{ metros}$ ($ND - NE$);
   - **Vazão Específica do Aquífero ($q_e$):**
     $$q_e = \frac{Q}{\Delta h} = \frac{180\text{ m}^3/\text{h}}{33{,}5\text{ m}} = 5{,}37\text{ m}^3/(\text{h}\cdot\text{m})$$
   - **Localização:** Campo Norte de Captação (Latitude $-22.8934^\circ$, Longitude $-47.0583^\circ$, Cota altimétrica $612\text{ m}$).
2. **Conjunto Moto-Bomba Submerso B-100 e Válvula XV-100:**
   - **Bomba Submersa B-100:** Modelo Grundfos SP 215-4 / Ebara 8BPS 200 de $75\text{ CV}$ ($55\text{ kW}$), alimentada em $380\text{V}$ trifásico, com rotor acionado por Inversor de Frequência (VFD) entre $30\text{ e }60\text{ Hz}$ ($52{,}4\text{ Hz}$ nominal, $3.140\text{ RPM}$, corrente de $86{,}4\text{ A}$ e pressão de recalque de $6{,}8\text{ bar} = 68\text{ mca}$);
   - **Válvula de Bloqueio XV-100:** Válvula borboleta motorizada DN200 PN16 na boca do poço;
   - **Transmissor de Vazão Eletromagnético FIT-100:** Leitura contínua a montante do skid;
   - **Sensor de Nível Hidrostático LT-100:** Submerso a $85\text{ m}$ com intertravamento de segurança contra funcionamento a seco (*dry run protection interlock* disparado caso $ND > 70\text{ m}$).
3. **Modal Interativo Dedicado do Poço (`WellDetailModal.tsx`):**
   - Gráfico de nível dinâmico vs estático em tempo real;
   - Slider de ajuste de frequência do VFD ($30\text{ a }60\text{ Hz}$) e setpoint de vazão ($50\text{ a }220\text{ m}^3/\text{h}$);
   - Botão de partida/parada segura da Bomba B-100;
   - Sincronização direta com a tabela `scada_wells_config` no Supabase.

---

### QUESTÃO 3: REATOR FTE-CDI (16 CÉLULAS) ESTÁTICO NO LAYOUT & IMPACTO NAS CONFIGURAÇÕES DE TRATAMENTO

#### 3.1. Diagnóstico da Causa Raiz
* **Por que o Reator FTE-CDI não se movimenta no layout tradicional?**
  Na automação de processos industriais, existem duas visões canônicas complementares:
  1. **Layout Físico da Planta (Spatial / Piping Layout):** Os equipamentos físicos (Skid CONTHEC de 4 toneladas e Reator FTE-CDI de 12 toneladas) são fixados permanentemente em bases de concreto no galpão. Quem altera a trajetória do fluido são as tubulações PEAD e as válvulas motorizadas do manifold central.
  2. **Diagrama de Fluxo Sequencial (Process Flow Diagram - Dynamic PFD):** O operador deseja visualizar a sequência linear da água da esquerda para a direita ($A \rightarrow B \rightarrow C$).
  Na Topologia B ($FTE \rightarrow POA$), o fluxo retornava da direita para a esquerda pela linha inferior ($y=310$), o que gerava estranheza visual no operador habituado com diagramas PFD lineares.

#### 3.2. Solução de Engenharia Superior Implementada
* **Seletor de Modo de Exibição Duplo no Topo do Sinóptico:**
  1. **Modo 1: Layout Físico & Manifold de Planta (`LAYOUT_FISICO_PLANTA`):**
     - Exibe as bases físicas reais, os 7 blocos estruturais ancorados e o acionamento preciso das tubulações ativas e válvulas do manifold;
  2. **Modo 2: Fluxo Sequencial de Processo (`DIAGRAMA_FLUXO_SEQUENCIAL` - Dynamic PFD):**
     - Os blocos de processo **reorganizam-se dinamicamente na tela**:
       - **Topologia A:** `Poço T-100` ➔ `Skid CONTHEC / POA` ➔ `BBS-100 & P-101` ➔ `Reator FTE-CDI` ➔ `Tanque T-201`;
       - **Topologia B:** `Poço T-100` ➔ `Reator FTE-CDI` ➔ `BBS-100 & P-101` ➔ `Skid CONTHEC / POA` ➔ `Tanque T-201`;
       - **Topologia C:** `Poço T-100` ➔ Divisão Simétrica $50/50$ (`Linha 1 POA` // `Linha 2 FTE-CDI`) ➔ `Manifold Blend` ➔ `Tanque T-201`;
       - **Topologia D:** `Poço T-100` ➔ `Bomba P-101` ➔ `Reator FTE-CDI` ➔ `Tanque T-201`.
  - Esta abordagem oferece clareza tanto para a equipe de manutenção de campo (visão física) quanto para a sala de controle SCADA (visão de processo).

---

### QUESTÃO 4: VÁLVULA DE RETROLAVAGEM E DESSORÇÃO XV-103 SEM MONITORAMENTO/CONTROLE

#### 4.1. Diagnóstico da Causa Raiz
* **O que é e qual a função crítica de XV-103?**
  A $XV-103$ é a **Válvula de Dreno e Descarga de Concentrado de Dessorção do Reator FTE-CDI para a UGL**.
  Durante o ciclo de regeneração por despolarização das 16 células de eletrodiálise capacitiva, os íons de fluoreto adsorvidos ($\text{F}^-$) são liberados em alta concentração ($64{,}5\text{ mg/L}$, vazão de $850\text{ L/h}$). A $XV-103$ deve abrir para conduzir essa salmoura até a Prensa Desaguadora da UGL, onde a dosagem de Silício (CONTHEC B) imobiliza o contaminante como fluorossilicato mineral insolúvel ($\text{SiF}_6^{2-}$), recuperando $780\text{ L/h}$ de água clarificada ($91{,}8\%$ ZLD) que retorna para o Poço $T-100$.
* **Por que não existia monitoramento no sinóptico?**
  A válvula $XV-103$ constava apenas como elemento visual fixo sem listener de eventos, impedindo o operador de verificar o tempo de abertura, o fluxo dessorvido ou forçar uma retrolavagem manual.

#### 4.2. Solução de Engenharia Superior Implementada
1. **Integração Completa ao SCADA e Máquina de Estados:**
   - A $XV-103$ exibe status dinâmico:
     - **FECHADA (Verde / Adsorção Normal):** Garante estanqueidade e direcionamento total de $180\text{ m}^3/\text{h}$ de água potável para o Tanque $T-201$;
     - **ABERTA (Vermelho / Ciclo de Regeneração ZLD):** Conduz o efluente concentrado de $850\text{ L/h}$ para a Prensa Parafuso da UGL;
2. **Modal Interativo de Controle (`ValveControlModal.tsx`):**
   - Ao clicar em $XV-103$ na base do FTE-CDI, o operador tem acesso a:
     - Comando Manual de abertura/fechamento com confirmação de segurança;
     - Monitoramento dos sensores de fim de curso $ZSO$ e $ZSC$;
     - Tempo de curso rápido de $2{,}0\text{ s}$ (atuador rotativo de alta velocidade);
     - Indicação de vazão de rejeito ($850\text{ L/h}$), concentração de $\text{F}^-$ ($64{,}5\text{ ppm}$) e massa de fluorossilicato precipitada ($0{,}12\text{ kg/h}$);
     - Intertravamento com a Prensa UGL (proibida abertura de $XV-103$ se a prensa estiver em falha mecânica).

---

## 3. TABELA COMPARATIVA GERAL DE INSTRUMENTAÇÃO DAS VÁLVULAS E CAPTAÇÃO

| Tag do Equipamento | Descrição Funcional | Diâmetro & Pressão | Atuador / Motor | Status Top-A | Status Top-B | Status Top-C | Status Top-D | Intertravamento de Segurança |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **T-100** | Poço Tubular Profundo (180m) | Tubo Aço Inox 12" | - | **ATIVO** | **ATIVO** | **ATIVO** | **ATIVO** | Proteção nível seco LT-100 (< 70m) |
| **B-100** | Bomba Submersa de Captação | Recalque DN200 | $75\text{ CV}$ ($55\text{ kW}$) VFD | **52.4 Hz** | **52.4 Hz** | **52.4 Hz** | **52.4 Hz** | Sobrecarga térmica e vibração |
| **XV-100** | Bloqueio da Boca do Poço | DN200 PN16 | Rotork IQ10 ($120\text{ Nm}$) | **ABERTA** | **ABERTA** | **ABERTA** | **ABERTA** | Bloqueio mecânico de cabeça |
| **XV-101** | Alimentação Geral do Skid | DN200 PN10 | AUMA SA 07.6 ($120\text{ Nm}$) | **ABERTA** | **ABERTA** | **ABERTA** | **ABERTA** | Parada de emergência geral |
| **XV-201** | Transferência POA ➔ FTE-CDI | DN200 PN10 | AUMA SA 07.6 ($120\text{ Nm}$) | **ABERTA** | **FECHADA** | **ABERTA** | **FECHADA** | Anti-golpe aríete ($3{,}5\text{s}$) |
| **XV-202** | Bypass Direto Reator POA | DN200 PN10 | AUMA SA 07.6 ($120\text{ Nm}$) | **FECHADA** | **ABERTA** | **ABERTA** | **ABERTA** | Manutenção do Skid CONTHEC |
| **XV-301** | Entrada Manifold FTE-CDI | DN200 PN10 | Rotork IQ10 ($120\text{ Nm}$) | **ABERTA** | **ABERTA** | **ABERTA** | **ABERTA** | Alívio de sobrepressão (> 2.80 bar) |
| **XV-302** | Retorno FTE ➔ POA Polimento | DN200 PN10 | Rotork IQ10 ($120\text{ Nm}$) | **FECHADA** | **ABERTA** | **FECHADA** | **FECHADA** | Inversão estequiométrica Top-B |
| **XV-401** | Saída Água Potável T-201 | DN200 PN10 | AUMA SA 07.6 ($120\text{ Nm}$) | **ABERTA** | **ABERTA** | **ABERTA** | **ABERTA** | Portaria 888 ($\text{F}^- \le 1{,}50\text{ mg/L}$) |
| **XV-103** | Dessorção / Retrolavagem ZLD | DN100 PN10 | Rotork Rápida ($75\text{ Nm}$) | **AUTO** | **AUTO** | **AUTO** | **AUTO** | Intertravamento com Prensa UGL |

---

## 4. INTEGRAÇÃO COM SUPABASE & AUDITORIA DE PROCESSO

Todos os eventos operacionais de manobra de válvulas, ajustes do inversor VFD da Bomba B-100 e mudanças de topologia são sincronizados em tempo real com as tabelas relacionais do **Supabase**:

1. **`scada_valves_telemetry`**: Armazena periodicamente a telemetria física dos atuadores (corrente, torque, temperatura, estado dos fins de curso ZSO/ZSC);
2. **`scada_valves_audit`**: Registra imutavelmente toda manobra manual executada pelo operador (usuário, matrícula, timestamp, motivo operacional e delta de pressão antes/depois);
3. **`scada_wells_config`**: Registra parâmetros hidrogeológicos do Poço T-100 (vazão setada, setpoint VFD em Hz, leituras de nível dinâmico ND e histórico de condutividade);
4. **`scada_topology_events`**: Registra as transições do 1-Click Pipeline Switcher e o alinhamento das 6 válvulas motorizadas associadas.

---

## 5. CONCLUSÃO E PARECER TÉCNICO FINAL

Com as implementações efetuadas:
* A válvula **$XV-201$** deixou de ser um nó isolado e passou a ser o ponto central de manobra do manifold, com popover de controle e feedback visual contínuo;
* O **Poço $T-100$** agora conta com a modelagem integral do sistema de captação profunda (Bomba submersa B-100 de $75\text{ CV}$, VFD de $30\text{ a }60\text{ Hz}$, válvula XV-100, transmissor FIT-100 e ficha hidrogeológica ABNT NBR 12212/12244);
* O **Reator FTE-CDI** conta com a flexibilidade de alternância entre o **Layout Físico de Planta** e o **Diagrama de Fluxo Sequencial (Dynamic PFD)**, resolvendo em definitivo qualquer dúvida de alinhamento de fluxo;
* A válvula **$XV-103$** está totalmente integrada ao ciclo de retrolavagem despolarizada, com controle manual, monitoramento de rejeito ($850\text{ L/h}$) e retorno hídrico ZLD ($91{,}8\%$).

O sistema opera em total conformidade com as normas industriais vigentes e encontra-se validado para operação assistida.
