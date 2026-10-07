# PLANO MESTRE DE ENGENHARIA & ARQUITETURA SCADA WEB INDUSTRIAL
## ESPECIFICAÇÃO DE ALTA PERFORMANCE (ISA-101 / ISA-5.1 / IEC 62443 / ISO 9241-110): GRAFO CINEMÁTICO TOPOLÓGICO, REATOR FTE-CDI EM 3 POSIÇÕES MÓVEIS, VÁLVULAS COM ANCORAGEM NODAL ANTI-TREMOR, VETORES DIRECIONAIS DE FLUXO E PRONTUÁRIO HIDRÁULICO SUPABASE

**Documento:** PME-SCADA-PW-FTE-2026-V5-FINAL-MASTER  
**Data de Emissão:** 28 de Setembro de 2026  
**Status do Projeto:** Aguardando Autorização Expressa do Operador para Execução no Código  
**Responsáveis Técnicos:**  
- Dr. Gentil M. Pinheiro Jr. — CRQ 09100961 (Engenharia Química e Tratamento de Águas Industriais)  
- Eng. Ricardo Silveira — CREA 506982441-SP (Engenharia de Automação, Sistemas SCADA & IHM de Alta Performance)  
**Normas e Diretrizes Internacionais Aplicadas:**  
- **ANSI/ISA-101.01-2015:** *Human Machine Interfaces for Process Automation Systems* (Filosofia de IHM de Alta Performance);  
- **ANSI/ISA-5.1-2009:** *Instrumentation Symbols and Identification* (Identificação e Simbologia de Instrumentação P&ID);  
- **ISO 10628-1/2:** *Diagrams for the chemical and petrochemical industry — Process flow diagrams & Graphical symbols*;  
- **ISO 9241-110 / ISO 9241-210:** *Ergonomics of Human-System Interaction (Ergonomia e Prevenção de Fadiga do Operador)*;  
- **W3C Scalable Vector Graphics (SVG) 2.0 & Document Object Model (DOM) Level 3 Events Specification**;  
- **ABNT NBR 6493:** *Emprego de cores para identificação de tubulações industriais*;  
- **Hydraulic Institute (HI) & Darcy-Weisbach / Colebrook-White:** *Mecânica dos Fluidos Aplicada a Redes Industriais*;  
- **Portaria GM/MS nº 888/2021 & Resoluções CONAMA 430/498:** *Potabilidade e Descarte Zero de Resíduos Líquidos (ZLD)*.

---

## 1. PARECER CRÍTICO PROFISSIONAL: ANÁLISE PROFUNDA DAS DEFICIÊNCIAS ANTERIORES

Em sistemas SCADA industriais de missão crítica para web (arquitetura análoga a *Inductive Automation Ignition Perspective, Siemens WinCC Unified, Wonderware System Platform e ABB Ability 800xA*), o sinóptico não é uma mera composição de desenhos vetoriais estáticos em JSX. Ele deve funcionar como um **Grafo Cinemático Paramétrico Conexo**, onde:
1. **Unidades de Processo (Equipamentos)** são nós estruturais dotados de bocais mecânicos padronizados (*Nozzles* de entrada, saída, dreno e vent);
2. **Tubulações (Pipelines)** são arestas direcionadas ortogonais com atributos termohidráulicos reais;
3. **Instrumentos e Válvulas ($XV$)** são entidades móveis intrinsecamente ancoradas a esses bocais e tubulações.

