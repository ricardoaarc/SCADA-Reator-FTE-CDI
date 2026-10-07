# RELATÓRIO TÉCNICO & PROPOSTA DE ENGENHARIA DE IHM SCADA
## ANÁLISE DE IMPLEMENTAÇÃO DOS DOIS MODELOS DE NAVEGAÇÃO: MENU HORIZONTAL COM OVERFLOW INTELIGENTE (IMAGEM 2) E MENU VERTICAL RETRÁTIL (IMAGEM 3) MANTENDO A CONFIGURAÇÃO PADRÃO IDEAL DO P&ID (IMAGEM 1)

**Documento:** RT-ENG-IHM-NAV-2026-V2 (Definitivo)  
**Data:** 28 de Setembro de 2026  
**Status:** ✅ IMPLEMENTADO COM SUCESSO NO SISTEMA (Plano de Ação em 4 Etapas 100% Concluído)  
**Equipe Responsável:**  
- Eng. Ricardo Silveira — CREA 506982441-SP (Engenharia de Automação, Sistemas SCADA & Arquitetura de Software Industrial)  
- Dr. Gentil M. Pinheiro Jr. — CRQ 09100961 (Engenharia de Processos & Tratamento de Águas Industriais)  
**Normas Regulamentadoras e Diretrizes Técnicas:**  
- **ANSI/ISA-101.01-2015:** *Human Machine Interfaces for Process Automation Systems (Filosofia de Navegação de Alta Performance, Prevenção de Fadiga do Operador e Hierarquia de 4 Níveis de IHM)*;  
- **ISO 9241-110 / ISO 9241-210:** *Ergonomia da Interação Humano-Sistema — Princípios de Diálogo e Design Centrado no Usuário*;  
- **IEC 62443-2-4:** *Segurança Cibernética Industrial — Controle de Acesso por Papel (RBAC) e Rastreabilidade de Sessão*;  
- **Nielsen Norman Group (NN/g):** *Enterprise Navigation Systems, Responsive Mega-Menus and Adaptive Overflow Patterns*.

---

## 1. VALIDAÇÃO FORMAL DA OBSERVAÇÃO DO OPERADOR (IMAGEM 1 — CONFIGURAÇÃO PADRÃO IDEAL)

A captura de tela enviada na **Imagem 1** representa com absoluta fidelidade a **Configuração Ideal e Padrão da Planta Híbrida**, fruto da evolução rigorosa das fases anteriores:

```
                            CONFIGURAÇÃO PADRÃO IDEAL DO SISTEMA SCADA (IMAGEM 1)
                            
  [POÇO T-100] ===(XV-100)===> [BBS-100 (BIO) + P-101] ===(XV-301)===> [REATOR FTE-CDI (MEIO)] ===(XV-101)===> [SKID CONTHEC (FINAL)] ===(XV-201)===> [T-201 POTÁVEL]
   (MANANCIAL PURO)               (CAVITAÇÃO 28.5 kHz)                       (16 CÉLULAS / 180 m³/h)                (POLIMENTO & DESINFECÇÃO)              (PORTARIA 888 OK)
   (ISOLADO 100%)                                                                    || (XV-103)                            || (L-LODO: 150 L/h)
                                                                                     \/                                     \/
                                                                           +---------------------------------------------------------+
                                                                           |       MÓDULO UGL & CIRCUITO ZLD (CO-TRATAMENTO)         |
                                                                           |   Rejeito CDI (850 L/h) + Purga CONTHEC ➔ CaSiF₆↓       |
                                                                           |   Desaguamento Lodo: 89.4% | Umidade Torta: 17.8%       |
                                                                           +---------------------------------------------------------+
                                                                                                        || (780 L/h Clarificado Recuperado)
                                                                                                        \/
                                                                           +---------------------------------------------------------+
                                                                           |             TANQUE DE REUSO T-102 (5 m³)                |
                                                                           |   🛡️ CIRCUITO FECHADO ZLD ISOLADO DO POÇO T-100         |
                                                                           |   - Lavagem Tela Prensa: 400 L/h                        |
                                                                           |   - Diluição Reagentes CONTHEC: 380 L/h                 |
                                                                           +---------------------------------------------------------+
```

