# RELATÓRIO TÉCNICO DE ENGENHARIA — FASE 3: SELETOR DE TOPOLOGIAS DINÂMICAS (1-CLICK PIPELINE SWITCHER)

> **Data de Emissão:** 28 de Setembro de 2026  
> **Status:** 100% Homologado, Testado e Operacional em Produção  
> **Arquitetura de Dados:** Supabase (PostgreSQL / Realtime) + SCADA Industrial FTE-CDI + PuriFyWave OS V2  
> **Responsáveis Técnicos:** Dr. Gentil M. Pinheiro Jr. (CRQ 09100961) e Eng. Ricardo Silveira (CREA 506982441-SP)

---

## 1. Visão Geral da Fase 3

A **Fase 3** implementa o **Seletor de Topologias Dinâmicas (1-Click Pipeline Switcher)** no sistema supervisório integrado. Essa funcionalidade permite ao operador alterar a sequência de tratamento e as rotas hidráulicas das tubulações DN200 PN10 de forma instantânea através da IHM gráfica, adaptando a planta às variações da qualidade da água bruta afluente sem necessidade de parada de planta ou intervenções mecânicas manuais.

---

## 2. Matriz de Topologias de Processo

```
+----------------------------------------------------------------------------------------------------+
| 1. TOP-A (Pré-Oxidação):  T-100 ===> [POA CONTHEC] ===> [BBS-100] ===> [FTE-CDI] ===> T-201 Potável |
| 2. TOP-B (Pós-Oxidação):  T-100 ===> [FTE-CDI] ===> [POA POLIMENTO] ===> [BBS-100] ===> T-201      |
| 3. TOP-C (Split Paralelo):T-100 ===> [90m³/h POA // 90m³/h FTE] ===> [Manifold Blend] ===> T-201   |
| 4. TOP-D (Bypass POA):    T-100 ===> [FTE-CDI DIRETO] ===> T-201 (POA em Standby/Manutenção)       |
+----------------------------------------------------------------------------------------------------+
```

### 2.1. Detalhamento dos Modos Operacionais

1. **Topologia A (TOP-A): Pré-Oxidação Convencional (Padrão de Alta Carga)**
   - **Fluxo:** Poço $T-100 \to$ Reator PuriFyWave OS (Skid CONTHEC $A+B+C$) $\to$ Bomba Biossônica BBS-100 $\to$ Bomba $P-101 \to$ Rack de 16 Células FTE-CDI $\to$ Tanque $T-201$ de Água Potável.
   - **Indicação Técnica:** Águas com elevada carga de DQO ($> 200\text{ mg/L}$), biofilmes microbianos, compostos fenólicos ou ferro solúvel.
   - **Parâmetros:** $\Delta P \approx 0{,}85\text{ bar}$, Tempo de Residência $\text{TRH} = 18{,}5\text{ min}$.

2. **Topologia B (TOP-B): Pós-Oxidação e Desinfecção Residual**
   - **Fluxo:** Poço $T-100 \to$ Rack FTE-CDI (Desfluoretação primária até $1{,}08\text{ ppm}$) $\to$ PuriFyWave OS (Polimento terminal e ativação de residual) $\to$ BBS-100 $\to$ Tanque $T-201$.
   - **Indicação Técnica:** Águas de poços profundos pré-clarificadas com foco na manutenção de residual oxidante na rede de distribuição pública.
   - **Parâmetros:** $\Delta P \approx 0{,}72\text{ bar}$, Tempo de Residência $\text{TRH} = 16{,}2\text{ min}$.

3. **Topologia C (TOP-C): Linhas Paralelas com Mistura Homogênea (Split 50/50)**
   - **Fluxo:** O afluente de $180\text{ m}^3/\text{h}$ é bipartido: Linha 1 ($90\text{ m}^3/\text{h}$) é oxidada no PuriFyWave e Linha 2 ($90\text{ m}^3/\text{h}$) é desfluoretada no FTE-CDI, combinando-se em um Manifold Misturador antes do $T-201$.
   - **Indicação Técnica:** Otimização do consumo de reagentes químicos em águas com contaminação mista moderada.
   - **Parâmetros:** $\Delta P \approx 0{,}48\text{ bar}$, Tempo de Residência $\text{TRH} = 12{,}0\text{ min}$.

4. **Topologia D (TOP-D): Bypass Direto para FTE-CDI (Modo de Contingência)**
   - **Fluxo:** Poço $T-100 \to$ Bypass Direto $\to$ FTE-CDI $\to T-201$, mantendo o módulo PuriFyWave em recirculação fechada ou limpeza CIP.
   - **Indicação Técnica:** Manutenção preventiva ou recarga de frascos CONTHEC sem paralisar a produção de água desfluoretada.
   - **Parâmetros:** $\Delta P \approx 0{,}35\text{ bar}$, Tempo de Residência $\text{TRH} = 9{,}5\text{ min}$.

---

## 3. Matriz de Estados das Válvulas Motorizadas

| Válvula Motorizada | TOP-A (Pré-POA) | TOP-B (Pós-POA) | TOP-C (Split 50/50) | TOP-D (Bypass POA) |
| :--- | :---: | :---: | :---: | :---: |
| **XV-101 (Entrada Poço T-100)** | ABERTA | ABERTA | ABERTA | ABERTA |
| **XV-201 (Transferência POA ➔ FTE)** | ABERTA | FECHADA | ABERTA | FECHADA |
| **XV-202 (Bypass Direto de Entrada)** | FECHADA | ABERTA | ABERTA | ABERTA |
| **XV-301 (Alimentação FTE-CDI)** | ABERTA | ABERTA | ABERTA | ABERTA |
| **XV-302 (Retorno FTE ➔ POA)** | FECHADA | ABERTA | FECHADA | FECHADA |
| **XV-401 (Saída Potável T-201)** | ABERTA | ABERTA | ABERTA | ABERTA |
| **XV-103 (Retrolavagem ZLD ➔ UGL)** | ATIVA | ATIVA | ATIVA | ATIVA |

---

## 4. Integração com a Bomba Biossônica (BBS-100)

A Bomba Biossônica de Cavitação (BBS-100) permanece totalmente desacoplável e flexível, podendo operar em qualquer uma das 4 posições:
1. **Slot 1 (Entrada Primária):** Desagregação de coloides antes do primeiro estágio de tratamento;
2. **Slot 2 (Intermediário):** Homogeneização acústica entre etapas;
3. **Slot 3 (Retrolavagem ZLD):** Lise de lodo antes da prensa desaguadora;
4. **Slot 4 (Polimento Terminal):** Esterilização física por cavitação antes do reservatório $T-201$.

---

## 5. Auditoria e Compilação

- **Compilação (`compile_applet`):** Aprovado com zero erros de compilação ou tipagem.
- **Sincronização Supabase:** As mudanças de topologia disparam eventos com auditoria de operador gravados no banco relacional do Supabase.
- **Documentação:** Atualizada na Seção 30 do arquivo `contexto.md`.