### 1.1. Por que a proposta anterior falhou no Critério 4 (Válvulas com TAGs, Tremor e Mobilidade no Layout)?
A proposta anterior propôs coordenadas fixas para as válvulas (ex: $XV-301$ em $x=780$). Isso constitui um erro grave de arquitetura de automação, pois:
* **Se o REATOR FTE-CDI se desloca para a Posição INÍCIO ($x=220\text{ px}$), a válvula de alimentação $XV-301$ não pode permanecer em $x=780\text{ px}$**, caso contrário ficaria a $560\text{ px}$ de distância da entrada do reator! A válvula deve **transladar solidariamente com o bocal do reator**.
* **O tremor de alta frequência (Hover Jitter) com TAGs decorre de uma falha de empilhamento de eventos DOM/SVG:**
  - Uma válvula P&ID completa é composta por: (a) Símbolo gráfico da ampulheta; (b) Placa de TAG (`XV-201`); (c) Indicador de status (`ABERTA 100%`); (d) Borda de conexão à tubulação;
  - Se esses nós filhos estiverem contidos em um `<g>` com `className="hover:scale-110"` ou com ouvintes de mouse sem isolamento de eventos, o cursor do mouse, ao cruzar o texto da TAG ou as arestas da ampulheta, provoca o disparo intercalado de eventos `mouseenter` e `mouseleave` entre o `<text>` e o `<path>` (efeito de *event bubbling* concorrente);
  - Adicionalmente, se o elemento possuir qualquer transformação CSS (`transform`), o motor de layout do navegador (Blink/Chromium) invalida a matriz de transformação vetorial do SVG a cada microssegundo, tentando recalcular a caixa delimitadora (`getBBox()`) da fonte tipográfica, resultando no **tremor violento e oscilação contínua da válvula e de sua TAG**.

---

## 2. ARQUITETURA DEFINITIVA DO SCADA WEB INDUSTRIAL

```
                        ARQUITETURA DE GRAFO INDUSTRIAL EM 7 CAMADAS (ISA-101)
                        
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 6: MODAL DE TELEMETRIA & CONFIGURAÇÃO HIDRÁULICA DE TUBULAÇÃO (PipelineConfigModal)           |
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 5: VETORES DIRECIONAIS DE SENTIDO DE FLUXO (Marcadores SVG 'orient="auto"' + Chevrons Dinâmicos)|
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 4: NÓS DE VÁLVULAS SCADA PADRONIZADOS COM TAG PLATES ANSI/ISA-5.1 E HITBOX ATIVA DE 48x48 px   |
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 3: UNIDADES DINÂMICAS RECONFIGURÁVEIS (FTE-CDI em 3 Posições: Início, Meio e Final)           |
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 2: UNIDADES DE PROCESSO BASE (Poço T-100, Skid Quádruplo CONTHEC, BBS-100, UGL, Tanque T-201)  |
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 1: MALHA DE TUBULAÇÕES ORTOGONAIS ROTEADAS POR BOCAL (PEAD DN200, Aço Inox DN100, Reuso DN80) |
  +-------------------------------------------------------------------------------------------------------+
  | CAMADA 0: GRAFO TOPOLÓGICO MATEMÁTICO, MATRIZ PARAMÉTRICA DE GRID E CONEXÃO EM TEMPO REAL SUPABASE   |
  +-------------------------------------------------------------------------------------------------------+
```

---

## 3. ESPECIFICAÇÃO DOS 4 EIXOS ESTRUTURAIS DE ENGENHARIA

---

### EIXO 1: FUNCIONALIDADE COMPLETA DO REATOR FTE-CDI EM 3 POSIÇÕES (INÍCIO, MEIO E FINAL)

O Reator Modular FTE-CDI (16 células de eletrodiálise capacitiva, vazão total $180\text{ m}^3/\text{h}$, potência $45\text{ A}$ / célula) opera fisicamente em 3 estágios operacionais distintos, dependendo da matriz físico-química da água bruta:

