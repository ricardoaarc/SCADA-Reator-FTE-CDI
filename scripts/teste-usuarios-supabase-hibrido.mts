import { authService, normalizarPermissoes, PERMISSOES_PADRAO } from '../src/services/AuthService';
import { esquemaOperador } from '../src/services/esquemasDados';
import { ScadaError } from '../src/services/errorCatalog';
import fs from 'node:fs';

let ok = 0, bad = 0;
const t = (n: string, c: boolean) => {
  console.log((c ? 'PASS ' : 'FAIL ') + n);
  if (c) ok++; else bad++;
};

console.log('--- TESTE: ARQUITETURA HÍBRIDA GESTÃO DE USUÁRIOS & SUPABASE ---');

// 1. Início de Sessão com Privilégio Mínimo (OPERADOR)
authService.encerrarSessao();
const opBasico = authService.getOperadorAtual();
t('Sessão inicializa em perfil básico OPERADOR (IEC 62443 / CFR 21 Part 11)', opBasico.role === 'OPERADOR');

// 2. Operador comum NÃO pode cadastrar usuários (SCD-AUT-001)
let erroSemAdmin: any = null;
try {
  await authService.cadastrarOperador({
    nome: 'Operador Clandestino',
    matricula: 'CLAN-001',
    role: 'ADMIN',
    cargo: 'Falso Administrador',
    email: 'hacker@scada.com',
    zonasAutorizadas: ['ZONA_1_CAPTACAO_POCOS'],
    pin: '889922'
  });
} catch (err) {
  erroSemAdmin = err;
}
t('Cadastro bloqueado com ScadaError SCD-AUT-001 para operador comum', erroSemAdmin instanceof ScadaError && erroSemAdmin.codigo === 'SCD-AUT-001');

// 3. Autenticação formal como Administrador (ADM-001 com PIN 2026)
const authAdmin = await authService.autenticarOperador('ADM-001', '2026');
t('Autenticação como Administrador ADM-001 com PIN 2026 aprovada', authAdmin.sucesso && authService.getOperadorAtual().role === 'ADMIN');

// 4. Administrador cadastrando operador com PIN fraco deve ser RECUSADO
let erroPinFraco: any = null;
try {
  await authService.cadastrarOperador({
    nome: 'Operador Fraco',
    matricula: 'OP-FRK',
    role: 'OPERADOR',
    cargo: 'Operador',
    email: 'fraco@purifywave.com.br',
    zonasAutorizadas: ['ZONA_1_CAPTACAO_POCOS'],
    pin: '123456'
  });
} catch (err: any) {
  erroPinFraco = err;
}
t('PIN fraco/previsível (123456) recusado na criação', erroPinFraco !== null && /fraco|previsível/i.test(erroPinFraco.message));

// 5. Administrador cadastrando operador com dados válidos e PIN seguro
const matNova = `OP-TESTE-${Date.now().toString().slice(-4)}`;
const novoOp = await authService.cadastrarOperador({
  nome: 'Lucas Martins Engenharia',
  matricula: matNova,
  role: 'OPERADOR',
  cargo: 'Técnico de Turno',
  email: `${matNova.toLowerCase()}@purifywave.com.br`,
  zonasAutorizadas: ['ZONA_1_CAPTACAO_POCOS', 'ZONA_3_DESFLUORETACAO_FTE_CDI'],
  pin: '739201'
});
t('Operador criado com sucesso pelo Administrador', novoOp.matricula === matNova && novoOp.role === 'OPERADOR');

// 6. Novo operador consta na lista ativa de operadores do SCADA
const lista = authService.getOperadoresDisponiveis();
t('Novo operador consta na lista do SCADA sem credenciais expostas', lista.some(u => u.matricula === matNova) && !(novoOp as any).pinHash);

// 7. Auditoria CFR 21 Part 11 registrou a criação
const auditoria = (authService as any).historicoAuditoria;
t('Ação registrada na Trilha de Auditoria CFR 21 Part 11 com assinatura', auditoria.some((a: any) => a.acao.includes(matNova) && a.operadorRole === 'ADMIN'));

