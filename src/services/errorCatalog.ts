/**
 * Catálogo central de códigos de erro do SCADA.
 *
 * - Um código identifica UMA causa e nunca muda de significado (clientes, relatórios e alarmes dependem dele).
 * - Para criar um novo erro: adicione aqui primeiro; o TypeScript só aceita códigos existentes (CodigoErro).
 * - `emUso: false` = código reservado/planejado que o sistema ainda não emite.
 * - A documentação em docs/CODIGOS_DE_ERRO.md é gerada a partir deste arquivo
 *   (npx tsx scripts/gerar-doc-erros.mts).
 *
 * Formato: SCD-<ÁREA>-<NNN>   SEN=sensor  SAF=segurança  CTL=controle  PLC=comunicação CLP
 *                             NOT=notificação  OCR=laudos  DAT=dados salvos  AUT=autorização  UI=interface
 */

export type Gravidade = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO';

export interface DefinicaoErro {
  gravidade: Gravidade;
  titulo: string;
  /** Causa técnica, para logs e manutenção. */
  descricao: string;
  /** Texto seguro para mostrar ao operador (sem detalhes internos). */
  mensagemUsuario: string;
  /** A mesma operação pode dar certo se repetida? */
  repetivel: boolean;
  acaoOperador: string;
  /** Onde o sistema emite este código hoje. */
  origem: string;
  emUso: boolean;
}

