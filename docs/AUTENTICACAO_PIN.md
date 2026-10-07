# PIN de assinatura eletrônica e login

* O PIN é gravado **só como hash** PBKDF2-HMAC-SHA256 (600 000 iterações, sal aleatório por usuário), formato `pbkdf2-sha256$iterações$sal$hash`. Nunca aparece em texto puro no armazenamento, nas telas, nos logs nem nas listas de usuários (`getOperadoresDisponiveis` não devolve credenciais).
* **Migração automática:** PINs antigos em texto puro (`senhaPin`) são convertidos em hash ao carregar e o texto puro é apagado. Hashes com menos iterações são reforçados após um login correto.
* **Política:** mínimo de 4 caracteres, sem valores comuns (`1234`, `0000`, `admin`...) nem caracteres repetidos. Não existe mais PIN padrão `1234`; ao cadastrar, o PIN é obrigatório. Ao editar, em branco = manter o atual.
* **Removidas as senhas mestras.** Antes, `admin`, `123456`, `engenharia123`, `8820` e `2026` liberavam a assinatura de engenharia para qualquer usuário, e uma matrícula inexistente com uma delas virava ADMIN.
* **Assinatura** exige matrícula de ENGENHEIRO/ADMIN **ativo** e o PIN dele. Após 5 tentativas inválidas na mesma matrícula (em 5 min), há bloqueio de 60 s (`SCD-AUT-003`). Cada tentativa inválida vai para a auditoria (sem o PIN digitado).
* **Contas de demonstração:** os 4 usuários padrão continuam com os PINs de demonstração antigos, agora só como hash e marcados `pinPadrao`. **Troque-os antes de operar**: a tela de usuários mostra quantos ainda estão com PIN padrão.
* **Exige HTTPS** (ou localhost): sem `crypto.subtle` a autenticação falha de forma fechada (`SCD-AUT-002`).

## Sessão e login

* A aplicação **sempre inicia com o menor privilégio** (perfil OPERADOR). Elevar privilégio para alterar PID, comutar CLP ou editar o layout exige login.
* **Login (`authService.autenticarOperador(matrícula, PIN)`):** assume a sessão com matrícula e PIN corretos. Apenas usuário **ativo** entra; erros são genéricos (não revelam se a matrícula existe); 5 falhas na mesma matrícula bloqueiam por 60 s (`SCD-AUT-003`), compartilhado entre login e assinatura.
* `authService.encerrarSessao()` volta ao perfil básico (nunca aumenta privilégio).
* A assinatura de engenharia agora casa a matrícula **exatamente** (antes comparava com o nome e uma matrícula vazia casava com qualquer engenheiro).
* Para demonstração: os PINs de demonstração continuam valendo (ver acima). Entre pelo botão de usuário no cabeçalho e informe o PIN.
* Tudo continua sendo verificação **no navegador**: quem controla o navegador controla a sessão. O login só vira barreira de verdade com autenticação no servidor.