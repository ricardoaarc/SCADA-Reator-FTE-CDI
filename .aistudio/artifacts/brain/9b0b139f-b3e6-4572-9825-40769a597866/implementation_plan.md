# PLANO DETALHADO DE INTEGRAÇÃO EM FASES: SISTEMA PURIFYWAVE-OS-V2 + SCADA FTE-CDI

> **Data de Emissão:** 28 de Setembro de 2026  
> **Status:** Pronto para Análise e Aprovação  
> **Banco de Dados Principal:** Supabase (PostgreSQL 15+ com Realtime WebSockets)  
> **Escopo Escolhido:** Sinóptico Híbrido Completo (Pré-Oxidação + Eletrodiálise) e Central de Laudos Duplos (Portaria GM/MS 888/2021 + CONAMA 430/357)

---

## 1. Visão Geral da Arquitetura Integrada ("Total Water Treatment OS")

A integração dos sistemas unifica duas tecnologias complementares em um único ecossistema supervisório industrial:
1. **PuriFyWave OS V2 (Estágio Primário/Secundário):** Processo Oxidativo Avançado (POA) com dosagem de Polióxido de Cloro e Silício reativo, remoção de carga orgânica pesada (DQO/DBO, fenóis, sulfetos, óleos), desinfecção profunda e gerenciamento de lodo (UGL).
2. **Reator FTE-CDI (Estágio Terciário/Polimento):** Eletrodiálise capacitiva de fluxo atravessante com rack de 16 células em PEAD DN200 para desfluoretação seletiva ($F^- \le 1{,}50\text{ mg/L}$) e controle de condutividade para potabilidade humana.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FLUXO DE PROCESSO INTEGRADO TOTAL                                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   [ ÁGUA BRUTA / POÇO / AFLUENTE ]                                                                     │
│                 │                                                                                      │
│                 ▼                                                                                      │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ ESTÁGIO 1: SISTEMA PURIFYWAVE-OS-V2 (Oxidação Avançada POA & UGL)                              │   │
│   │  • Dosagem Inteligente: Polióxido de Cloro (Oxidação) + Silício (Estabilização)                │   │
│   │  • Reator de Contato & Mistura Hidráulica Rápida                                               │   │
│   │  • Tanque de Decantação & Desaguamento de Lodo UGL (Biossólido CONAMA 430/357)                 │   │
│   │  • Telemetria: ORP (mV), Turbidez (NTU), pH In, Cloro Residual, DQO/DBO Estimada               │   │
│   └────────────────────────────────┬───────────────────────────────────────────────────────────────┘   │
│                                    │ Água Clara Oxidada e Desinfetada                                  │
│                                    ▼ (Isenta de Matéria Orgânica e Biofouling)                         │
│   ┌────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │ ESTÁGIO 2: SISTEMA SCADA REATOR FTE-CDI (Polimento Iônico & Desfluoretação)                     │   │
│   │  • Skid de 16 Células Modulares (2.336 pares Ti Ru-Ir + Feltro de Grafite)                     │   │
│   │  • Manifold Hidráulico PEAD DN200 (180 m³/h - 50 L/s) com Balanço T4                           │   │
│   │  • Controle Cíclico: Adsorção 1.40 V DC (Captura F⁻) / Regeneração 0.00 V / Retrolavagem CIP   │   │
│   │  • Interlock Rígido de Sobrepressão: Corte a 2.80 bar                                          │   │
│   └────────────────────────────────┬───────────────────────────────────────────────────────────────┘   │
│                                    │                                                                   │
│                                    ▼                                                                   │
│   [ ÁGUA POTÁVEL PURIFICADA - PORTARIA GM/MS Nº 888/2021 (F⁻ ≤ 1.50 mg/L) ]                           │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cronograma de Implementação em 4 Fases

### FASE 1: Unificação do Barramento de Dados e Modelagem no Supabase
* **Objetivo:** Estabelecer a camada de dados única e centralizada para ambos os subsistemas.
* **Tarefas Técnicas:**
  1. Criação das tabelas relacionais do PuriFyWave no Supabase:
     - `purifywave_telemetria`: Registros de ORP, dosagem de polióxido (ppm), silício (ppm), nível de tanque de reagentes, turbidez e vazão oxidativa.
     - `purifywave_lodo_ugl`: Bateladas de desaguamento, índice de umidade e conformidade de biossólido.
     - `purifywave_etapas_sinfonia`: Estado do controle adaptativo em 4 estágios.
  2. Integração com a tabela existente `telemetria_sensores`, `celulas` e `ciclos_reator` do FTE-CDI.
  3. Configuração de canais **Supabase Realtime (WebSockets)** para streaming contínuo das medições de ambos os processos.