export const CATALOGO_ERROS = {
  'SCD-SEN-001': {
    gravidade: 'CRITICO',
    titulo: 'Sinal de pressão inválido',
    descricao: 'Leitura de pressão NaN, ausente ou fora da faixa plausível do transmissor.',
    mensagemUsuario: 'Falha no sensor de pressão. A célula foi levada ao estado seguro.',
    repetivel: false,
    acaoOperador: 'Verificar transmissor e cabeamento; rearmar somente após a leitura normalizar.',
    origem: 'fte_cdi_controller_v2.ts (verificarSegurancaEHisterese)',
    emUso: true,
  },
  'SCD-SAF-001': {
    gravidade: 'CRITICO',
    titulo: 'Interlock por sobrepressão',
    descricao: 'Pressão da célula atingiu o limite de corte (padrão 2,80 bar; limite estrutural 3,00 bar).',
    mensagemUsuario: 'Sobrepressão na célula. Fonte DC e válvula de alimentação cortadas.',
    repetivel: false,
    acaoOperador: 'Despressurizar, inspecionar e executar o rearme manual autenticado.',
    origem: 'fte_cdi_controller_v2.ts (verificarSegurancaEHisterese)',
    emUso: true,
  },
  'SCD-SAF-002': {
    gravidade: 'CRITICO',
    titulo: 'Corte físico do relé não confirmado',
    descricao: 'Um ou mais relés de interlock não confirmaram o estado ABERTO após o comando de corte.',
    mensagemUsuario: 'O corte físico não foi confirmado. Novas tentativas automáticas em andamento.',
    repetivel: true,
    acaoOperador: 'Acionar o corte manualmente (botoeira/disjuntor) e chamar a manutenção.',
    origem: 'fte_cdi_controller_v2.ts (tentarCorteReles)',
    emUso: true,
  },
  'SCD-SEN-003': {
    gravidade: 'MEDIO',
    titulo: 'Medição de fluoreto inválida',
    descricao: 'Fluoreto de entrada ou saída ausente, negativo, NaN ou abaixo de 0,1 ppm: razão de breakthrough e eficiência não puderam ser calculadas (a leitura não é contada para o breakthrough; o timeout de adsorção continua valendo).',
    mensagemUsuario: 'Medição de fluoreto inválida em uma célula; breakthrough não avaliado nesta leitura.',
    repetivel: true,
    acaoOperador: 'Verificar o analisador de fluoreto (entrada e saída) e a amostragem.',
    origem: 'fte_cdi_controller_v2.ts (verificarMaquinaEstadosBreakthrough, ciclo de scan)',
    emUso: true,
  },
  'SCD-NOT-002': {
    gravidade: 'ALTO',
    titulo: 'Sem destinatário de e-mail configurado',
    descricao: 'O canal de e-mail está habilitado, mas a lista de destinatários está vazia: um interlock crítico não gera e-mail para ninguém.',
    mensagemUsuario: 'Nenhum destinatário de e-mail configurado para alertas.',
    repetivel: false,
    acaoOperador: 'Cadastrar ao menos um destinatário no painel de notificações (ou desabilitar o canal de e-mail).',
    origem: 'NotificationService.ts (dispararAlertaInterlock)',
    emUso: true,
  },
  'SCD-SEN-002': {
    gravidade: 'CRITICO',
    titulo: 'Pressão do CLP indisponível ou inválida',
    descricao: 'Em modo CLP real, a pressão do plenum (PT-101) está sem atualização há mais que o limite (padrão 10 s), veio com valor de falha do transmissor ou nunca foi lida após o período de graça.',
    mensagemUsuario: 'Sem leitura confiável da pressão do CLP. Células levadas ao estado seguro.',
    repetivel: true,
    acaoOperador: 'Restabelecer a comunicação com o CLP/gateway e verificar o transmissor PT-101; rearmar somente com a leitura normalizada.',
    origem: 'fte_cdi_controller_v2.ts (verificarSegurancaEHisterese), PlcService.ts (getLeituraPressaoPlenum)',
    emUso: true,
  },
  'SCD-CTL-001': {
    gravidade: 'ALTO',
    titulo: 'Falha em etapa do ciclo de scan',
    descricao: 'Exceção em uma etapa (simulação, segurança, breakthrough ou telemetria) do ciclo de uma célula.',
    mensagemUsuario: 'Falha interna no ciclo de controle de uma célula. As demais seguem monitoradas.',
    repetivel: true,
    acaoOperador: 'Consultar o log; se repetir, acionar o suporte técnico.',
    origem: 'fte_cdi_controller_v2.ts (executarEtapaSegura)',
    emUso: true,
  },
  'SCD-SAF-003': {
    gravidade: 'CRITICO',
    titulo: 'Parada de emergência acionada',
    descricao: 'O operador acionou a parada de emergência; todas as células ativas foram intertravadas.',
    mensagemUsuario: 'Parada de emergência acionada. Fonte DC e bomba cortadas.',
    repetivel: false,
    acaoOperador: 'Eliminar a causa e executar o rearme manual autenticado de cada célula.',
    origem: 'fte_cdi_controller_v2.ts (paradaEmergencia)',
    emUso: true,
  },
  'SCD-PLC-001': {
    gravidade: 'ALTO',
    titulo: 'Timeout de comunicação com o CLP',
    descricao: 'Sem resposta do CLP dentro do tempo limite (Modbus TCP / OPC UA).',
    mensagemUsuario: 'Sem comunicação com o CLP.',
    repetivel: true,
    acaoOperador: 'Conferir rede, IP, porta e Slave ID.',
    origem: 'PlcService.ts (testarPingConexao, escreverRegistrador, verificação periódica)',
    emUso: true,
  },
  'SCD-PLC-002': {
    gravidade: 'ALTO',
    titulo: 'Falha de comunicação com o CLP',
    descricao: 'Conexão recusada, interrompida ou resposta inválida do CLP (diferente de timeout).',
    mensagemUsuario: 'Falha de comunicação com o CLP.',
    repetivel: true,
    acaoOperador: 'Conferir cabo/switch, energia do CLP e configuração do gateway.',
    origem: 'PlcService.ts (transporte)',
    emUso: true,
  },
  'SCD-PLC-003': {
    gravidade: 'MEDIO',
    titulo: 'Registrador inexistente',
    descricao: 'Tentativa de acessar um endereço ausente do mapa de registradores.',
    mensagemUsuario: 'Endereço de registrador não cadastrado.',
    repetivel: false,
    acaoOperador: 'Corrigir o mapa de registradores.',
    origem: 'PlcService.ts (escreverRegistrador)',
    emUso: true,
  },
  'SCD-PLC-004': {
    gravidade: 'MEDIO',
    titulo: 'Escrita em registrador somente leitura',
    descricao: 'Comando de escrita em registrador marcado como somenteLeitura.',
    mensagemUsuario: 'Este registrador não aceita escrita.',
    repetivel: false,
    acaoOperador: 'Nenhuma; o comando foi bloqueado.',
    origem: 'PlcService.ts (escreverRegistrador)',
    emUso: true,
  },
  'SCD-PLC-005': {
    gravidade: 'ALTO',
    titulo: 'Driver de CLP real indisponível',
    descricao: 'Modo CLP_REAL ativo, mas nenhum transporte Modbus/OPC UA real foi configurado neste ambiente (o navegador não abre sockets TCP).',
    mensagemUsuario: 'Conexão com CLP real indisponível neste ambiente. Os dados NÃO vêm do campo.',
    repetivel: false,
    acaoOperador: 'Configurar o gateway Modbus/OPC UA no servidor ou voltar ao modo Simulador.',
    origem: 'PlcService.ts (UnavailablePlcTransport)',
    emUso: true,
  },
  'SCD-PLC-006': {
    gravidade: 'MEDIO',
    titulo: 'Valor inválido para o registrador',
    descricao: 'Valor de tipo errado (bobina exige booleano; holding register exige número finito).',
    mensagemUsuario: 'Valor inválido para este registrador.',
    repetivel: false,
    acaoOperador: 'Informar um valor do tipo correto.',
    origem: 'PlcService.ts (escreverRegistrador)',
    emUso: true,
  },
  'SCD-PLC-007': {
    gravidade: 'ALTO',
    titulo: 'Energização bloqueada por segurança',
    descricao: 'Tentativa de energizar bomba/fonte (coils 1 e 2) com intertravamento/E-STOP ativo ou com estado do CLP desconhecido (sem comunicação confirmada).',
    mensagemUsuario: 'Comando de energização bloqueado: intertravamento ativo ou estado do CLP desconhecido.',
    repetivel: false,
    acaoOperador: 'Eliminar a causa do intertravamento e executar o rearme; confirmar a comunicação com o CLP.',
    origem: 'PlcService.ts (escreverRegistrador)',
    emUso: true,
  },
  'SCD-PLC-008': {
    gravidade: 'MEDIO',
    titulo: 'Escrita negada pelo gateway',
    descricao: 'O gateway recusou a escrita: escrita desabilitada no servidor ou endereço fora da lista permitida.',
    mensagemUsuario: 'O gateway não autorizou este comando.',
    repetivel: false,
    acaoOperador: 'Falar com o administrador do servidor (PLC_GATEWAY_ALLOW_WRITE / PLC_WRITE_ALLOWLIST).',
    origem: 'server/plcGateway.ts, PlcService.ts',
    emUso: true,
  },
  'SCD-PLC-009': {
    gravidade: 'CRITICO',
    titulo: 'Versão do Mapa Modbus incompatível com o CLP',
    descricao: 'O valor lido no registrador 40099 (MAP_VERSION) difere da versão esperada pelo SCADA (v2.1 = 21).',
    mensagemUsuario: 'Incompatibilidade entre a versão do programa do CLP e o sistema SCADA.',
    repetivel: false,
    acaoOperador: 'Verificar versão do ladder no CLP ou atualizar o mapa Modbus no SCADA para evitar escritas em registradores desalinhados.',
    origem: 'mapaModbus.ts, PlcService.ts',
    emUso: true,
  },
  'SCD-NOT-001': {
    gravidade: 'ALTO',
    titulo: 'Notificação de alarme não entregue',
    descricao: 'Webhook/e-mail de interlock crítico falhou após as tentativas.',
    mensagemUsuario: 'Não foi possível enviar a notificação remota do alarme.',
    repetivel: true,
    acaoOperador: 'Conferir URL do webhook, rede e destinatários; avisar a equipe por outro canal.',
    origem: 'NotificationService.ts (despacharWebhook)',
    emUso: true,
  },
  'SCD-OCR-001': {
    gravidade: 'MEDIO',
    titulo: 'Arquivo ilegível ou falha de rede/HTTP/timeout no OCR',
    descricao: 'Não foi possível ler o arquivo, o servidor respondeu erro, a rede caiu ou o tempo esgotou.',
    mensagemUsuario: 'Não foi possível processar este arquivo.',
    repetivel: true,
    acaoOperador: 'Reenviar o arquivo (imagem/PDF legível) e verificar a conexão.',
    origem: 'laudoOcr.ts (lerArquivoComoDataUrl, chamarOcr)',
    emUso: true,
  },
  'SCD-OCR-002': {
    gravidade: 'MEDIO',
    titulo: 'Laudo sem dados ou incompleto',
    descricao: 'A IA não extraiu parâmetros, ou faltam campos críticos (nº do laudo, data, fluoreto, pH, conformidade).',
    mensagemUsuario: 'Laudo incompleto: revisão manual necessária.',
    repetivel: false,
    acaoOperador: 'Revisar o laudo manualmente; ele não é aplicado ao reator nem entra na série temporal.',
    origem: 'laudoOcr.ts (montarLaudoDeOcr)',
    emUso: true,
  },
  'SCD-OCR-003': {
    gravidade: 'MEDIO',
    titulo: 'Resposta da IA não é JSON válido',
    descricao: 'O modelo retornou texto que não pôde ser interpretado como JSON.',
    mensagemUsuario: 'A IA não conseguiu estruturar este laudo.',
    repetivel: true,
    acaoOperador: 'Reenviar o arquivo ou lançar os dados manualmente.',
    origem: 'server.ts (/api/gemini/analisar-laudo)',
    emUso: true,
  },
  'SCD-DAT-001': {
    gravidade: 'MEDIO',
    titulo: 'Dado salvo inválido ou corrompido',
    descricao: 'O conteúdo salvo no navegador não é JSON válido ou não tem o formato esperado. O valor inválido foi descartado (cópia em scada_backup_corrompido:<chave>) e o padrão foi usado.',
    mensagemUsuario: 'Configuração salva inválida; valores padrão em uso para os itens afetados.',
    repetivel: false,
    acaoOperador: 'Conferir e reconfigurar os itens afetados (limites, destinatários, usuários etc.). Avisar o suporte se repetir.',
    origem: 'services/storageSeguro.ts (lerJson, lerLista, lerCampos)',
    emUso: true,
  },
  'SCD-DAT-002': {
    gravidade: 'MEDIO',
    titulo: 'Falha ao gravar no navegador',
    descricao: 'Não foi possível gravar no localStorage (cota cheia, modo privado ou armazenamento bloqueado).',
    mensagemUsuario: 'Não foi possível salvar as alterações neste navegador: elas valem só até recarregar a página.',
    repetivel: true,
    acaoOperador: 'Liberar espaço/permitir armazenamento do site e repetir a alteração.',
    origem: 'services/storageSeguro.ts (gravarJson)',
    emUso: true,
  },
  'SCD-AUT-001': {
    gravidade: 'BAIXO',
    titulo: 'Ação negada por perfil',
    descricao: 'O usuário atual não tem permissão para a operação solicitada.',
    mensagemUsuario: 'Seu perfil não tem permissão para esta ação.',
    repetivel: false,
    acaoOperador: 'Solicitar a ação a um Engenheiro de Processo ou Administrador.',
    origem: 'PidController.ts, PlcService.ts',
    emUso: true,
  },
  'SCD-AUT-002': {
    gravidade: 'ALTO',
    titulo: 'Criptografia indisponível neste navegador',
    descricao: 'A Web Crypto API (crypto.subtle) não existe: ocorre em páginas servidas por HTTP fora de localhost. Sem ela não é possível criar nem verificar PINs com hash.',
    mensagemUsuario: 'Não é possível autenticar neste contexto. Acesse o sistema por HTTPS.',
    repetivel: false,
    acaoOperador: 'Acessar o SCADA por HTTPS (ou localhost). Autenticação falha de forma fechada, nunca libera acesso.',
    origem: 'services/pinHash.ts',
    emUso: true,
  },
  'SCD-AUT-003': {
    gravidade: 'MEDIO',
    titulo: 'Muitas tentativas de assinatura eletrônica',
    descricao: 'Mais de 5 tentativas inválidas para a mesma matrícula em 5 minutos; novas tentativas ficam bloqueadas por 60 segundos.',
    mensagemUsuario: 'Muitas tentativas inválidas. Aguarde alguns instantes e tente novamente.',
    repetivel: true,
    acaoOperador: 'Aguardar o bloqueio terminar. Se não foi você, avisar a segurança da informação.',
    origem: 'services/AuthService.ts (validarAssinaturaEngenheiro)',
    emUso: true,
  },
  'SCD-UI-001': {
    gravidade: 'MEDIO',
    titulo: 'Falha de renderização de um painel',
    descricao: 'Exceção durante a renderização de um componente React, capturada por um ErrorBoundary.',
    mensagemUsuario: 'Este painel encontrou um erro. O restante do sistema continua funcionando.',
    repetivel: true,
    acaoOperador: 'Clicar em "Tentar novamente"; se repetir, trocar de aba e avisar o suporte.',
    origem: 'components/ErrorBoundary.tsx',
    emUso: true,
  },
  'SCD-UI-002': {
    gravidade: 'MEDIO',
    titulo: 'Erro não tratado no navegador',
    descricao: 'Exceção global (window.onerror) ou Promise rejeitada sem tratamento (unhandledrejection).',
    mensagemUsuario: 'Ocorreu um erro inesperado.',
    repetivel: true,
    acaoOperador: 'Se o comportamento estiver anormal, recarregar a página e avisar o suporte.',
    origem: 'services/globalErrorHandlers.ts',
    emUso: true,
  },
} as const satisfies Record<string, DefinicaoErro>;