### 1.1. Constatações da Configuração Ideal (Imagem 1)
1. **Topologia de Processo Fixada como Padrão de Inicialização (*Default Boot State*):**
   - **Poço T-100:** Operação em captação pura a montante, com bomba $B-100$ ($75\text{ CV} / 52.4\text{ Hz}$), sem qualquer linha de retorno da UGL;
   - **Estágio Cavitacional Nodal:** Bomba Biossônica $BBS-100$ ($2.850\text{ RPM} / 28.5\text{ kHz}$) e Bomba Centrífuga $P-101$ operando no trecho de homogeneização primária;
   - **Reator Modular FTE-CDI:** Posicionado no **MEIO** (`POS_2_MEIO`), processando os $180\text{ m³/h}$ através das 16 células com válvula de dessorção $XV-103$ na base conectada à UGL;
   - **Skid Quádruplo CONTHEC:** Posicionado no **FINAL** (`POS_3_FINAL`), atuando como polimento oxidativo terminal, passivação e garantia residual de potabilidade antes da entrega no Tanque $T-201$;
   - **Circuito Fechado ZLD (Solução 1B):** Clarificado da Prensa Parafuso UGL ($780\text{ L/h}$) encaminhado exclusivamente para o **Tanque de Reuso T-102 ($5\text{ m³}$)**, que recircula $400\text{ L/h}$ para a lavagem contínua da tela e $380\text{ L/h}$ para a diluição do CONTHEC, garantindo Descarte Zero e blindagem sanitária irrefutável ao aquífero.

**Garantia de Projeto:** Esta configuração homologada na Imagem 1 permanecerá intacta como o estado nominal padrão do sinóptico físico. As melhorias de navegação (Imagens 2 e 3) serão projetadas para envelopar e valorizar essa arquitetura de processo.

---

## 2. RESPOSTA DIRETA À PERGUNTA 1

> **Pergunta:** *"É possível implementar de forma profissional para o sistema conforme os dois modelos de menus (Imagem 2 menu horizontal, e imagem 3 menu vertical)?"*

### **Resposta Técnica Conclusiva: SIM, É 100% POSSÍVEL, PROFISSIONAL E ALTAMENTE RECOMENDADO.**

Mais do que apenas possível, a arquitetura moderna de software SCADA Web (padrão *Inductive Automation Ignition Perspective*, *Siemens WinCC Unified* e plataformas SaaS industriais de ponta como a apresentada nas referências "Coordonly") adota exatamente um **Mecanismo Híbrido Adaptativo de Navegação (*Dual Navigation Engine*)**.

Isso significa que o sistema pode:
1. Oferecer o **Menu Horizontal com Overflow Inteligente (Modelo Imagem 2)**;
2. Oferecer o **Menu Vertical Retrátil em Árvore (Modelo Imagem 3)**;
3. Permitir que o operador alterne entre os dois modelos com **1 clique** na barra de ferramentas ou configure o modelo preferido no seu perfil de usuário, salvando essa preferência no banco de dados **Supabase**.

---

## 3. ANÁLISE DE ENGENHARIA DE IHM: MODELO 1 — MENU HORIZONTAL RESPONSIVO (IMAGEM 2)

A **Imagem 2** apresenta o design system de uma barra horizontal contemporânea (*Top Navigation Bar*) com gerenciamento avançado de hierarquia e espaço vertical.

```
+--------------------------------------------------------------------------------------------------------------------------------------+
| [Logo SCADA] | [Sinóptico Híbrido] | Processo v | Equipamentos v | Manobras v | Laudos v | Mais v | [🔔 3] | [Carlos Mendes (Sup) v] |
+--------------------------------------------------------------------------------------------------------------------------------------+
```

### 3.1. Componentes Estruturais do Menu Horizontal
1. **Identidade Visual e Breadcrumb Nodal (Esquerda):**
   - Logo estilizado do FTE-CDI / PuriFyWave com indicação dinâmica de status de conexão em tempo real (Supabase Online / WebSocket Ativo);
