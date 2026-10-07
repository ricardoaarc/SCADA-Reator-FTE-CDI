# RELATÓRIO TÉCNICO DE DIAGNÓSTICO SCADA: CAUSAS DO DASHBOARD MULTI-ESTAÇÃO, FALHA DE BOOT E PLANO DE AÇÃO

**Documento:** RT-ENG-SCADA-DIAGNOSTIC-MULTISTATION-BOOTFIX-2026-V2  
**Data:** 29 de Setembro de 2026  
**Status:** 🔍 DIAGNÓSTICO DE FALHA CONCLUÍDO & PLANO DE AÇÃO ESTRUTURADO (AGUARDANDO AUTORIZAÇÃO EXPRESSA)  
**Projeto:** SINÓPTICO INDUSTRIAL HÍBRIDO — PURIFYWAVE OS V2 (CONTHEC) + REATOR FTE-CDI 180 m³/h  
**Engenharia de Automação & IHM SCADA:** Eng. Ricardo Silveira — CREA 506982441-SP  

---

## 1. REGISTRO INTEGRAL DAS PERGUNTAS DO OPERADOR

1. **Pergunta 1:** *"Você não fez nada, porque a configuração padrão conforme anexo não está sendo fixada ao iniciar o sistema, e note também, que ainda há sobreposições em vários itens, e será apropriado fazer um ajuste na tubulação do centro para que ela seja dinâmica junto com as configurações de layout, analise, planeje e explique tecnicamente em detalhes?"*
2. **Pergunta 2:** *"O Dashboards de Multi-Estação não funciona, porque, explique em detalhes técnicos?"*

> **Diretriz de Conduta Mandatória:**  
> *(«Não faça nenhuma alteração, somente quando eu autorizar»).*

Em cumprimento rigoroso a esta diretriz, **nenhum arquivo de código-fonte (`.tsx`, `.ts`) foi modificado neste turno**.

---

## 2. DIAGNÓSTICO TÉCNICO DA PERGUNTA 1: FALHA NA FIXAÇÃO DO BOOT, SOBREPOSIÇÕES E TUBULAÇÃO CENTRAL

### A. Causa Raiz Técnica da Não Fixação da Configuração no Boot
Ao analisar o fluxo de inicialização da aplicação, identificou-se uma **incompatibilidade no ciclo de vida do React com o serviço singleton (`purifyWaveService`)**:

1. **Assincronismo no Mount do React:**  
   Quando a página recarrega, o React monta o componente `HybridSynopticView.tsx` e executa o primeiro ciclo de renderização antes que o listener do `purifyWaveService` consiga hidratar o estado a partir do `localStorage` / Supabase.
2. **Ausência de um Estado de Hidratação Síncrona (`isHydrated` Guard):**  
   O componente SVG inicia com valores padrão fallback em memória (`POS_1_INICIO`, `POS_2_MEIO`, `LAYOUT_FISICO_PLANTA`) e desenha a tela antes de ler os dados persistidos, descartando a preferência do operador no boot.

**Solução Proposta:**  
Criar um `HydrationGuard` com estado React `[isHydrated, setIsHydrated]` que lê a preferência salva no `localStorage` e Supabase antes da montagem do SVG e impede a renderização com valores padrão antigos.

---

### B. Diagnóstico Detalhado das Sobreposições Visuais no Novo Print (`image.png`)

Com base na imagem enviada pelo operador, foram catalogados 5 pontos críticos de colisão visual:

```
+-----------------------------------------------------------------------------------------------------+
| DIAGNÓSTICO DAS SOBREPOSIÇÕES NA IMAGEM ATUAL (image.png):                                         |
| 1. VÁLVULA XV-202 no SKID CONTHEC: A caixa vermelha FECHADA está flutuando sem tubulação de       |
|    bypass visível acima do Skid CONTHEC.                                                           |
| 2. VÁLVULA XV-101 vs BOMBA P-101 vs BADGE L-101: A válvula XV-101 e o distintivo L-101 estão        |
|    prensados diretamente abaixo da caixa azul da Bomba P-101.                                       |
| 3. VÁLVULAS XV-201 e XV-301: Entre o Skid CONTHEC e o FTE-CDI, as válvulas XV-201 e XV-301 estão    |
|    espremidas no mesmo segmento de linha, colidindo com o texto L-201 (1.76 m/s).                   |
| 4. VÁLVULA XV-103 no REATOR FTE-CDI: A válvula XV-103 na base do FTE-CDI está cortada e sobreposta  |
|    pela borda inferior do viewBox do SVG.                                                           |
| 5. INJETOR 4 no SKID CONTHEC: A caixa "4º INJETOR: DILUIÇÃO EM ÁGUA T-102" colide com a seta       |
|    vertical azul do Tanque T-102.                                                                   |
+-----------------------------------------------------------------------------------------------------+
```

---

### C. Motor de Roteamento Ortogonal Dinâmico para Tubulações Centrais

