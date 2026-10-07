# Códigos de erro do SCADA

> Arquivo gerado de `src/services/errorCatalog.ts`. Não edite à mão: altere o catálogo e rode `npx tsx scripts/gerar-doc-erros.mts`.

Formato `SCD-<ÁREA>-<NNN>`: SEN sensor, SAF segurança, CTL controle, PLC comunicação CLP, NOT notificação, OCR laudos, DAT dados salvos, AUT autorização, UI interface.

| Código | Gravidade | Título | Repetível | Ação do operador | Origem | Em uso |
|---|---|---|---|---|---|---|
| `SCD-SAF-001` | CRITICO | Interlock por sobrepressão | Não | Despressurizar, inspecionar e executar o rearme manual autenticado. | fte_cdi_controller_v2.ts (verificarSegurancaEHisterese) | Sim |
| `SCD-SAF-002` | CRITICO | Corte físico do relé não confirmado | Sim | Acionar o corte manualmente (botoeira/disjuntor) e chamar a manutenção. | fte_cdi_controller_v2.ts (tentarCorteReles) | Sim |
| `SCD-SAF-003` | CRITICO | Parada de emergência acionada | Não | Eliminar a causa e executar o rearme manual autenticado de cada célula. | fte_cdi_controller_v2.ts (paradaEmergencia) | Sim |
| `SCD-SEN-001` | CRITICO | Sinal de pressão inválido | Não | Verificar transmissor e cabeamento; rearmar somente após a leitura normalizar. | fte_cdi_controller_v2.ts (verificarSegurancaEHisterese) | Sim |
| `SCD-SEN-002` | CRITICO | Pressão do CLP indisponível ou inválida | Sim | Restabelecer a comunicação com o CLP/gateway e verificar o transmissor PT-101; rearmar somente com a leitura normalizada. | fte_cdi_controller_v2.ts (verificarSegurancaEHisterese), PlcService.ts (getLeituraPressaoPlenum) | Sim |
| `SCD-AUT-002` | ALTO | Criptografia indisponível neste navegador | Não | Acessar o SCADA por HTTPS (ou localhost). Autenticação falha de forma fechada, nunca libera acesso. | services/pinHash.ts | Sim |
| `SCD-CTL-001` | ALTO | Falha em etapa do ciclo de scan | Sim | Consultar o log; se repetir, acionar o suporte técnico. | fte_cdi_controller_v2.ts (executarEtapaSegura) | Sim |
| `SCD-NOT-001` | ALTO | Notificação de alarme não entregue | Sim | Conferir URL do webhook, rede e destinatários; avisar a equipe por outro canal. | NotificationService.ts (despacharWebhook) | Sim |
| `SCD-NOT-002` | ALTO | Sem destinatário de e-mail configurado | Não | Cadastrar ao menos um destinatário no painel de notificações (ou desabilitar o canal de e-mail). | NotificationService.ts (dispararAlertaInterlock) | Sim |
| `SCD-PLC-001` | ALTO | Timeout de comunicação com o CLP | Sim | Conferir rede, IP, porta e Slave ID. | PlcService.ts (testarPingConexao, escreverRegistrador, verificação periódica) | Sim |
| `SCD-PLC-002` | ALTO | Falha de comunicação com o CLP | Sim | Conferir cabo/switch, energia do CLP e configuração do gateway. | PlcService.ts (transporte) | Sim |
| `SCD-PLC-005` | ALTO | Driver de CLP real indisponível | Não | Configurar o gateway Modbus/OPC UA no servidor ou voltar ao modo Simulador. | PlcService.ts (UnavailablePlcTransport) | Sim |
| `SCD-PLC-007` | ALTO | Energização bloqueada por segurança | Não | Eliminar a causa do intertravamento e executar o rearme; confirmar a comunicação com o CLP. | PlcService.ts (escreverRegistrador) | Sim |
| `SCD-AUT-003` | MEDIO | Muitas tentativas de assinatura eletrônica | Sim | Aguardar o bloqueio terminar. Se não foi você, avisar a segurança da informação. | services/AuthService.ts (validarAssinaturaEngenheiro) | Sim |
| `SCD-DAT-001` | MEDIO | Dado salvo inválido ou corrompido | Não | Conferir e reconfigurar os itens afetados (limites, destinatários, usuários etc.). Avisar o suporte se repetir. | services/storageSeguro.ts (lerJson, lerLista, lerCampos) | Sim |
| `SCD-DAT-002` | MEDIO | Falha ao gravar no navegador | Sim | Liberar espaço/permitir armazenamento do site e repetir a alteração. | services/storageSeguro.ts (gravarJson) | Sim |
| `SCD-OCR-001` | MEDIO | Arquivo ilegível ou falha de rede/HTTP/timeout no OCR | Sim | Reenviar o arquivo (imagem/PDF legível) e verificar a conexão. | laudoOcr.ts (lerArquivoComoDataUrl, chamarOcr) | Sim |
| `SCD-OCR-002` | MEDIO | Laudo sem dados ou incompleto | Não | Revisar o laudo manualmente; ele não é aplicado ao reator nem entra na série temporal. | laudoOcr.ts (montarLaudoDeOcr) | Sim |
| `SCD-OCR-003` | MEDIO | Resposta da IA não é JSON válido | Sim | Reenviar o arquivo ou lançar os dados manualmente. | server.ts (/api/gemini/analisar-laudo) | Sim |
| `SCD-PLC-003` | MEDIO | Registrador inexistente | Não | Corrigir o mapa de registradores. | PlcService.ts (escreverRegistrador) | Sim |
| `SCD-PLC-004` | MEDIO | Escrita em registrador somente leitura | Não | Usar a variável de comando correspondente. | PlcService.ts (escreverRegistrador) | Sim |
| `SCD-PLC-006` | MEDIO | Valor inválido para o registrador | Não | Informar um valor do tipo correto. | PlcService.ts (escreverRegistrador) | Sim |
| `SCD-PLC-008` | MEDIO | Escrita negada pelo gateway | Não | Falar com o administrador do servidor (PLC_GATEWAY_ALLOW_WRITE / PLC_WRITE_ALLOWLIST). | server/plcGateway.ts, PlcService.ts | Sim |
| `SCD-SEN-003` | MEDIO | Medição de fluoreto inválida | Sim | Verificar o analisador de fluoreto (entrada e saída) e a amostragem. | fte_cdi_controller_v2.ts (verificarMaquinaEstadosBreakthrough, ciclo de scan) | Sim |
| `SCD-UI-001` | MEDIO | Falha de renderização de um painel | Sim | Clicar em "Tentar novamente"; se repetir, trocar de aba e avisar o suporte. | components/ErrorBoundary.tsx | Sim |
| `SCD-UI-002` | MEDIO | Erro não tratado no navegador | Sim | Se o comportamento estiver anormal, recarregar a página e avisar o suporte. | services/globalErrorHandlers.ts | Sim |
| `SCD-AUT-001` | BAIXO | Ação negada por perfil | Não | Solicitar a ação a um Engenheiro de Processo ou Administrador. | PidController.ts, PlcService.ts | Sim |