2. **Abas Principais em "Pill" de Alta Evidência (Centro):**
   - O item ativo (ex.: `Sinóptico Híbrido`) recebe fundo sólido de destaque (ex.: azul elétrico `#2563eb` ou índigo vibrante `#4f46e5`) com texto branco e cantos arredondados (`rounded-xl`), garantindo identificação instantânea conforme a norma ISA-101;
3. **Menus Suspensos com Submenus Agrupados (*Mega-Dropdowns*):**
   - Ao clicar ou passar o mouse sobre itens como `Processo v` ou `Equipamentos v`, abre-se um popover flutuante com bordas suaves, fundo escuro translúcido com *backdrop-blur*, contendo:
     * Ícones contextuais para cada módulo;
     * Descrições resumidas da função da tela;
     * Badges numéricos com contadores de alarmes ativos naquele subsistema (ex: `Reator FTE-CDI [1 Alerta]`, `Skid CONTHEC [Normal]`);
4. **Mecanismo de Overflow Preditivo (*Adaptive Overflow More Menu*):**
   - Em telas largas ($\ge 1440\text{ px}$): Todos os itens principais aparecem lado a lado no menu horizontal;
   - Em telas médias/intermediárias ($1120\text{ a }1439\text{ px}$): Os módulos de menor prioridade ou telas acessórias (ex: Histórico de Laudos, Calibração, Configuração Geral) migram automaticamente para o menu suspenso **"Mais..."** (`More v`), impedindo a quebra de linha feia ou o surgimento de barra de rolagem horizontal indesejada;
   - Em telas compactas ($< 1120\text{ px}$): O menu entra em modo compacto com ícones e expansão por toque;
5. **Painel de Utilidades e Perfil do Supervisor (Direita):**
   - Ícone de sino com badge numérico de alertas não reconhecidos;
   - Avatar do operador com nome, cargo (`SUPERVISOR`), botão de parada rápida e dropdown contendo:
     * *Meus Logs de Auditoria*;
     * *Parâmetros do Sistema*;
     * *Alternar para Menu Vertical*;
     * *Assinatura Digital de Laudos*;
     * *Logout Seguro*.

### 3.2. Vantagens do Menu Horizontal para o SCADA FTE-CDI
* **Liberação Total da Largura Horizontal:** O Sinóptico P&ID (Canvas de $1800\text{ px}$) ganha $100\%$ da largura útil da tela sem divisões laterais, permitindo visualizar toda a cadeia do Poço T-100 ao Tanque T-201 com máximo aproveitamento espacial;
* **Familiaridade Imediata:** Navegação muito intuitiva para supervisores acostumados com painéis web executivos e IHMs de sala de comando.

---

## 4. ANÁLISE DE ENGENHARIA DE IHM: MODELO 2 — MENU VERTICAL RETRÁTIL (IMAGEM 3)

A **Imagem 3** apresenta uma barra lateral industrial expansível e colapsável (*Collapsible Sidebar*), padrão consagrado em sistemas SCADA como *Ignition Perspective* e *Siemens WinCC Unified*.

```
   ESTADO EXPANDIDO (260 px)                 ESTADO COLAPSADO (MINI-SIDEBAR: 68 px)
+-------------------------------+         +--------+
| (•) (•) (•) Coordonly     [<] |         | [Coord]| [>]
| Asset Management Platform     |         +--------+
|                               |         |  [🏠]  | ---> Tooltip: "Sinóptico Híbrido"
| [🏠 Dashboard (Sinóptico)]    |         |  [⚙️]  | ---> Popover: Submenu Completo
|                               |         |  [🧪]  |
| [⚙️ Processo & Equipamentos v] |         |  [⚡]  |
|   |-- Reator FTE-CDI [16 cel] |         |  [📋]  |
|   |-- Skid CONTHEC (A+B+C)    |         +--------+
|   |-- Bomba BBS-100 (Bio)     |         |  [🔔]  |
|   \-- Módulo UGL & T-102      |         |  [🌙]  |
|                               |         |  [👤]  |
| [📋 Laudos & Qualidade v]     |         +--------+
|   |-- Laudo Portaria 888      |
|   \-- Laudo Duplo CONAMA 430  |
|                               |
| [Alertas & Notificações (3)]  |
| [👤 Carlos Mendes (Sup)]      |
+-------------------------------+
```

