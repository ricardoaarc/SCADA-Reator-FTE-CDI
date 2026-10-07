# RELATÓRIO TÉCNICO OFICIAL: CONSOLIDAÇÃO DO SUPABASE COMO BANCO DE DADOS PRINCIPAL

> **Data de Emissão:** 05 de Outubro de 2026  
> **Sistema:** Supervisório SCADA Industrial FTE-CDI (Desfluoretação por Eletrodiálise Capacitiva com Eletrodos de Fluxo Atravessante)  
> **Capacidade:** 180 m³/h (50 L/s) em Rack com 16 Células Paralelas (2.336 pares de eletrodos Ti/Ru-Ir e Grafite)  
> **Normas de Referência:** Portaria GM/MS nº 888/2021 (VMP Fluoreto: 1,50 mg/L), FDA 21 CFR Part 11, ISA-101 e ISA-18.2  
> **Status:** CONCLUÍDO E VALIDADO (250/250 Testes Aprovados)

---

## 1. Diretriz Estratégica do Banco de Dados Principal

Conforme diretriz mandatória de engenharia de software e automação:
* **O Supabase é o Banco de Dados Principal e Oficial** de todo o ecossistema SCADA PurifyWave / FTE-CDI.
* **Instância em Nuvem:** `https://ivurdxdcpwwjcphhszdg.supabase.co`
* **Persistência Relacional Remota:** Todas as entidades operacionais, séries temporais, alarmes, relés, ciclos de desfluoretação e laudos de ensaio de laboratório são gravados e auditados de forma contínua no Supabase.

---

## 2. Perguntas e Respostas Registradas

### Pergunta 1: Qual é o papel exato do Supabase frente ao repositório local do SCADA?
**Resposta:**  
O Supabase atua como o repositório centralizado autoritativo em nuvem. A camada local em memória (`ScadaDatabase`) funciona como um cache operacional de ultra-alta velocidade para resposta em milissegundos nas telas e interlocks do CLP, enquanto o serviço assíncrono `SupabaseSyncService` espelha e consolida 100% dos dados no Supabase. Isso garante redundância local (Edge Computing) e persistência definitiva em nuvem (Cloud SCADA).

### Pergunta 2: Como é garantida a performance das gravações contínuas de telemetria sem sobrecarregar a rede?
**Resposta:**  
Implementou-se a estratégia de **Buffer em Lote (Batching)** no `SupabaseSyncService`. A telemetria dos sensores das 16 células é enfileirada e descarregada em blocos a cada 4 segundos (ou assim que atinge 20 leituras). Já eventos críticos de alta severidade (alarmes ISA-18.2, interlocks de 2,80 bar, alterações de ciclo e assinaturas eletrônicas) são enviados imediatamente (*real-time dispatch*).

### Pergunta 3: O que ocorre se houver oscilação transitória de conexão de rede com a nuvem?
**Resposta:**  
Em caso de falha de conexão com a API do Supabase, o buffer de telemetria retém as leituras recentes e as reinsere na fila prioritária para envio na reconexão. O supervisório mantém seu funcionamento ininterrupto, sem travar as rotinas de segurança do reator.

---

## 3. Mapeamento das 11 Tabelas Integradas no Supabase

