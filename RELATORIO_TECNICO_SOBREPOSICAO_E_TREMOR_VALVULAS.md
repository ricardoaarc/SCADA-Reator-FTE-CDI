# RELATÓRIO TÉCNICO DE ENGENHARIA & DIAGNÓSTICO SCADA
## ANÁLISE DE SOBREPOSIÇÃO ESPACIAL DE ELEMENTOS E INSTABILIDADE DINÂMICA (TREMOR / HOVER JITTER LOOP) EM VÁLVULAS MOTORIZADAS SVG

**Data:** 28 de Setembro de 2026  
**Status do Projeto:** Aguardando Autorização do Operador para Aplicação de Código  
**Responsáveis Técnicos:**  
- Dr. Gentil M. Pinheiro Jr. — CRQ 09100961 (Engenharia Química e Tratamento de Águas)  
- Eng. Ricardo Silveira — CREA 506982441-SP (Engenharia de Automação, SCADA & IHM Industrial)  
**Normas de Referência:** ANSI/ISA-101 (Human-Machine Interfaces for Process Automation Systems), W3C SVG 2.0 Specification & CSS Transforms Level 2.

---

## 1. INTRODUÇÃO E OBJETIVO

A partir da imagem capturada pelo operador na tela do sistema **SCADA Industrial FTE-CDI / PuriFyWave OS V2**, foram identificadas duas não-conformidades de interface gráfica e ergonomia visual:
1. **Sobreposição Espacial de Elementos:** Colisão física entre a Válvula de Transferência $XV-201$, a Bomba Biossônica $BBS-100$, a Bomba de Transferência $P-101$ e as células inferiores do Reator FTE-CDI com a Válvula $XV-103$;
2. **Instabilidade Dinâmica (Tremor / Vibração de Alta Frequência):** Oscilação contínua e rápida das válvulas motorizadas quando o cursor do mouse passa ou clica sobre elas.

O presente documento detalha as causas raízes matemáticas e computacionais desses dois fenômenos e apresenta o plano técnico estruturado para resolução, sem efetuar alterações no código até expressa autorização do usuário.

---

## 2. DIAGNÓSTICO DETALHADO DAS CAUSAS RAÍZES

```
                        DIAGRAMA DE COLISÃO NO VÃO INTERMEDIÁRIO (x: 430 a 760 px)
                        
   [Skid CONTHEC] --------(x: 480)-------- [BBS-100: x: 525] --------(x: 565)-------- [Reator FTE-CDI]
   (Termina em 430)         XV-201         Telemetria (487 a 563)       P-101          (Inicia em 760)
                             ||                     ||                   ||
                             \====== SOBREPOSIÇÃO ==/\=== SOBREPOSIÇÃO ==/
```

### 2.1. Causa Raiz da Sobreposição de Elementos

#### A) Vão Intermediário: $XV-201$ vs. $BBS-100$ vs. $P-101$
* **Coordenadas Reais no Código Atual (`HybridSynopticView.tsx`):**
  - O bloco do **Skid CONTHEC** está posicionado em $x=190\text{ px}$ com largura de $240\text{ px}$, terminando na coordenada $x = 430\text{ px}$.
  - A válvula **$XV-201$** está ancorada na coordenada $x = 480\text{ px}$, com rótulo descritivo e status em $y = 168 + 42 = 210\text{ px}$.
  - A **Bomba Biossônica $BBS-100$** (quando selecionada no Slot 2 Intermediário) é calculada na posição $posX = 525\text{ px}, posY = 155\text{ px}$.
  - A carcaça acústica da $BBS-100$ possui largura de $50\text{ px}$ ($x = 500\text{ a }550\text{ px}$) e sua caixa de telemetria inferior possui largura de $76\text{ px}$ ($x = 487\text{ a }563\text{ px}$).
  - A **Bomba $P-101$** está localizada em $x = 565\text{ px}$ (raio de $20\text{ px}$, ocupando de $x = 545\text{ a }585\text{ px}$).
* **Mecanismo de Colisão:**
  - A distância entre o centro de $XV-201$ ($x = 480$) e o centro de $BBS-100$ ($x = 525$) é de apenas $45\text{ px}$. Como a caixa de telemetria da $BBS-100$ estende-se até $x = 487\text{ px}$, ela invade o espaço físico da válvula $XV-201$.
  - O texto `XV-201 ABERTA` colide diretamente com o painel de leitura de RPM e kHz da $BBS-100$.
  - Da mesma forma, a extremidade direita da telemetria da $BBS-100$ ($x = 563\text{ px}$) encosta no círculo da Bomba $P-101$ ($x = 565\text{ px}$).
  - Embora existam $330\text{ px}$ disponíveis entre o Skid ($x=430$) e o FTE-CDI ($x=760$), os 3 equipamentos foram agrupados em um espaço de apenas $85\text{ px}$.

#### B) Base do FTE-CDI: Válvula $XV-103$ vs. Células Inferiores
* **Coordenadas Reais no Código:**
  - O Reator FTE-CDI possui um grid 4x4 de células. A 4ª linha de células (`CEL-13` a `CEL-16`) fica em $y = 150\text{ px}$ e altura de $30\text{ px}$, terminando em $y = 180\text{ px}$.
  - A válvula **$XV-103$** foi posicionada em $y = 192\text{ px}$, com o texto do rótulo `XV-103 ➔ UGL` em $y = 192 - 4 = 188\text{ px}$.
  - O texto do rótulo da válvula colide com a base inferior das células `CEL-14` e `CEL-15`, enquanto a tubulação de dreno fica prensada contra o rodapé técnico em $y = 234\text{ px}$.

---

### 2.2. Causa Raiz do "Tremor / Vibração" das Válvulas ao Passar ou Clicar com o Mouse