### 4.1. Componentes Estruturais do Menu Vertical
1. **Dois Modos de Exibição Dinâmicos:**
   - **Modo Expandido ($260\text{ px}$ de largura):** Exibe ícones, rótulos de texto, linhas-guia da árvore hierárquica e badges quantitativos de processo. Ideal para engenheiros durante rotinas de diagnóstico ou parametrização detalhada;
   - **Modo Colapsado / Mini-Sidebar ($68\text{ px}$ de largura):** Exibe apenas a coluna de ícones verticais com visual minimalista. Ao passar o mouse (*hover*), exibe *tooltips* industriais escuros de alto contraste; ao clicar, abre um popover flutuante elegante ao lado contendo os subitens;
2. **Navegação Hierárquica em Árvore (*Treeview* Normatizada ISA-101):**
   - Agrupa as telas por nível de detalhamento (Nível 1: Visão Geral de Planta; Nível 2: Unidade de Tratamento; Nível 3: Equipamento Específico; Nível 4: Parâmetro/Diagnóstico de Célula);
   - Linhas-guia visuais conectam os subitens ao nó pai, eliminando qualquer desorientação espacial do operador;
3. **Rodapé Operacional Avançado (*Operational Dock*):**
   - Status de conexão de outros operadores de turno conectados simultaneamente;
   - Botões utilitários rápidos:
     * Silenciador de alarme sonoro (*Buzzer Mute*);
     * Alternador de tema (Modo Escuro Industrial / Modo Alto Contraste);
     * Alternador instantâneo para o Menu Horizontal;
     * Cartão de identificação do operador logado com nível de privilégio (Supervisor / Operador / Administrador).

### 4.2. Vantagens do Menu Vertical para o SCADA FTE-CDI
* **Escalabilidade Infinita:** Permite acomodar dezenas de novas telas (ex: telas individuais para cada uma das 16 células, calibração de instrumentos, históricos de manobra, relatórios fiscais) sem qualquer poluição visual;
* **Economia de Altura Vertical:** A barra superior deixa de ter abas, permitindo que o sinóptico ocupe quase a totalidade da altura da tela ($y = 0\text{ a }100\%$), reduzindo a necessidade de rolagem vertical.

---

## 5. PROPOSTA DE ARQUITETURA DE COEXISTÊNCIA: O SISTEMA "DUAL-NAVIGATION SCADA"

A solução mais profissional e robusta não é escolher apenas um e descartar o outro, mas sim implementar um **mecanismo unificado onde os dois modelos coexistem perfeitamente**, compartilhando a mesma árvore de rotas e o mesmo estado operacional:

```
                                    ARQUITETURA DE DADOS UNIFICADA
                                    
                                     [Matriz Única de Rotas SCADA]
                                     - Sinóptico Híbrido (Padrão Ideal)
                                     - Reator FTE-CDI (P&ID & 16 Células)
                                     - Skid Quádruplo CONTHEC
                                     - Bomba Biossônica BBS-100
                                     - Módulo UGL & Tanque T-102
                                     - 1-Click Pipeline Switcher
                                     - Laudo Portaria 888 & Laudo Duplo
                                     - Banco de Dados Supabase SQL
                                                    |
                         +--------------------------+--------------------------+
                         |                                                     |
                         \/                                                    \/
             [MODO MENU HORIZONTAL]                                  [MODO MENU VERTICAL]
             - Baseado na Imagem 2                                   - Baseado na Imagem 3
             - Header com Dropdowns                                  - Sidebar Retrátil (260px / 68px)
             - Overflow Preditivo ("Mais...")                        - Árvore Hierárquica com Guias
             - Máxima Largura Horizontal                             - Máxima Altura Vertical
                         |                                                     |
                         +--------------------------+--------------------------+
                                                    |
                                                    \/
                                    [Alternador Rápido de 1 Clique]
                                    Salvo no Supabase (scada_user_preferences)
```

### 5.1. Matriz de Agrupamento das Telas nos Menus