## Detalhes

### SCD-SAF-001: Interlock por sobrepressão

- **Causa:** Pressão da célula atingiu o limite de corte (padrão 2,80 bar; limite estrutural 3,00 bar).
- **Mensagem ao usuário:** Sobrepressão na célula. Fonte DC e válvula de alimentação cortadas.

### SCD-SAF-002: Corte físico do relé não confirmado

- **Causa:** Um ou mais relés de interlock não confirmaram o estado ABERTO após o comando de corte.
- **Mensagem ao usuário:** O corte físico não foi confirmado. Novas tentativas automáticas em andamento.

### SCD-SAF-003: Parada de emergência acionada

- **Causa:** O operador acionou a parada de emergência; todas as células ativas foram intertravadas.
- **Mensagem ao usuário:** Parada de emergência acionada. Fonte DC e bomba cortadas.

### SCD-SEN-001: Sinal de pressão inválido

- **Causa:** Leitura de pressão NaN, ausente ou fora da faixa plausível do transmissor.
- **Mensagem ao usuário:** Falha no sensor de pressão. A célula foi levada ao estado seguro.

### SCD-SEN-002: Pressão do CLP indisponível ou inválida

- **Causa:** Em modo CLP real, a pressão do plenum (PT-101) está sem atualização há mais que o limite (padrão 10 s), veio com valor de falha do transmissor ou nunca foi lida após o período de graça.
- **Mensagem ao usuário:** Sem leitura confiável da pressão do CLP. Células levadas ao estado seguro.

### SCD-AUT-002: Criptografia indisponível neste navegador

- **Causa:** A Web Crypto API (crypto.subtle) não existe: ocorre em páginas servidas por HTTP fora de localhost. Sem ela não é possível criar nem verificar PINs com hash.
- **Mensagem ao usuário:** Não é possível autenticar neste contexto. Acesse o sistema por HTTPS.

### SCD-CTL-001: Falha em etapa do ciclo de scan

- **Causa:** Exceção em uma etapa (simulação, segurança, breakthrough ou telemetria) do ciclo de uma célula.
- **Mensagem ao usuário:** Falha interna no ciclo de controle de uma célula. As demais seguem monitoradas.

### SCD-NOT-001: Notificação de alarme não entregue

- **Causa:** Webhook/e-mail de interlock crítico falhou após as tentativas.
- **Mensagem ao usuário:** Não foi possível enviar a notificação remota do alarme.

### SCD-NOT-002: Sem destinatário de e-mail configurado

- **Causa:** O canal de e-mail está habilitado, mas a lista de destinatários está vazia: um interlock crítico não gera e-mail para ninguém.
- **Mensagem ao usuário:** Nenhum destinatário de e-mail configurado para alertas.