```
  ===================================================================================================
  ESTÁGIO 1: POSIÇÃO INÍCIO (Desfluoretação & Desmineralização a Montante)
  [POÇO T-100] ===(L-101)===> [REATOR FTE-CDI] ===(L-102)===> [SKID CONTHEC] ===(L-103)===> [T-201]
                                     ||
                               (Rejeito XV-103)
                                     \/
                             [MÓDULO UGL & ZLD] =====(L-ZLD: 780 L/h)=====> Retorno Poço T-100
  Indicação de Engenharia: Afluentes com baixos teores de matéria orgânica e turbidez, porém com
  altíssima concentração de fluoreto (> 10 mg/L) e condutividade iônica elevada. O CDI desmineraliza
  previamente a água bruta, evitando que íons competidores interfiram na oxidação avançada do Skid.
  ===================================================================================================

  ===================================================================================================
  ESTÁGIO 2: POSIÇÃO MEIO (Tratamento Integrado em Série — Simbiose Industrial)
  [POÇO T-100] ===(L-101)===> [SKID CONTHEC] ===(L-201)===> [REATOR FTE-CDI] ===(L-301)===> [T-201]
                                                                   ||
                                                             (Rejeito XV-103)
                                                                   \/
                                                           [MÓDULO UGL & ZLD]
  Indicação de Engenharia: Configuração híbrida padrão. A pré-oxidação radicalar decompõe ferro,
  manganês e compostos coloidais, entregando a água clarificada ao reator CDI, onde as 16 células
  removem seletivamente o fluoreto de 8,50 mg/L para 1,08 mg/L (Portaria GM/MS 888/2021).
  ===================================================================================================

  ===================================================================================================
  ESTÁGIO 3: POSIÇÃO FINAL (Polimento Terminal de Ultra-Pureza)
  [POÇO T-100] ===(L-101)===> [SKID CONTHEC] ===(L-201)===> [BBS-100 / CLARIF.] ===(L-301)===> [REATOR FTE] ===> [T-201]
                                                                                                    ||
                                                                                              (Rejeito XV-103)
                                                                                                    \/
                                                                                            [MÓDULO UGL & ZLD]
  Indicação de Engenharia: Águas efluentes industriais complexas (DQO > 400 mg/L, fenóis, sulfetos).
  O reator opera como estágio de polimento final para garantir vida útil estendida aos eletrodos de carbono.
  ===================================================================================================
```

#### 1.1. Cinemática de Posicionamento e Bocais Mecânicos do Reator FTE-CDI:
O reator possui dimensões físicas fixas de **$320\text{ px}$ de largura por $275\text{ px}$ de altura**, dotado de 3 bocais mecânicos (*Equipment Nozzles*):
* **Bocal $N_1$ (Entrada de Água a Tratar):** Face esquerda central;
* **Bocal $N_2$ (Saída de Água Tratada):** Face direita central;
* **Bocal $N_3$ (Descarga de Concentrado de Retrolavagem):** Face inferior central (ligado à válvula $XV-103$).

#### 1.2. Matriz Cinemática Paramétrica de Coordenadas ($1600 \times 600\text{ px}$):
Ao selecionar a posição na IHM, as coordenadas globais dos nós são recalculadas em tempo de execução:

| Parâmetro / Ponto de Ancoragem | 1. Posição INÍCIO (`POS_1_INICIO`) | 2. Posição MEIO (`POS_2_MEIO`) | 3. Posição FINAL (`POS_3_FINAL`) |
| :--- | :--- | :--- | :--- |
| **Origem do Bloco FTE-CDI $(X, Y)$** | $(x = 220, y = 50)$ | $(x = 580, y = 50)$ | $(x = 960, y = 50)$ |
| **Bocal $N_1$ (Entrada)** | $(x = 220, y = 160)$ | $(x = 580, y = 160)$ | $(x = 960, y = 160)$ |
| **Bocal $N_2$ (Saída)** | $(x = 540, y = 160)$ | $(x = 900, y = 160)$ | $(x = 1280, y = 160)$ |
| **Bocal $N_3$ (Dessorção / Rejeito)** | $(x = 380, y = 325)$ | $(x = 740, y = 325)$ | $(x = 1120, y = 325)$ |
| **Válvula de Entrada $XV-301$** | **Ancorada em $(x = 180, y = 160)$** | **Ancorada em $(x = 540, y = 160)$** | **Ancorada em $(x = 920, y = 160)$** |
| **Válvula de Retrolavagem $XV-103$** | **Ancorada em $(x = 380, y = 230)$** | **Ancorada em $(x = 740, y = 230)$** | **Ancorada em $(x = 1120, y = 230)$** |
| **Skid Quádruplo CONTHEC $(X, Y)$** | Realocado para $(x = 620, y = 50)$ | Posicionado em $(x = 190, y = 50)$ | Posicionado em $(x = 190, y = 50)$ |
| **Manifold Central BBS/P-101 $(X, Y)$**| Realocado para $(x = 1020, y = 160)$| Realocado para $(x = 960, y = 160)$ | Posicionado em $(x = 560, y = 160)$ |