O comportamento de tremor de alta frequência ($60\text{ a }120\text{ Hz}$) relatado pelo operador decorre da combinação de três fatores técnicos:

#### 1. Loop de Retroalimentação Infinita de Hover (Hover Thrashing Loop)
* No código de `HybridSynopticView.tsx`, as válvulas estão envolvidas na seguinte classe CSS:
  ```html
  <g transform="translate(480, 168)" className="cursor-pointer hover:scale-110 transition-all filter drop-shadow-md" onClick={...}>
  ```
* Em elementos SVG vetoriais, a propriedade CSS `transform: scale(1.1)` não possui centro de gravidade fixo automático se não forem definidos explicitamente `transform-box: fill-box` e `transform-origin: center`.
* **O Ciclo de Vibração:**
  1. O ponteiro do mouse cruza a borda do polígono da válvula;
  2. O navegador ativa a pseudo-classe `:hover` e dispara a animação CSS para aumentar a escala em $110\%$;
  3. Ao expandir a partir da origem do grupo SVG, a geometria do elemento se desloca fisicamente de posição no espaço de renderização;
  4. Com o deslocamento instantâneo da aresta, o ponto sob as coordenadas atuais do mouse deixa de pertencer ao polígono preenchido da válvula;
  5. O navegador detecta a saída do cursor e desativa o `:hover` imediatamente (`mouseleave`);
  6. Ao desativar o `:hover`, a válvula retorna ao tamanho $100\%$ original;
  7. Retornando ao tamanho original, as coordenadas sob o mouse voltam a coincidir com o polígono, disparando novamente o `:hover` (`mouseenter`);
  8. Esse ciclo se repete indefinidamente a cada quadro de renderização da GPU ($60\text{ vezes por segundo}$), gerando o efeito visual de **tremor / vibração violenta**.

#### 2. Geometria Fragmentada da Válvula Borboleta P&ID
* O símbolo vetorial da válvula borboleta é desenhado através de um polígono em forma de ampulheta:
  ```html
  <polygon points="0,0 20,20 20,0 0,20" />
  ```
* Essa forma geométrica é composta por dois triângulos opostos que se tocam em um único vértice central de **1 pixel** em `(10, 10)`.
* As áreas superior e inferior entre as abas do triângulo são espaços vazios transparentes (`no-fill`).
* Quando o operador posiciona o cursor próximo ao centro para clicar, qualquer micro-movimento manual do mouse entra e sai das áreas vazias, disparando múltiplos eventos de `mouseenter` e `mouseleave` (efeito *bouncing* de eventos).

#### 3. Interrupção de Transição CSS durante Re-renderização no Click
* Ao clicar na válvula, o React dispara a abertura do modal (`ValveControlModal`) e altera o estado do componente.
* A re-renderização do nó DOM interrompe abruptamente a curva de interpolação da transição `transition-all`, provocando saltos de quadro e travamentos gráficos (*layout thrashing*).

---

## 3. PLANO DE ENGENHARIA PROPOSTO (PARA APROVAÇÃO DO OPERADOR)

Para eliminar definitivamente tanto as sobreposições quanto o tremor das válvulas, propõe-se a seguinte intervenção arquitetural:

### 3.1. Rebalanceamento do Grid Vetorial (Eliminação de Sobreposições)
1. **Zona Intermediária com Distribuição Equidistante:**
   - Skid CONTHEC: Início em $x = 180$, término em $x = 410\text{ px}$ (largura $230\text{ px}$);
   - Válvula $XV-201$: Fixada em $x = 470\text{ px}$;
   - Bomba Biossônica $BBS-100$ (Slot 2): Fixada em $x = 560\text{ px}$ (garantindo **$90\text{ px}$ livres** de isolamento em relação à $XV-201$);
   - Bomba $P-101$: Fixada em $x = 655\text{ px}$ (garantindo **$95\text{ px}$ livres** em relação à $BBS-100$);
   - Válvula $XV-301$: Fixada em $x = 730\text{ px}$;
   - Reator FTE-CDI: Fixado a partir de $x = 790\text{ px}$ até $x = 1080\text{ px}$.
2. **Descompressão Vertical do Reator FTE-CDI:**
   - Aumentar a altura total do reator de $245\text{ px}$ para $270\text{ px}$;
   - Posicionar a Válvula $XV-103$ em $y = 212\text{ px}$, criando uma distância livre de $32\text{ px}$ abaixo da linha 3 das células (`CEL-13` a `CEL-16`), e posicionando o rodapé técnico em $y = 250\text{ px}$.

### 3.2. Eliminação do Tremor das Válvulas (Padrão ISA-101)
1. **Hitbox Retangular Invisível Dedicada:**
   - Inserir dentro de cada grupo de válvula um retângulo invisível de captura de eventos:
     ```html
     <rect x="-10" y="-10" width="40" height="40" fill="transparent" pointerEvents="all" />
     ```
   - Essa hitbox contínua elimina os vazios do polígono da ampulheta e estabiliza 100% dos eventos de clique do mouse.
2. **Substituição de `hover:scale-110` por Efeito de Brilho Estático:**
   - Remover `hover:scale-110 transition-all` que provoca o ciclo de tremor;
   - Implementar realce luminoso elegante e estável via borda e sombra estática:
     ```css
     hover:stroke-white hover:brightness-125 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]
     ```
   - Isso proporciona feedback visual nítido ao operador sem alterar a geometria ou posição do elemento.

---

## 4. STATUS DE EXECUÇÃO

Em cumprimento estrito à instrução do operador (*"Não faça nenhuma alteração, somente quando eu autorizar"*), **nenhum arquivo de código foi alterado nesta etapa**. 

Este relatório técnico fica disponível para sua conferência, validação e autorização para execução.