### SCD-PLC-001: Timeout de comunicação com o CLP

- **Causa:** Sem resposta do CLP dentro do tempo limite (Modbus TCP / OPC UA).
- **Mensagem ao usuário:** Sem comunicação com o CLP.

### SCD-PLC-002: Falha de comunicação com o CLP

- **Causa:** Conexão recusada, interrompida ou resposta inválida do CLP (diferente de timeout).
- **Mensagem ao usuário:** Falha de comunicação com o CLP.

### SCD-PLC-005: Driver de CLP real indisponível

- **Causa:** Tentativa de operar em modo CLP real sem driver configurado.
- **Mensagem ao usuário:** Driver de CLP real indisponível.

### SCD-PLC-007: Energização bloqueada por segurança

- **Causa:** Tentativa de energizar bomba/fonte (coils 1 e 2) com intertravamento/E-STOP ativo ou com estado do CLP desconhecido (sem comunicação confirmada).
- **Mensagem ao usuário:** Comando de energização bloqueado: intertravamento ativo ou estado do CLP desconhecido.

### SCD-AUT-003: Muitas tentativas de assinatura eletrônica

- **Causa:** Mais de 5 tentativas inválidas para a mesma matrícula em 5 minutos; novas tentativas ficam bloqueadas por 60 segundos.
- **Mensagem ao usuário:** Muitas tentativas inválidas. Aguarde alguns instantes e tente novamente.

### SCD-DAT-001: Dado salvo inválido ou corrompido

- **Causa:** O conteúdo salvo no navegador não é JSON válido ou não tem o formato esperado. O valor inválido foi descartado (cópia em scada_backup_corrompido:<chave>) e o padrão foi usado.
- **Mensagem ao usuário:** Configuração salva inválida; valores padrão em uso para os itens afetados.

### SCD-DAT-002: Falha ao gravar no navegador

- **Causa:** Não foi possível gravar no localStorage (cota cheia, modo privado ou armazenamento bloqueado).
- **Mensagem ao usuário:** Não foi possível salvar as alterações neste navegador: elas valem só até recarregar a página.

### SCD-OCR-001: Arquivo ilegível ou falha de rede/HTTP/timeout no OCR

- **Causa:** Não foi possível ler o arquivo, o servidor respondeu erro, a rede caiu ou o tempo esgotou.
- **Mensagem ao usuário:** Não foi possível processar este arquivo.

### SCD-OCR-002: Laudo sem dados ou incompleto

- **Causa:** A IA não extraiu parâmetros, ou faltam campos críticos (nº do laudo, data, fluoreto, pH, conformidade).
- **Mensagem ao usuário:** Laudo incompleto: revisão manual necessária.

### SCD-OCR-003: Resposta da IA não é JSON válido

- **Causa:** O modelo retornou texto que não pôde ser interpretado como JSON.
- **Mensagem ao usuário:** A IA não conseguiu estruturar este laudo.

### SCD-PLC-003: Registrador inexistente

- **Causa:** Tentativa de acessar um endereço ausente do mapa de registradores.
- **Mensagem ao usuário:** Endereço de registrador não cadastrado.

### SCD-PLC-004: Escrita em registrador somente leitura

- **Causa:** Tentativa de escrever em registrador de entrada (ex.: sensor) pelo SCADA.
- **Mensagem ao usuário:** Este registrador não aceita comandos.

### SCD-PLC-006: Valor inválido para o registrador

- **Causa:** Valor de tipo errado (bobina exige booleano; holding register exige número finito).
- **Mensagem ao usuário:** Valor inválido para este registrador.

### SCD-PLC-008: Escrita negada pelo gateway

- **Causa:** O gateway recusou a escrita: escrita desabilitada no servidor ou endereço fora da lista permitida.
- **Mensagem ao usuário:** O gateway não autorizou este comando.

### SCD-SEN-003: Medição de fluoreto inválida

- **Causa:** Fluoreto de entrada ou saída ausente, negativo, NaN ou abaixo de 0,1 ppm: razão de breakthrough e eficiência não puderam ser calculadas (a leitura não é contada para o breakthrough; o timeout de adsorção continua valendo).
- **Mensagem ao usuário:** Medição de fluoreto inválida em uma célula; breakthrough não avaliado nesta leitura.

### SCD-UI-001: Falha de renderização de um painel

- **Causa:** Exceção durante a renderização de um componente React, capturada por um ErrorBoundary.
- **Mensagem ao usuário:** Este painel encontrou um erro. O restante do sistema continua funcionando.

### SCD-UI-002: Erro não tratado no navegador

- **Causa:** Exceção global (window.onerror) ou Promise rejeitada sem tratamento (unhandledrejection).
- **Mensagem ao usuário:** Ocorreu um erro inesperado.

### SCD-AUT-001: Ação negada por perfil

- **Causa:** O usuário atual não tem permissão para a operação solicitada.
- **Mensagem ao usuário:** Seu perfil não tem permissão para esta ação.