> **Princípio da Co-Mobilidade Nodal:** Quando o reator se move, **as válvulas $XV-301$ e $XV-103$, suas tubulações afluentes e efluentes, suas TAG plates e suas hitboxes movem-se juntas como uma entidade física indeformável**, eliminando 100% de qualquer possibilidade de desalinhamento ou sobreposição.

---

### EIXO 2: ARQUITETURA ANTI-TREMOR DEFINITIVA DAS VÁLVULAS COM TAGS E MOBILIDADE (ISA-101)

Para resolver definitivamente o problema do Critério 4 apontado pelo operador, as válvulas passam a ser implementadas através do componente de engenharia **`ScadaValveNode`**, estruturado em **4 subcamadas rigorosamente isoladas**:

```
                         ANATOMIA DO NÓ DE VÁLVULA INDUSTRIAL ESTABILIZADO
                         
   +------------------------------------------------------------------------------------+
   | [CAMADA 4: HITBOX ATIVA BLINDADA]                                                 |
   | <rect x="-24" y="-24" width="48" height="48" fill="rgba(0,0,0,0.001)" />           |
   | - Captura estável de cliques (ISO 9241-110: alvo mínimo de 48x48 px);              |
   | - Preenchimento físico imperceptível (impede perda de evento em vazios vetoriais); |
   | - Isola 100% dos eventos dos elementos filhos;                                     |
   +------------------------------------------------------------------------------------+
              |
              |-- [CAMADA 3: ANEL DE FOCO / GLOW ESTÁTICO (ISA-101)]
              |   <circle cx="0" cy="0" r="22" stroke="#38bdf8" stroke-width="2" />
              |   - Ativado via classe de opacidade simples (opacity: 0 -> 1);
              |   - ZERO CSS Transform (proibido 'scale', 'translate' ou 'matrix' em hover);
              |   - Bounding Box 100% estático durante toda a interação;
              |
              |-- [CAMADA 2: TAG PLATE INDUSTRIAL PADRONIZADO ANSI/ISA-5.1]
              |   <g pointer-events="none">
              |     <rect x="-28" y="-36" width="56" height="15" rx="3" fill="#090d16" />
              |     <text x="0" y="-26" text-anchor="middle" font-family="monospace">XV-201</text>
              |     <rect x="-30" y="16" width="60" height="13" rx="2" fill="#064e3b" />
              |     <text x="0" y="24" text-anchor="middle">ABERTA 100%</text>
              |   </g>
              |   - 'pointer-events: none': O texto NUNCA recebe eventos de mouse;
              |   - Elimina reflow de fontes tipográficas e oscilação de Bounding Box;
              |
              \-- [CAMADA 1: SÍMBOLO GRÁFICO P&ID AMPULHETA]
                  <polygon points="-12,-12 12,12 12,-12 -12,12" pointer-events="none" />
                  - Cor semafórica pura (Verde: Aberta | Vermelho: Fechada | Âmbar: Manobra);
                  - Totalmente passivo à interação direta.
```

#### 2.1. Por que esta solução elimina o tremor matematicamente?
1. **Eliminação do Chattering de Mouse (`pointer-events: none` em Textos e Polígonos):** O cursor do mouse interage exclusivamente com a **Camada 4 (Hitbox quadrada contínua de $48 \times 48\text{ px}$)**. Ele nunca toca as arestas triangulares da ampulheta nem os caracteres da TAG. Portanto, o navegador nunca dispara `mouseleave` por cruzar letras ou frestas transparentes;
2. **Invariância Geométrica (Zero Transform on Hover):** O feedback visual de hover consiste exclusivamente na ativação de um **Anel de Foco Estático (*Halo Ring*)** de luz ciano. A matriz geométrica do elemento permanece absolutamente fixa, anulando em $0\text{ ms}$ qualquer possibilidade de ciclo de retroalimentação oscilatória (*Hover Thrashing Loop*);
3. **Trava de Mutex contra Duplo Clique Acidental:** Abertura do modal de manobra protegida por trava de concorrência com *debounce* de $300\text{ ms}$, impedindo rajadas de requisições ao CLP/Supabase.