| Nº | Tabela no Supabase | Descrição e Finalidade Industrial | Frequência de Gravação |
|:---|:---|:---|:---|
| 1 | `usuarios_scada` | Cadastro de operadores, níveis RBAC e hashes de senha/PIN PBKDF2 | Cadastro e atualização de perfil |
| 2 | `celulas_fte_cdi` | Telemetria e estado operacional das 16 células eletroquímicas do rack | Atualização periódica e em lote |
| 3 | `reles_atuadores` | Estado dos relés de hardware (Bomba P-101, Fonte DC PW-201, Válvulas XV) | Por mudança de estado de relé |
| 4 | `ciclos_reator` | Registro de ciclos de Adsorção (1,40 V) e Dessorção/Regeneração (0,00 V) | A cada transição de fase de ciclo |
| 5 | `telemetria_sensores` | Histórico temporal: pressão, vazão, tensão, corrente, pH, temperatura e $F^-$ | Lotes periódicos a cada 4 segundos |
| 6 | `alarmes_eventos` | Registro de eventos e alarmes ISA-18.2 com estado de reconhecimento | Imediato ao disparo ou reconhecimento |
| 7 | `historico_auditoria` | Trilha de auditoria CFR 21 Part 11 com assinatura criptográfica SHA-256 | Imediato a cada ação crítica de operador |
| 8 | `laudos_integrados_duplos` | Laudos analíticos de laboratórios credenciados com conformidade Portaria 888 | No salvamento ou extração por IA |
| 9 | `estacoes_tratamento_scada`| Parâmetros e configuração de estações do sistema e topologias ZLD | Por alteração de configuração |
| 10 | `notificacoes_config_scada`| Configuração de despacho multicanal (E-mail, Webhook, Web Push, Sirene) | Por alteração de parâmetros de notificação |
| 11 | `formulas_matematicas_scada`| Fórmulas dinâmicas avaliadas e parâmetros calculados de processo | Por edição ou inclusão de fórmula |

---

## 4. Alterações Realizadas no Código-Fonte

1. **`src/services/supabaseSyncService.ts`**:
   - Criação da classe `SupabaseSyncService` exportada como `supabaseSync`.
   - Implementação de `sincronizarEstadoInicialCompleto(...)` protegida com fallbacks para propriedades numéricas (`pressaoBar`, `vazaoLh`, `correnteAmp`, `tensaoV`, `ph`, `fluoretoInPPM`, `fluoretoOutPPM`).
   - Implementação de `enfileirarTelemetria(...)` com envio em lote a cada 4 segundos.
   - Implementação de `sincronizarNovoCiclo(...)`, `sincronizarAlarme(...)` e `sincronizarAuditoria(...)`.
   - Adição de `.unref()` nos temporizadores do Node.js para encerramento limpo em execuções de teste e CLI.

2. **`src/services/database.ts`**:
   - Integração do método `executarCargaInicialSupabase()` invocado automaticamente na inicialização da aplicação.
   - Sincronização automática em background no momento do boot do supervisório.

3. **`scripts/teste-plc-webhook-errorboundary.mts`**:
   - Isolamento do mock global de `fetch` para interceptar estritamente requisições direcionadas para `exemplo.test/hook`, repassando as demais chamadas HTTP para o `realFetch` (evitando interferência nas chamadas de sincronização do Supabase).

---

## 5. Exclusões Realizadas

* **Eliminação de acoplamentos bloqueantes:** Removida qualquer dependência que bloqueasse o loop de eventos do Node em testes automatizados.
* **Eliminação de campos inventados:** Conforme diretrizes de integridade, descartada qualquer injeção de valores inventados na telemetria e nos laudos.

---

## 6. Resultados da Validação Integral

### 6.1. Compilação e Linter
* `compile_applet`: **Sucesso (Build Succeeded)**.
* `npm run lint` (`tsc --noEmit`): **0 erros de tipagem**.

### 6.2. Suíte de Testes Automatizados (100% Aprovados)
* `teste-m4-b2.mts`: **19/19 PASS**
* `teste-dados-salvos.mts`: **44/44 PASS**
* `teste-plc-webhook-errorboundary.mts`: **33/33 PASS**
* `teste-fase1.mts`: **15/15 PASS**
* `teste-ocr-laudos.mts`: **23/23 PASS**
* `teste-gateway-modbus.mts`: **44/44 PASS**
* `teste-interlock-clp-real.mts`: **26/26 PASS**
* `teste-pin-hash.mts`: **39/39 PASS**
* `teste-catalogo-erros.mts`: **7/7 PASS**

**Total Consolidado:** **250 testes executados, 250 aprovados com 100% de sucesso.**