| Grupo Hierárquico | Ícone | Telas e Recursos Vinculados | Comportamento no Menu Horizontal (Img 2) | Comportamento no Menu Vertical (Img 3) |
| :--- | :---: | :--- | :--- | :--- |
| **01. Sinópticos & Planta** | 🖥️ | • Sinóptico Híbrido (**Padrão Ideal - Imagem 1**)<br>• Sinóptico FTE-CDI P&ID<br>• Dynamic PFD Sequencial | Aba principal de destaque (`Sinóptico Híbrido`) + dropdown de outros fluxos | Item fixo no topo com expansão em árvore |
| **02. Reator FTE-CDI** | ⚡ | • Rack Modular 16 Células<br>• Dessorção & Válvula XV-103<br>• Manifold DN200 (T4)<br>• Interlocks 2.80 bar | Dropdown `Reator FTE v` com badges de tensão e pressão | Nó de árvore com badges por célula |
| **03. Reagentes & Skid** | 🧪 | • Skid Quádruplo CONTHEC (A+B+C)<br>• Câmara de Mistura In-Situ<br>• 4º Injetor & Diluição T-102<br>• Válvulas XV-101/201/202 | Dropdown `CONTHEC v` com volumes atuais dos frascos | Nó de árvore com status de autonomia em horas |
| **04. Cavitação Acústica** | 🌪️ | • Bomba Biossônica BBS-100<br>• 4 Slots Paramétricos<br>• Controle de RPM e Frequência | Acesso direto ou via dropdown de unidades | Nó com indicação de slot ativo |
| **05. Lodo & ZLD T-102** | 🛡️ | • Tanque de Reuso T-102 (5 m³)<br>• Módulo UGL Prensa Parafuso<br>• Co-Tratamento CaSiF₆↓<br>• Descarte Zero 100% | Dropdown `ZLD & Reuso v` com nível do T-102 ($74.4\%$) | Nó com indicação de isolamento do poço |
| **06. Manobras & Válvulas**| 🔀 | • 1-Click Pipeline Switcher<br>• Válvulas Motorizadas XV-100 a XV-401<br>• Calibração de Vazão FIT-100 | Dropdown `Manobras v` com rotas A, B, C e D | Nó com status de abertura das válvulas |
| **07. Laudos & Qualidade** | 📜 | • Laudo Portaria GM/MS 888<br>• Laudo Duplo (888 + CONAMA 430)<br>• Histórico e Assinatura Digital | Botões de atalho no topo + Dropdown `Laudos v` | Nó com contagem de laudos emitidos |
| **08. Mais / Ajustes** | ⚙️ | • Poço Tubular Profundo T-100<br>• Parâmetros de Interlock<br>• Sincronização Supabase SQL | Dropdown `Mais v` (recolhe itens em telas menores) | Seção inferior da sidebar |

---

## 6. MATRIZ DE COMPARATIVO TÉCNICO: HORIZONTAL VS VERTICAL

| Critério de Engenharia | Menu Horizontal (Imagem 2) | Menu Vertical Sidebar (Imagem 3) |
| :--- | :--- | :--- |
| **Aproveitamento de Espaço para P&ID** | ⭐⭐⭐⭐⭐ **Excelente** (Largura total livre para o sinóptico de $1800\text{ px}$) | ⭐⭐⭐⭐ **Muito Bom** (Em modo colapsado ocupa apenas $68\text{ px}$) |
| **Escalabilidade de Novas Telas** | ⭐⭐⭐ **Moderada** (Exige agrupar em "Mais..." quando há muitas telas) | ⭐⭐⭐⭐⭐ **Máxima** (Acomoda dezenas de itens na árvore vertical com scroll) |
| **Acesso a Ações Críticas (Emergência/Alarmes)** | ⭐⭐⭐⭐⭐ **Imediato** (Header visível a todo momento no topo da tela) | ⭐⭐⭐⭐⭐ **Imediato** (Dock inferior ou topo da barra lateral) |
| **Ergonomia em Telas Ultrawide (21:9 / 32:9)** | ⭐⭐⭐⭐ **Muito Boa** | ⭐⭐⭐⭐⭐ **Excelente** (Utiliza as sobras laterais sem prejudicar a altura) |
| **Ergonomia em Telas Standard (16:9 / 1080p)** | ⭐⭐⭐⭐⭐ **Perfeita** (Preserva a visualização contínua do P&ID) | ⭐⭐⭐⭐⭐ **Perfeita** (Especialmente no modo mini-sidebar de $68\text{ px}$) |
| **Operação Touchscreen / Painel Industrial** | ⭐⭐⭐⭐ **Boa** (Alvos de toque amplos nas abas) | ⭐⭐⭐⭐⭐ **Excelente** (Botões verticais espaçados para toque com luva) |

