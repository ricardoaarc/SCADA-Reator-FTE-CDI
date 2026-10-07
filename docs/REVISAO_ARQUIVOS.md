# Revisão dos arquivos que ainda não tinham sido lidos

Escopo: `server.ts`, `hardwareGatewayService.ts`, `FteCdiController.ts` (v1), `externalNotificationService.ts`,
`PidController.ts`, avaliador de fórmulas (`formulaService.ts`) e o fluxo de login. **Não** li linha a linha os componentes grandes
(`HybridSynopticView` 1761 linhas, `AntV6SynopticView` 1825, `purifywaveIntegrationService` 1299 etc.); nesses só olhei os trechos que tocam
autenticação, armazenamento e envio de dados.

## Corrigido

| # | Achado | Gravidade | Correção |
|---|---|---|---|
| 1 | Sessão iniciava como ADMIN e trocar de usuário não pedia PIN | Crítico | Sessão inicia como OPERADOR; troca exige PIN (hash, bloqueio por tentativas); gestão de usuários exige ADMIN no serviço |
| 2 | Fórmulas eram executadas com `new Function` (a expressão digitada virava JavaScript; a checagem de identificadores não barrava `.constructor`, aspas, etc.) | Alto | Interpretador próprio sem eval (`expressaoSegura.ts`): 34 payloads de injeção rejeitados nos testes |
| 3 | Fórmula salva com caractere não permitido sumia no reinício; ids `FORM-NNN` repetiam após exclusão (sobrescrevia) | Médio | Validação ao salvar com mensagem na tela; id = maior existente + 1 |
| 4 | `server.ts`: `express.json` de 25 MB global na frente de tudo (anulava o limite de 10 kb do gateway PLC), sem limite de taxa no endpoint pago da IA, sem validação de tipo/tamanho do arquivo, mensagem de erro do provedor devolvida ao navegador, `GEMINI_API_KEY` ausente só falhava dentro da chamada | Alto | Corpo grande só em `/api/gemini`, 20 req/min por IP, whitelist de mime (png/jpeg/webp/pdf) e tamanho, erro genérico ao cliente, 503 claro sem chave, modelo configurável (`GEMINI_MODEL`), aviso se o gateway PLC está sem token |
| 5 | `externalNotificationService`: token de bot, segredo de webhook e e-mails de exemplo no código, histórico de 4 envios que nunca aconteceram, contador "14 enviadas", disparo com texto "HTTP 200 OK / SMTP 250" e tela dizendo "enviado com sucesso" e "sincronizado com o Supabase" | Alto (desinformação do operador) | Padrões vazios e desabilitados, sem histórico falso, status `SIMULADO` em âmbar com a frase "nada foi enviado", contador só de envios reais |
| 6 | Laudo: IA podia dizer "conforme" com parâmetro marcado não conforme (erro de leitura ou texto malicioso no laudo) | Alto | Contradição vira conformidade `null` e o laudo vai para revisão |
| 7 | `PidController`: NaN na vazão envenena o integrador para sempre; NaN na pressão desligava o override de proteção; dt = 0 dava divisão por zero; ganhos/setpoint/saída manual aceitavam NaN | Médio (código hoje sem uso, ver abaixo) | Entradas inválidas não entram na conta, pressão inválida -> saída segura 10%, validação dos setters |

## Não corrigido (decisão sua)

1. **`FteCdiController.ts` (v1, 621 linhas) e `PidController.ts` são código morto**: nenhum componente importa o v1 e o PID só é chamado por ele. Contêm uma segunda lógica de interlock que pode enganar quem lê o código. Recomendo apagar os dois, ou ligar o PID de fato (e então ele passa a precisar da mesma fonte de pressão do CLP real do v2).
2. **`hardwareGatewayService.ts` (painel "Hardware Gateway") é dado estático**: o mapa de registradores (`MAP-001..014`, com coils 1, 2, 4, **10** e input registers 30001+) é **diferente** do mapa do `PlcService` (coils 1, 2, 3, 4 e holding 40001+) que o gateway real usa. Os dois descrevem o mesmo CLP de formas incompatíveis e o status ("ONLINE", 24 891 pacotes, 12 ms) é fixo. Escolha **um** mapa oficial. Além disso, o script Python gerado, ao detectar sobrepressão, corta **só a bomba** (`write_coil(1, False)`) e não o relé da fonte DC (coil 10 no mapa do painel).
3. O script Python gerado tem valores de reserva (`... if input_regs else 2.15`, `180000.0`, `0.85`) que, se uma resposta vier vazia, seriam publicados no Supabase como leitura normal (na prática uma resposta de erro lança exceção, capturada no laço, mas o padrão é perigoso). Ele também usa `SUPABASE_SERVICE_ROLE_KEY` (chave com acesso total) num dispositivo de campo. Corrija antes de usar esse script em planta.
4. Telegram e e-mail reais continuam inexistentes: precisam de um endpoint no servidor (o token do bot não pode ficar no navegador).
5. Componentes grandes não lidos linha a linha (ver escopo).