export type CodigoErro = keyof typeof CATALOGO_ERROS;

export function obterDefinicao(codigo: CodigoErro): DefinicaoErro {
  return CATALOGO_ERROS[codigo];
}

/** Prefixa a mensagem com o código: "[SCD-XXX-000] mensagem". */
export function comCodigo(codigo: CodigoErro, mensagem: string): string {
  return `[${codigo}] ${mensagem}`;
}

/** Resultado explícito de operações que podem falhar: o chamador sabe o motivo, não só "false". */
export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; codigo: CodigoErro; mensagem: string };

export const sucesso = <T>(valor: T): Resultado<T> => ({ ok: true, valor });
export const falha = (codigo: CodigoErro, detalhe?: string): Resultado<never> => ({
  ok: false,
  codigo,
  mensagem: comCodigo(codigo, detalhe ?? CATALOGO_ERROS[codigo].mensagemUsuario),
});

/** Erro com código do catálogo. Mantém a mensagem original e permite tratar por `codigo`. */
export class ScadaError extends Error {
  public readonly codigo: CodigoErro;
  constructor(codigo: CodigoErro, mensagem?: string) {
    super(mensagem ?? CATALOGO_ERROS[codigo].mensagemUsuario);
    this.name = 'ScadaError';
    this.codigo = codigo;
  }
}