---

## 7. PLANO DE AÇÃO PARA IMPLEMENTAÇÃO PROFISSIONAL

Quando o operador conceder a devida autorização expressa, o plano será executado nas seguintes etapas:

```
[ETAPA 1: ESTRUTURAÇÃO DE DADOS & SUPABASE]
  ├── Criação do tipo 'LayoutNavegacaoScada' ('HORIZONTAL' | 'VERTICAL_EXPANDIDO' | 'VERTICAL_COLAPSADO') em src/types.ts;
  └── Persistência da preferência do operador na tabela de configurações do Supabase.
         |
[ETAPA 2: COMPONENTE MENU HORIZONTAL SCADA (BASE IMAGEM 2)]
  ├── Header unificado com Logo, Breadcrumb e Abas em Pill Ativo;
  ├── Mega-Dropdowns suspensos para "Processo", "Equipamentos", "Laudos";
  ├── Mecanismo dinâmico de Overflow ("Mais...") com base na largura da viewport;
  └── Card de Perfil do Supervisor com atalhos de auditoria e botão de comutação.
         |
[ETAPA 3: COMPONENTE SIDEBAR VERTICAL RETRÁTIL (BASE IMAGEM 3)]
  ├── Barra lateral retrátil (260px expandida / 68px colapsada);
  ├── Árvore hierárquica ISA-101 com linhas-guia e badges de contagem de alarmes;
  ├── Popovers flutuantes em modo colapsado para acesso rápido com 1 clique;
  └── Dock inferior com status de operadores, mudo de alarme e parada de emergência.
         |
[ETAPA 4: ENVELOPAMENTO DO SINÓPTICO PADRÃO IDEAL (IMAGEM 1)]
  ├── O Sinóptico Híbrido é montado no contêiner principal responsivo;
  ├── Preservação integral do layout padrão da Imagem 1 (FTE no meio, CONTHEC no fim, T-102 ZLD);
  └── Validação rigorosa de compilação (tsc --noEmit e compile_applet).
```

---

## 8. STATUS E REGISTRO FORMAL DE AUTORIZAÇÃO

Em atendimento à autorização expressa concedida pelo operador:
> **Autorização Concedida:** *"Autorizado, pode iniciar a implementação do Plano de Ação em 4 Etapas."*

A execução foi realizada integralmente, cumprindo todas as diretrizes de ergonomia, tempo real e persistência no banco de dados principal **Supabase**.

---

## 9. RELATÓRIO DE CONCLUSÃO DA IMPLEMENTAÇÃO DAS 4 ETAPAS

### 9.1. Etapa 1: Estruturação de Dados & Supabase
* **Tipagem Homologada:**
  - `LayoutNavegacaoScada = 'HORIZONTAL' | 'VERTICAL_EXPANDIDO' | 'VERTICAL_COLAPSADO'` formalizada em `src/types.ts`;
  - Criadas as interfaces `UserNavPreference` e `NavDropdownItem`;
* **Persistência Relacional Supabase SQL:**
  - Tabela `scada_user_preferences` incluída no dump de exportação SQL do Supabase com schema normalizado (`usuario_id`, `layout_navegacao`, `som_alarme_habilitado`, `tema_visual`, `aba_inicial`, `atualizado_em`);
  - Métodos `getLayoutNavegacao(usuarioId)` e `setLayoutNavegacao(layout, usuarioId)` sincronizando em memória, `localStorage` e gerando eventos de auditoria e alarmes informativos.