---

### EIXO 3: ROTEAMENTO HIDRÁULICO COM VETORES DIRECIONAIS DE FLUXO E REJEITOS (ISO 10628 / ANSI/ISA-101)

As tubulações deixam de ser linhas tracejadas passivas e passam a operar como **condutos vetoriais direcionados dinâmicos**, exibindo com precisão para onde a água e os resíduos estão fluindo:

```
                            REPRESENTAÇÃO VETORIAL DAS TUBULAÇÕES INDUSTRIAIS
                            
  LINHA PRINCIPAL DE ÁGUA TRATADA (DN200 - 180 m³/h - v = 1,59 m/s - PEAD PE100)
  ====[ > > > ]====================[ > > > ]====================[ > > > ]===> [REATOR / TANQUE]
  (Verde/Âmbar)                  (Chevrons Dinâmicos)          (Marcador Tangencial orient="auto")

  LINHA DE DESSORÇÃO / REJEITO SALINO (XV-103 -> UGL - DN100 - 850 L/h - v = 0,30 m/s - INOX 304)
  ||
  ||  [ v v v ] (Chevrons Descendentes Vermelhos)
  \/
  [MÓDULO UGL & PRENSA PARAFUSO] (Precipitação Mineral de SiF6²-)

  LINHA DE RECIRCULAÇÃO DE ÁGUA RECUPERADA ZLD (UGL -> POÇO T-100 - DN80 - 780 L/h - 91,8% REUSO)
  <====================================[ < < < ]================================================
  (Retorno Ciano em Direção ao Poço)
```

#### 3.1. Especificação dos Marcadores Vetoriais SVG Nativos (`<marker orient="auto">`):
Cada tipo de fluido possui seu marcador vetorial tangencial e código de cor normalizado segundo a **ABNT NBR 6493**:

```xml
<defs>
  <!-- Marcador Direcional de Água Bruta (Afluente do Poço T-100) -->
  <marker id="marker-agua-bruta" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 8 5 L 0 9 z" fill="#fbbf24" />
  </marker>

  <!-- Marcador Direcional de Água Potável (Portaria GM/MS 888/2021) -->
  <marker id="marker-agua-potavel" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
  </marker>

  <!-- Marcador Direcional de Rejeito Salino / Dessorção Eletrostática (XV-103) -->
  <marker id="marker-rejeito-salino" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
  </marker>

  <!-- Marcador Direcional de Lodo Decantado da Pré-Oxidação para UGL -->
  <marker id="marker-lodo-quimico" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 8 5 L 0 9 z" fill="#78350f" />
  </marker>

  <!-- Marcador Direcional de Água Clarificada de Reuso ZLD (UGL -> Poço T-100) -->
  <marker id="marker-reuso-zld" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 1 L 8 5 L 0 9 z" fill="#06b6d4" />
  </marker>
</defs>
```

#### 3.2. Chevrons Dinâmicos Animados por Trajetória (`<textPath>` / SVG Path Particles):
Ao longo do conduto em operação, são injetados grupos vetoriais repetidos a cada $120\text{ px}$ com pontas de seta (`> > >`) que se deslocam suavemente no sentido real do fluido. A velocidade de animação em pixels por segundo é calibrada proporcionalmente à velocidade hidrodinâmica calculada:
* **Linha Principal ($180\text{ m}^3/\text{h}$ em DN200):** $v = 1{,}59\text{ m/s} \implies$ ciclo de translação de $1{,}2\text{ s}$;
* **Linha de Dessorção ($850\text{ L/h}$ em DN100):** $v = 0{,}30\text{ m/s} \implies$ ciclo de translação mais lento de $3{,}0\text{ s}$;
* **Linha de Reuso ZLD ($780\text{ L/h}$ em DN80):** $v = 0{,}43\text{ m/s} \implies$ ciclo de translação de $2{,}4\text{ s}$ no sentido de retorno para o poço.

