# RELATÓRIO TÉCNICO DE ENGENHARIA — ANÁLISE DE LAYOUT P&ID, RESOLUÇÃO DE SOBREPOSIÇÕES E ARQUITETURA DE MODAIS INTERATIVOS (CONTHEC & UGL/ZLD)

> **Data de Emissão:** 28 de Setembro de 2026  
> **Status:** Diagnóstico Concluído & Plano de Engenharia Estruturado  
> **Sistema Supervisório:** SCADA Reator FTE-CDI 180 m³/h + PuriFyWave OS V2 (Skid CONTHEC & UGL ZLD)  
> **Responsáveis Técnicos:** Dr. Gentil M. Pinheiro Jr. (CRQ 09100961) e Eng. Ricardo Silveira (CREA 506982441-SP)

---

## 1. Contexto e Diagnóstico a partir da Imagem do Operador (`image.png`)

A análise minuciosa da captura de tela da IHM em tempo real revelou 3 pontos críticos de experiência do usuário (UX/SCADA) e geometria vetorial:

```
[POÇO T-100] ───> [PURIFYWAVE CONTHEC] [BBS-100 SOBREPOSTO! XV-201 SOBREPOSTO!] ──> [FTE-CDI (16 Células)] ──> [T-201]
                                                    │
                                                    ▼
                                            [UGL & ZLD (NÃO ABRE)]
```

---

## 2. Respostas Técnicas Aprofundadas para as 3 Questões

### 2.1. Questão 1: Sobreposição no Quadro de Topologia / Sinóptico P&ID

#### A. Diagnóstico Geométrico:
1. **Colisão BBS-100 com o Reator CONTHEC e Válvula XV-201:**
   - O reator PuriFyWave está posicionado de $x = 160$ até $x = 370$ (largura 210px);
   - A Bomba Biossônica BBS-100 foi desenhada em $x = 395$, com largura total de badge de 76px (estendendo-se de $x = 357$ até $x = 433$), invadindo a carcaça do reator à esquerda e sobrepondo a válvula XV-201 ($x = 420$) e a sucção da Bomba P-101 ($x = 460$);
2. **Colisão da Válvula XV-103 no Reator FTE-CDI:**
   - A válvula de retrolavagem XV-103 está desenhada em $y = 202$ com texto descritivo sobrepondo o rodapé técnico `1.40 V DC | Interlock 2.80 bar | PEAD DN200` posicionado em $y = 215$;
3. **Limitação de Espaço do ViewBox ($1080 \times 500\text{ px}$):**
   - O espaço horizontal total de $1080\text{ px}$ está excessivamente adensado para acomodar 7 blocos funcionais com folgas de isolamento normativo (ISA-5.1).

#### B. Solução de Engenharia Recomendada:
- **Expansão do ViewBox para $1380 \times 520\text{ px}$ com Distribuição Espacial Proporcional:**
  - **Poço T-100:** $x = 20$ (largura 55px);
  - **Skid CONTHEC / Reator POA:** $x = 150$ a $380$ (largura 230px);
  - **Zona Intermediária de Tubulação DN200 (Respiro de 190px):**
    - *BBS-100 (Slot Intermediário):* $x = 465$, $y = 155$ (área livre sem qualquer sobreposição);
    - *Válvula Motorizada XV-201:* $x = 545$, $y = 155$;
    - *Bomba Centrífuga P-101:* $x = 600$, $y = 155$;
  - **Reator FTE-CDI (16 Células):** $x = 720$ a $980$ (largura 260px, altura 235px);
  - **Válvula XV-103 de Retrolavagem:** $y = 218$, com rodapé reposicionado em $y = 236$;
  - **Tanque Potável Final T-201:** $x = 1100$ a $1175$ (largura 75px);
  - **Módulo UGL & ZLD:** $x = 430$ a $660$, $y = 330$ a $470$ (largura 230px, altura 140px).

---

### 2.2. Questão 2: Por que o bloco "PuriFyWave OS V2 - SKID CONTHEC" não abre ao clicar?

#### A. Diagnóstico de Código:
No arquivo `src/components/HybridSynopticView.tsx`, o elemento SVG do reator (`<g transform="translate(160, 50)">`) foi codificado como um conjunto puramente estático de `<rect>` e `<text>`, sem manipulador `onClick`, sem estado de abertura de modal e sem a classe de cursor de ponteiro (`cursor-pointer`).

#### B. Solução de Engenharia:
1. **Interatividade Tátil no Sinóptico SVG:**
   - Adicionar `className="cursor-pointer hover:opacity-90 transition-all"` e evento `onClick={() => setModalConthecAberto(true)}`;
2. **Criação do Modal Interativo `ConthecDetailModal.tsx`:**
   - Visualização expandida em alta resolução dos **Frascos CONTHEC A (500 mL), B (220 mL) e C (220 mL)**;
   - Sliders táteis de precisão para dosagem individual em $mL/h$;
   - Monitoramento do tempo de reação in-situ na **Câmara de Pré-Mistura** ($240\text{ s}$);
   - Controle do **4º Injetor de Diluição em Água** ($L/h$, $ppm$ e $bar$);
   - Botão de **Reabastecimento e Calibração Automática** com 1 clique;
   - Sincronização em tempo real com o banco de dados **Supabase**.

---

### 2.3. Questão 3: Por que o "Módulo UGL & ZLD" não abre ao clicar?

#### A. Diagnóstico de Código:
Similarmente ao Skid CONTHEC, o grupo SVG `<g transform="translate(370, 310)">` do Módulo UGL & ZLD carece de evento `onClick` e de modal especializado.

#### B. Solução de Engenharia:
1. **Interatividade no Sinóptico SVG:**
   - Adicionar `className="cursor-pointer hover:opacity-90 transition-all"` e evento `onClick={() => setModalUglZldAberto(true)}`;
2. **Criação do Modal Interativo `UglZldDetailModal.tsx`:**
   - Instrumentação completa da **Prensa Parafuso Desaguadora** (rotação da rosca, torque e rendimento %);
   - Monitoramento de umidade da torta ($< 25\%$ para atendimento ao **CONAMA 498 / Biossólido Agrícola**);
   - Balanço de massa da imobilização mineral de **fluorossilicatos ($\text{SiF}_6^{2-}$)** a partir do Silício reativo;
   - Controle da vazão de recirculação de água clarificada ($780\text{ L/h}$) retornando para o Poço $T-100$ ($91{,}8\%$ de recuperação hídrica);
   - Monitoramento da inibição de odores $\text{H}_2\text{S}$ (ausência de putrefação);
   - Registro de histórico e auditoria no **Supabase**.

---

## 3. Matriz de Ações e Próximos Passos

| Etapa | Componente Afetado | Ação de Engenharia |
| :--- | :--- | :--- |
| **Ação 1** | `src/components/HybridSynopticView.tsx` | Expansão do viewBox para `1380x520`, rebalanceamento de coordenadas dos 7 blocos e eliminação total das sobreposições. |
| **Ação 2** | `src/components/ConthecDetailModal.tsx` | Criação do modal completo de controle, dosagem e reabastecimento do Skid CONTHEC Quádruplo. |
| **Ação 3** | `src/components/UglZldDetailModal.tsx` | Criação do modal completo de monitoramento da Prensa UGL, desaguamento, biossólidos e circuito ZLD. |
| **Ação 4** | `src/components/HybridSynopticView.tsx` | Acoplamento dos eventos `onClick` nos blocos SVG e renderização condicional dos novos modais. |
| **Ação 5** | `contexto.md` & Compilação | Atualização da documentação e validação de compilação com zero erros. |
