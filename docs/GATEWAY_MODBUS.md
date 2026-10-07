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
| `PLC_WRITE_ALLOWLIST` | `1,2,3,4,6,40010,40015,40016` | Endereços com escrita permitida no Mapa v2.1 (coils de processo, modo PID, setpoints e watchdog). |

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
PLC_WRITE_ALLOWLIST=1,2,3,4,6,40010,40015,40016
```

## Endereçamento (Conformidade Modbus v2.1 / IEC 61131-3)

* `1..9999` = Coils Digitais (Função 01/05; offset = endereço − 1). Coils 1 a 6.
* `10001..19999` = Discrete Inputs (Função 02; offset = endereço − 10001). Somente leitura (Read-Only). 10001 (E-STOP NF) e 10002 (Sobrepressão NF).
* `30001..39999` = Input Registers (Função 04; offset = endereço − 30001). Somente leitura (Read-Only).
* `40001..49999` = Holding Registers (Função 03/06/16; offset = endereço − 40001). Registradores analógicos de telemetria e setpoints.
  - `40010`: Setpoint de Vazão da malha PID (500 a 1500 L/h).
  - `40011`: Variável Manipulada (CV-VFD) gerada pelo CLP (Read-Only).
  - `40015`: Contador do Watchdog Industrial do SCADA (incrementado a cada 1.000 ms pelo servidor Node.js).
  - `40016`: CV Manual do Inversor VFD (0 a 100%).
  - `40099`: MAP_VERSION congelado (valor decimal 21, código de erro `SCD-PLC-009` se incompatível).

É o mapa oficial tipado e congelado em `src/services/mapaModbus.ts`.

## Endpoints

| Rota | Função |
|---|---|
| `GET /api/plc/status` | Estado do gateway (ligado, escrita habilitada, exige token, status do watchdog). Sem token. |
| `POST /api/plc/test` | Testa a comunicação lendo 1 registrador de prova. |
| `POST /api/plc/read` `{enderecos:[...]}` | Lê até 64 endereços (Funções 01, 02, 03 e 04 agrupadas em blocos contíguos). |
| `POST /api/plc/write` `{endereco, valor}` | Escreve e **confirma por releitura**. Rejeita escritas em pontos somente-leitura (400) e fora da allowlist (403). |

Erros devolvem `{sucesso:false, codigo:'SCD-…', erro}`: `SCD-PLC-005` (gateway desligado, HTTP 503), `SCD-AUT-001` (token, 401),
`SCD-PLC-001` (timeout, 504), `SCD-PLC-002` (falha de comunicação, 502), `SCD-PLC-003/006` (endereço/valor inválido, 400), `SCD-PLC-004` (somente-leitura, 400), `SCD-PLC-008` (escrita negada, 403), `SCD-PLC-009` (MAP_VERSION divergente).
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