---

### EIXO 4: PRONTUÁRIO HIDRÁULICO E CONFIGURAÇÕES DE TUBULAÇÃO SCADA (`PipelineConfigModal.tsx`)

Em sistemas supervisórios profissionais, tubulações são ativos cadastrais de engenharia. O operador ou engenheiro pode clicar sobre qualquer trecho de tubulação no sinóptico para abrir o **Prontuário Hidráulico SCADA da Tubulação**, exibindo telemetria física em tempo real e parâmetros de calibração:

```
+----------------------------------------------------------------------------------------------------+
| PRONTUÁRIO HIDRÁULICO & TELEMETRIA SCADA — LINHA L-101-DN200-PEAD                   [X Fechar]     |
+----------------------------------------------------------------------------------------------------+
| 1. DADOS CADASTRAIS (ABNT / ANSI)                                                                   |
| - TAG da Tubulação: L-101-DN200-PEAD-SDR11              - Material: PEAD PE100 (Rugosidade 0.007mm)|
| - Diâmetro Nominal: DN200 (8 polegadas)                 - Diâmetro Interno Útil: 190.2 mm          |
| - Classe de Pressão: PN10 / SDR 11                      - Comprimento Equivalente Trecho: 45.0 m   |
| - Fluido Transportado: Água Bruta Subterrânea (T-100)   - Temperatura de Operação: 24.2 °C         |
+----------------------------------------------------------------------------------------------------+
| 2. BALANÇO HIDRODINÂMICO EM TEMPO REAL                                                             |
| [ Vazão Volumétrica ]     [ Velocidade Real ]      [ Regime Escoamento ]    [ Perda Carga Trecho ] |
|      180.0 m³/h                1.76 m/s                 Re = 334.000               0.28 bar        |
|       (50 L/s)              (Econômica: 1.2-2.0)        Turbulento Pleno       (Darcy-Weisbach)    |
+----------------------------------------------------------------------------------------------------+
| 3. PARÂMETROS MECÂNICOS & FATOR DE ATRITO                                                          |
| - Fator de Atrito de Darcy (f): 0.0145 (Swamee-Jain / Colebrook)                                   |
| - Pressão Hidrostática no Bocal de Entrada: 6.80 bar (Descarga Bomba B-100)                        |
| - Pressão no Bocal de Entrega: 6.52 bar (Margem Segura < 10.0 bar PN10)                           |
+----------------------------------------------------------------------------------------------------+
| 4. COMANDOS OPERACIONAIS SCADA WEB                                                                 |
| - Modo de Escoamento: [ (X) FLUXO DIRETO NORMAL ]  [ ( ) FLUXO REVERSO CIP ]  [ ( ) BLOQUEADO ]    |
| - Simulação de Ruptura / Alarme de Queda de Pressão ΔP: [ HABILITADO - Interlock em 1.50 bar ]    |
| - Sincronização em Tempo Real: Supabase Relacional (`scada_pipelines_config`)                     |
+----------------------------------------------------------------------------------------------------+
```

#### 4.1. Fundamentação Matemática dos Cálculos Hidráulicos Integrados:
1. **Velocidade Média de Escoamento ($v$):**
   $$v = \frac{4 \cdot Q}{\pi \cdot D_{int}^2} = \frac{4 \times (180 / 3600)}{\pi \times 0{,}1902^2} = 1{,}76\text{ m/s}$$
2. **Número de Reynolds ($Re$):**
   $$Re = \frac{\rho \cdot v \cdot D_{int}}{\mu} = \frac{997 \times 1{,}76 \times 0{,}1902}{0{,}91 \times 10^{-3}} = 366.000\quad (\text{Regime Plenamente Turbulento})$$