### 9.2. Etapa 2: Menu Horizontal SCADA (Base Imagem 2)
* **Header Unificado em `src/components/navigation/HorizontalNavHeader.tsx`:**
  - Identidade visual SCADA e indicação de potabilidade (Portaria 888 e Circuito ZLD T-102 fechado);
  - Barra central com abas em estilo *pill* de alta evidência: item ativo em azul elétrico vibrante (`#2563eb`) com pulse animado;
  - Mega-dropdowns suspensos com *backdrop-blur* de alta fidelidade:
    * `Processo FTE` (Sinóptico P&ID, 16 Células Modulares, Retrolavagem & CIP, Manifold DN200);
    * `Química & ZLD` (Skid CONTHEC A+B+C, Portaria GM/MS 888, IA Laudos & OCR);
    * `Mais` (Watchlist Tags, Fórmulas Matemáticas, Alarmes ISA-18.2, Alertas Externos, Gateway Modbus, Banco SQL);
  - Ações rápidas à direita:
    * Botão Parada de Emergência vermelho primário (NR-12);
    * Botão Atalho Laudo Duplo verde esmeralda;
    * **Botão de 1 Clique: Alternar para Menu Vertical** com ícone `SidebarIcon`;
    * Sino de alarmes com badge numérico em tempo real (`resumoGlobal.celulasIntertravadas`) e popover de eventos;
    * Card de perfil do supervisor com avatar, nível de acesso, alternador de operadores (RBAC) e comutador de layout;
    * **Gaveta / Drawer Mobile & Tablet:** Acionada pelo botão hambúrguer para viewports menores que $1280\text{ px}$.

### 9.3. Etapa 3: Sidebar Vertical Retrátil (Base Imagem 3)
* **Barra Lateral Retrátil em `src/components/navigation/VerticalNavSidebar.tsx`:**
  - Janela superior decorativa estilo macOS com 3 pontos (`rose`, `amber`, `emerald`) e botão de colapso rápido `[<]`;
  - **Dois Modos Dinâmicos:**
    * **Modo Expandido ($270\text{ px}$):** Árvore hierárquica completa ISA-101 com linhas-guia cinzas, chevrons rotativos com transição suave, badges quantitativos (ex: `16 OK`, `XV-103`, `180 m³/h`, `Supabase`);
    * **Modo Colapsado / Mini-Sidebar ($72\text{ px}$):** Botão `[>]`, ícones minimalistas de alta visibilidade e **Flyouts Suspensos** flutuantes ao lado com backdrop-blur, ícones e badges;
  - Listener automático de clique fora (`useRef` + `mousedown`) para fechamento limpo de popovers;
  - **Dock Inferior Integrado:**
    * Botão Parada de Emergência sempre visível;
    * Barra utilitária com alternador de 1 clique para o Menu Horizontal (`Layout`), silenciador de alarme (`Volume2` / `VolumeX`), parâmetros de processo (`Sliders`) e emissor de laudos (`FileCheck`);
    * Avatar com cartão de identificação do operador e popover de seleção de usuários.

### 9.4. Etapa 4: Envelopamento do Sinóptico Padrão Ideal (Imagem 1)
* **Arquitetura em `src/App.tsx`:**
  - Ambos os modos de navegação envelopam o contêiner principal responsivo;
  - A **Configuração Padrão Ideal (Imagem 1)** é o estado inicial padrão (`SINOPTICO_HIBRIDO`):
    * Poço T-100 Puro $\rightarrow$ BBS-100 / P-101 $\rightarrow$ FTE-CDI (Meio) $\rightarrow$ Skid CONTHEC (Final) $\rightarrow$ T-201 Potável;
    * Co-tratamento na UGL (rejeito CDI + lodo químico CONTHEC) $\rightarrow$ imobilização $\text{CaSiF}_6 \downarrow$;
    * Tanque de Reuso T-102 ($5\text{ m³}$) em circuito fechado ZLD (lavagem tela $400\text{ L/h}$ + diluição $380\text{ L/h}$);
    * Poço T-100 $100\%$ isolado e protegido;
  - A troca entre menus ocorre em tempo real, sem recarregar a página, preservando animações, telemetria e o scan do CLP;
  - **Validação de Compilação:** `tsc --noEmit` aprovado com **0 erros** e `compile_applet` com status **Build succeeded**.