**Inadequação Atual:**  
As linhas centrais usam coordenadas estáticas interpoladas. Quando o operador comuta as posições do Skid CONTHEC ou do Reator FTE-CDI (`POS_1_INICIO` $\leftrightarrow$ `POS_2_MEIO` $\leftrightarrow$ `POS_3_FINAL`), as linhas geram trajetórias retas que cortam o meio das caixas de equipamentos.

**Solução Proposta (Engine `DynamicOrthogonalRouter`):**  
Desenvolver uma classe de cálculo vetorial que calcula os pontos de ancoragem (*Ports/Anchors*) das conexões de cada bocal e traça segmentos ortogonais ($H \rightarrow V \rightarrow H$) mantendo uma margem técnica de proteção (*clearance gap* $\ge 30\text{px}$) ao redor de qualquer módulo ou válvula.

---

## 3. DIAGNÓSTICO TÉCNICO DA PERGUNTA 2: POR QUE O DASHBOARD MULTI-ESTAÇÃO NÃO FUNCIONA?

### A. Causa Raiz do Problema
Ao observar a imagem `image.png`, nota-se que o operador clicou no item **`Dashboards Multi-Estação` (MACRO GIS)** na barra lateral roxa. No entanto, a área central continuou exibindo a **mesma tela sinóptica P&ID do Reator FTE-CDI**!

**Explicação Técnica do Bug no Código (`src/App.tsx`):**  
No arquivo `App.tsx`, a renderização da aba foi programada da seguinte forma:
```tsx
// CÓDIGO INCORRETO QUE GEROU O BUG:
{(activeTab === 'SINOPTICO_HIBRIDO' || activeTab === 'DASHBOARD_MULTI_ESTACAO') && (
  <HybridSynopticView ... />
)}
```
Isso significa que quando o operador seleciona `DASHBOARD_MULTI_ESTACAO`, o sistema apenas recarrega o mesmo P&ID de uma única planta em vez de abrir a **Painel de Gestão Macro Multi-Estação**! Para o operador, a aba "não funciona" porque ela não entrega a funcionalidade esperada.

---

### B. Solução Proposta para o Dashboard Multi-Estação

Desenvolver o componente dedicado **`MultiStationDashboardPanel.tsx`** com as seguintes funcionalidades operacionais reais:

1. **Mapa GIS Interativo do Município / Planta:**
   - Exibição georreferenciada das estações remotas (ETA Central, ETE Norte, Poço Adutora T-100, Reservatório R-1, Booster B-2);
   - Marcadores com status dinâmico em tempo real (🟢 Operando Normal, 🟡 Alerta, 🔴 Intertravamento);
2. **Painel de KPIs Consolidado (Visão Executiva):**
   - Vazão Total Tratada no Município ($m^3/h$);
   - Qualidade Média Muncipal ($\text{ppm } F^-, \text{NTU}, \text{pH}$);
   - Eficiência Energética Global ($kW/m^3$);
   - Indicador de Conformidade com a Portaria GM/MS nº 888;
3. **Matriz de Comutação e Atuação Rápida:**
   - Lista de estações com botão para alternar o P&ID ativo em 1 clique e atalho para provisionar registradores Modbus/CLP.

---

## 4. RESUMO DOS TRABALHOS A SEREM EXECUTADOS MEDIANTE AUTORIZAÇÃO

| Item | Ação Técnica Proposta | Arquivos a Modificar / Criar |
| :---: | :--- | :--- |
| **1** | Criar o painel dedicado **`MultiStationDashboardPanel.tsx`** com Mapa GIS, KPIs consolidados municipais e matriz de estações. | `src/components/MultiStationDashboardPanel.tsx` (Novo) |
| **2** | Corrigir o roteamento de abas em `App.tsx` para renderizar o `<MultiStationDashboardPanel />` na aba `DASHBOARD_MULTI_ESTACAO`. | `src/App.tsx` |
| **3** | Implementar o `HydrationGuard` em `HybridSynopticView.tsx` e `purifywaveIntegrationService.ts` garantindo a fixação do layout salvo no boot. | `src/components/HybridSynopticView.tsx`, `src/services/purifywaveIntegrationService.ts` |
| **4** | Reformular as coordenadas e aplicar o Roteamento Ortogonal Dinâmico de Tubulações para eliminar $100\%$ das sobreposições visuais. | `src/components/HybridSynopticView.tsx` |

---

### **Status Operacional:**
> Em estrito cumprimento à diretriz: *(«Não faça nenhuma alteração, somente quando eu autorizar»).*
> **Nenhum arquivo de código-fonte foi alterado neste turno.**

**Aguardando a autorização formal do operador para executar o plano de ação:**
> *"Autorizado, pode criar o componente MultiStationDashboardPanel, corrigir o App.tsx, aplicar o HydrationGuard para o boot e eliminar todas as sobreposições com o roteamento ortogonal."*