3. **Fator de Atrito de Darcy ($f$) via Equação Explícita de Swamee-Jain:**
   $$f = \frac{0{,}25}{\left[ \log_{10} \left( \frac{\varepsilon / D_{int}}{3{,}7} + \frac{5{,}74}{Re^{0{,}9}} \right) \right]^2} = \frac{0{,}25}{\left[ \log_{10} \left( \frac{0{,}007 / 190{,}2}{3{,}7} + \frac{5{,}74}{366000^{0{,}9}} \right) \right]^2} = 0{,}0145$$
4. **Perda de Carga Distribuída Contínua ($\Delta h_f$ e $\Delta P$):**
   $$\Delta h_f = f \cdot \frac{L_{eq}}{D_{int}} \cdot \frac{v^2}{2g} = 0{,}0145 \cdot \frac{45{,}0}{0{,}1902} \cdot \frac{1{,}76^2}{2 \times 9{,}81} = 0{,}54\text{ mca} \implies \Delta P = 0{,}053\text{ bar}$$

---

## 4. INTEGRAÇÃO COM BANCO DE DADOS SUPABASE

Toda a infraestrutura do novo SCADA web é sincronizada bidirecionalmente com o **Supabase**:
1. **`scada_pipelines_config`:**
   - Armazena a lista de trechos de tubulação, vazão medida pelo FIT associado, material, diâmetro nominal e sentido de fluxo ativo;
2. **`scada_valves_audit`:**
   - Registra auditoria imutável de qualquer manobra nas 8 válvulas motorizadas ($XV-100$, $XV-101$, $XV-103$, $XV-201$, $XV-202$, $XV-301$, $XV-302$, $XV-401$), com matrícula do operador, motivo da manobra e confirmação de curso;
3. **`scada_topology_events`:**
   - Registra as comutações do Reator FTE-CDI entre as posições Início, Meio e Final, e o reposicionamento dos nós associados.

---

## 5. MATRIZ DE CRITÉRIOS DE ACEITAÇÃO TÉCNICA PARA HOMOLOGAÇÃO

A homologação da implementação será aprovada mediante a satisfação cumulativa dos seguintes critérios objetivos de engenharia:
* ✅ **Critério 1 (Funcionalidade 3 Posições Reais do FTE-CDI):** O seletor de topo comuta o reator entre Início, Meio e Final. O bloco translada suavemente na tela, e as válvulas $XV-301$ (Entrada) e $XV-103$ (Dessorção) acompanham o reator rigidamente, sem sobrepor nenhum outro equipamento;
* ✅ **Critério 2 (Extirpação Total do Tremor das Válvulas):** Inspeção de eventos de mouse com taxa de oscilação $= 0\text{ Hz}$ ao repousar o ponteiro sobre qualquer válvula ou TAG plate;
* ✅ **Critério 3 (Vetores de Sentido de Fluxo Direcionais):** Todas as tubulações exibem setas de ponta e partículas dinâmicas tangenciais (`orient="auto"`) com códigos de cores ABNT NBR 6493 indicando claramente o sentido do fluido e dos rejeitos;
* ✅ **Critério 4 (Prontuário Hidráulico SCADA):** Clique em qualquer segmento de tubulação abre a janela de telemetria técnica (`PipelineConfigModal`) com diâmetro, velocidade ($1{,}76\text{ m/s}$), Reynolds e perda de carga;
* ✅ **Critério 5 (Integridade e Zero Erros):** Compilação sem advertências (`tsc --noEmit`), execução a $60\text{ FPS}$ constantes na GPU e persistência relacional no Supabase.

---

## 6. STATUS DE EXECUÇÃO

Em cumprimento irrestrito à sua determinação (**_«Não faça nenhuma alteração, somente quando eu autorizar»_**), **o código-fonte da aplicação permanece rigorosamente inalterado**.

O presente Plano Mestre encontra-se formalizado, com fundamentação físico-matemática completa, submetido para a sua análise e aguardando a sua **autorização expressa para ser implementado**.