* **Entregável:** Script de migração DDL SQL e serviço `supabaseIntegratedService.ts` com tipagem unificada.

---

### FASE 2: Sinóptico P&ID Híbrido Integrado (SVG Industrial Dinâmico)
* **Objetivo:** Criar a visualização unificada de ponta a ponta na aba principal do SCADA.
* **Tarefas Técnicas:**
  1. Atualização do componente `PidSynopticView.tsx` para renderizar o fluxo contínuo:
     - **Módulo PuriFyWave:** Tanque de dosagem química (Polióxido de Cloro e Silício), câmara de contato POA com animação de microbolhas oxidativas, clarificador/decantador e linha de lodo UGL.
     - **Linha de Transferência Inter-estágios:** Tubulação com indicação de ORP e turbidez pré-filtrada.
     - **Módulo FTE-CDI:** Skid de 16 células em PEAD, bomba VFD, válvulas de retrolavagem (XV-101 a XV-105) e reservatório de água tratada.
  2. Modais de controle e diagnóstico rápido com 1 clique sobre qualquer componente oxidativo ou eletroquímico.
* **Entregável:** Sinóptico P&ID híbrido responsivo com animações vetoriais em alta fidelidade.

---

### FASE 3: Central de Laudos Duplos e Auditoria Regulatória (Portaria 888 + CONAMA 430)
* **Objetivo:** Permitir a emissão de laudos oficiais de potabilidade humana e relatórios ambientais de efluente/lodo.
* **Tarefas Técnicas:**
  1. Atualização do `OfficialComplianceReportModal.tsx` com seletor de modalidade:
     - **Modalidade A:** Laudo Técnico de Potabilidade Humana (Portaria GM/MS nº 888/2021) focado em Fluoreto ($\le 1{,}50\text{ mg/L}$), pH, Condutividade e Cloro Residual.
     - **Modalidade B:** Relatório de Conformidade Ambiental (Resoluções CONAMA 357 e 430) focado em DQO/DBO, remoção de fenóis, sulfetos, estabilização de lodo UGL e efluentes.
     - **Modalidade C:** Laudo Mestre Integrado de Ciclo Completo da Estação.
  2. Impressão limpa em formato A4 (`@media print`), exportação Excel CSV e persistência no Supabase.
* **Entregável:** Emissor multifuncional de laudos técnicos e ambientais com assinaturas técnicas (CRQ/CREA).

---

### FASE 4: Automação Integrada, Gateway Modbus Unificado e Fórmulas Cruzadas
* **Objetivo:** Sincronizar os controles eletroquímicos e oxidativos em malha fechada.
* **Tarefas Técnicas:**
  1. Expansão do mapeamento de registradores no `HardwareGatewayPanel.tsx` e `fte_cdi_modbus_gateway.py`:
     - Holding Registers para dosagens de Polióxido/Silício, ORP, Turbidez e status da UGL.
  2. Criação de **Fórmulas Cruzadas Pré-Configuradas** no `FormulaTagsPanel.tsx`:
     - *Eficiência Global de Tratamento:* $(\text{DQO}_{\text{in}} - \text{DQO}_{\text{out}}) + (F^-_{\text{in}} - F^-_{\text{out}})$.
     - *Índice de Proteção Anti-Fouling:* Correlação entre Turbidez PuriFyWave e $\Delta P$ no plenum PEAD.
  3. Notificações multicanal de emergência configuradas para ambos os estágios.
* **Entregável:** Barramento Modbus unificado, motor de fórmulas inter-estágios e script de comunicação física.

---

## 3. Critérios de Validação e Sucesso da Integração

1. **Semântica e Responsividade:** Todas as novas telas e sinópticos devem ser 100% fluidos e acessíveis em Desktop, Tablets e Celulares com suporte a scroll horizontal suave.
2. **Integridade de Dados no Supabase:** Nenhuma perda de telemetria ou conflito de chaves entre as tabelas do PuriFyWave e do FTE-CDI.
3. **Fidelidade Regulatória:** Os laudos técnicos gerados devem atender com precisão aos artigos das normas Portaria GM/MS 888 e CONAMA 430.
4. **Segurança de Operação:** Interlocks físicos e lógicos independentes para proteção contra sobrepressão ($2{,}80\text{ bar}$) e sobre-dosagem química.

---

## 4. Solicitação de Confirmação

O plano acima contempla todos os requisitos técnicos e operacionais solicitados. Para prosseguir com a execução e implementação dos módulos, confirme clicando no botão **Proceed**.