// 8. Edição do operador criado
const editOk = await authService.atualizarOperador(novoOp.id, {
  cargo: 'Técnico Especialista em Reatores CDI'
});
t('Edição do operador aprovada', editOk === true);
const opEditado = authService.getOperadoresDisponiveis().find(u => u.matricula === matNova);
t('Cargo do operador atualizado na lista', opEditado?.cargo === 'Técnico Especialista em Reatores CDI');

// 9. Exclusão do operador criado
const delOk = authService.excluirOperador(novoOp.id);
t('Exclusão do operador aprovada e removido da lista ativa', delOk === true && !authService.getOperadoresDisponiveis().some(u => u.matricula === matNova));

// --- BATERIA EXCLUSIVA PR-2: SANEAMENTO SCD-DAT-001 & HIGIENE ---

// 10. normalizarPermissoes com objeto vazio {} deve preencher todas as propriedades com o padrão do papel
const normVazioOp = normalizarPermissoes('OPERADOR', {});
t('SCD-DAT-001: Objeto vazio {} normalizado preenche 100% dos campos de OPERADOR',
  normVazioOp.canViewSynoptic === true &&
  normVazioOp.canManageUsers === false &&
  normVazioOp.canOperatePumps === true &&
  typeof normVazioOp.canExportReports === 'boolean'
);

// 11. Menor Privilégio inviolável: OPERADOR com injeção maliciosa de permissões elevadas é sanitizado
const injecaoMaliciosa = {
  canViewSynoptic: true,
  canManageUsers: true,
  canEditLayout: true,
  podeEditarLayout: true,
  canResetInterlocks: true,
  podeRearmarInterlock: true
};
const normMalicioso = normalizarPermissoes('OPERADOR', injecaoMaliciosa);
t('Menor Privilégio: Tentativa de injetar privilégios de Admin em OPERADOR é bloqueada',
  normMalicioso.canManageUsers === false &&
  normMalicioso.canEditLayout === false &&
  normMalicioso.podeEditarLayout === false &&
  normMalicioso.canResetInterlocks === false &&
  normMalicioso.podeRearmarInterlock === false
);

// 12. Validação Estrita: Objeto gerado por normalizarPermissoes passa 100% no esquemaOperador
const perfilComPermissaoNormalizada = {
  id: 'usr-norm-test',
  nome: 'Operador Valido',
  matricula: 'OP-VAL-01',
  role: 'OPERADOR',
  cargo: 'Operador',
  email: 'op@purifywave.com.br',
  ultimoAcesso: new Date().toISOString(),
  permissoes: normVazioOp
};
const erroValidacaoEsquema = esquemaOperador(perfilComPermissaoNormalizada, 'operador');
t('Conformidade: Usuário com permissões normalizadas passa sem erros no esquemaOperador', erroValidacaoEsquema === null);

// 13. Cadastro de operador sem permissões explícitas gera permissões íntegras e completas
const opSemPermissao = await authService.cadastrarOperador({
  nome: 'Operador Padrao',
  matricula: `OP-PAD-${Date.now().toString().slice(-4)}`,
  role: 'OPERADOR',
  cargo: 'Operador Geral',
  email: 'padrao@purifywave.com.br',
  zonasAutorizadas: ['ZONA_1_CAPTACAO_POCOS'],
  pin: '908123'
});
t('Novo cadastro sem permissões manuais recebe conjunto completo (não {})',
  Boolean(
    opSemPermissao.permissoes &&
    typeof opSemPermissao.permissoes.canViewSynoptic === 'boolean' &&
    typeof opSemPermissao.permissoes.canManageUsers === 'boolean' &&
    Object.keys(opSemPermissao.permissoes).length >= 6
  )
);
authService.excluirOperador(opSemPermissao.id);

// 14. Higiene: FteCdiController.ts v1 obsoleto não existe mais
const v1Existe = fs.existsSync('./src/services/FteCdiController.ts');
t('Higiene PR-2: Controlador v1 legado FteCdiController.ts foi excluído com sucesso', v1Existe === false);

// 15. Higiene: Sem arquivos .rej residuais no repositório
const rejEncontrados = fs.readdirSync('.').filter(f => f.endsWith('.rej'));
t('Higiene PR-2: Repositório sem arquivos de rejeição de patch (.rej)', rejEncontrados.length === 0);

console.log(`\nResultado Final: ${ok} passaram, ${bad} falharam`);
process.exit(bad > 0 ? 1 : 0);
