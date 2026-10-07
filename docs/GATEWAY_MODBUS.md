# Gateway Modbus TCP

O navegador não abre sockets TCP. Para ler/escrever no CLP, o SCADA web fala HTTP com o servidor
(`/api/plc/*`) e o servidor fala Modbus TCP com o CLP (`server/plcGateway.ts`, biblioteca `modbus-serial`).

```
Navegador (modo CLP_REAL) --HTTP--> server.ts (/api/plc) --Modbus TCP--> CLP
```

Tudo vem **desligado**. O destino do CLP é definido **só no servidor**: o navegador não envia IP/porta
(evita usar o servidor para varrer a rede interna).

## Variáveis de ambiente (arquivo `.env` do servidor)

| Variável | Padrão | Função |
|---|---|---|
| `PLC_GATEWAY_ENABLED` | `false` | Liga o gateway (`true`). Exige `PLC_HOST`. |
| `PLC_HOST` | – | IP/host do CLP. |
| `PLC_PORT` | `502` | Porta Modbus TCP. |
| `PLC_UNIT_ID` | `1` | Unit/Slave ID. |
| `PLC_TIMEOUT_MS` | `2000` | Timeout de conexão e de cada requisição ao CLP. |
| `PLC_PROBE_ADDRESS` | `40001` | Endereço lido no "Testar Ping" quando não há varredura. |
| `PLC_GATEWAY_TOKEN` | – | Se definido, exigido no header `x-gateway-token` (test/read/write). |
| `PLC_GATEWAY_ALLOW_WRITE` | `false` | Permite escrita. **Só vale se `PLC_GATEWAY_TOKEN` estiver definido.** |
| `PLC_WRITE_ALLOWLIST` | `1,2,4` | Endereços que podem ser escritos (coils da bomba, fonte DC e válvula de rejeito). |

Exemplo mínimo somente leitura:

```
PLC_GATEWAY_ENABLED=true
PLC_HOST=192.168.1.120
```

Com escrita:

```
PLC_GATEWAY_ENABLED=true
PLC_HOST=192.168.1.120
PLC_GATEWAY_TOKEN=um-segredo-longo
PLC_GATEWAY_ALLOW_WRITE=true
```

## Endereçamento

`40001..49999` = holding register (função 03; offset = endereço − 40001). `1..9999` = coil (função 01/05; offset = endereço − 1).
É o mesmo mapa de registradores da tela "Gateway Modbus" (PT-101 em 40001 etc.). Se o seu CLP usa outro mapa, ajuste `REGISTRADORES_INICIAIS` em `src/services/PlcService.ts`.

## Endpoints

| Rota | Função |
|---|---|
| `GET /api/plc/status` | Estado do gateway (ligado, escrita habilitada, exige token). Sem token. |
| `POST /api/plc/test` | Testa a comunicação lendo 1 registrador. |
| `POST /api/plc/read` `{enderecos:[...]}` | Lê até 64 endereços (agrupados em leituras contíguas). |
| `POST /api/plc/write` `{endereco, valor}` | Escreve e **confirma por releitura**. Registra origem, endereço e valor no log do servidor. |

Erros devolvem `{sucesso:false, codigo:'SCD-…', erro}`: `SCD-PLC-005` (gateway desligado, HTTP 503), `SCD-AUT-001` (token, 401),
`SCD-PLC-001` (timeout, 504), `SCD-PLC-002` (falha de comunicação, 502), `SCD-PLC-003/006` (endereço/valor inválido, 400), `SCD-PLC-008` (escrita negada, 403).
Lista completa em `docs/CODIGOS_DE_ERRO.md`.

## Como o SCADA se comporta em CLP_REAL

* Ao ativar o modo, o status começa em `CONECTANDO` e só vira `CONECTADO` após uma varredura bem-sucedida.
* A cada 2 s o SCADA lê todos os registradores mapeados pelo gateway. Essa leitura é, ao mesmo tempo, o teste de conexão.
* A telemetria simulada **não** sobrescreve os registradores: o que aparece é o que veio do CLP.
* Sem comunicação, a tela mostra "QUALIDADE DOS DADOS: RUIM" e há alarme crítico (uma vez por tipo de falha, com alarme de recuperação).
* **Regra de segurança:** energizar bomba ou fonte DC (coils 1 e 2 = `true`) é bloqueado (`SCD-PLC-007`) se o CLP estiver sem comunicação confirmada ou com o intertravamento/E-STOP (coil 3) ativo. Desenergizar (`false`) é sempre permitido.

## Limites conhecidos (leia antes de usar em planta)

1. **O controle de acesso do SCADA é só no navegador.** O token do gateway é um segredo compartilhado digitado na tela (fica só em memória). Em produção, coloque o servidor atrás de autenticação real (proxy reverso com SSO/VPN) e em rede industrial segmentada (IEC 62443). Não exponha `/api/plc` na internet.
2. **O controlador de células e o interlock do SCADA continuam usando a simulação.** O modo CLP_REAL mostra e comanda o que está no CLP, mas a lógica de interlock em software ainda não consome a pressão real. O corte de segurança deve existir no CLP/hardware.
3. Modbus TCP não tem criptografia nem autenticação. Quem alcança a porta 502 do CLP controla o CLP.
4. A varredura usa intervalo fixo de 2 s (o campo "Intervalo de Varredura" da tela é informativo).
5. Testado contra um servidor Modbus TCP independente (`modbus-serial` `ServerTCP`), não contra um CLP físico. Valide com o seu equipamento (ordem de bytes, mapa de endereços, exceções) antes de comissionar.