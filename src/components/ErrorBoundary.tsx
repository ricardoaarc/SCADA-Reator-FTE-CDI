/**
 * ErrorBoundary: isola falhas de renderização (SCD-UI-001).
 *
 * Sem ele, uma exceção em qualquer painel desmonta a árvore React inteira e deixa a tela do
 * operador em branco. Com ele, só o painel com defeito mostra o aviso; o resto do supervisório
 * (navegação, alarmes, interlock) continua funcionando.
 *
 * Uso: <ErrorBoundary nome="Gateway Modbus" key={abaAtiva}>...</ErrorBoundary>
 * (a `key` faz o boundary reiniciar sozinho quando o operador troca de aba).
 */

import React from 'react';
import { dbInstance } from '../services/database';
import { comCodigo } from '../services/errorCatalog';

interface Props {
  nome: string;
  /** 'raiz' = tela cheia com botão de recarregar; 'painel' (padrão) = aviso dentro da área de conteúdo. */
  nivel?: 'painel' | 'raiz';
  children: React.ReactNode;
}

interface Estado {
  erro: Error | null;
}

const ultimosRegistros = new Map<string, number>();

export class ErrorBoundary extends React.Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: React.ErrorInfo): void {
    console.error(`[SCD-UI-001] Falha ao renderizar "${this.props.nome}":`, erro, info.componentStack);

    // Alarme fora da fase de renderização (evita atualizar estado durante o commit) e no máximo 1x/30 s por painel+erro
    const chave = `${this.props.nome}:${erro.message}`;
    const agora = Date.now();
    if (agora - (ultimosRegistros.get(chave) ?? 0) < 30_000) return;
    ultimosRegistros.set(chave, agora);

    setTimeout(() => {
      try {
        dbInstance.inserirAlarme(
          'ALERTA',
          comCodigo('SCD-UI-001', `Falha ao renderizar o painel "${this.props.nome}": ${erro.message}`),
          null,
          'SCD-UI-001'
        );
      } catch (e) {
        console.error('Não foi possível gravar o alarme SCD-UI-001:', e);
      }
    }, 0);
  }

  private tentarNovamente = () => this.setState({ erro: null });

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const raiz = this.props.nivel === 'raiz';
    return (
      <div
        role="alert"
        className={`${raiz ? 'min-h-screen flex items-center justify-center p-6 bg-[#0a0e17]' : 'p-2'}`}
      >
        <div className="max-w-xl w-full rounded-xl border border-red-700 bg-red-950/40 p-5 text-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-300">
            [SCD-UI-001] {raiz ? 'O supervisório encontrou um erro' : `Falha no painel "${this.props.nome}"`}
          </h2>
          <p className="text-xs mt-2 text-slate-300">
            {raiz
              ? 'A tela precisou ser interrompida. Os alarmes e o interlock do controlador não dependem desta tela.'
              : 'Este painel encontrou um erro. O restante do sistema continua funcionando: você pode trocar de aba.'}
          </p>
          <details className="mt-3 text-[11px] font-mono text-slate-400">
            <summary className="cursor-pointer">Detalhes técnicos</summary>
            <pre className="mt-1 whitespace-pre-wrap break-words">{erro.message}</pre>
          </details>
          <div className="mt-4 flex gap-2">
            <button
              onClick={this.tentarNovamente}
              className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold"
            >
              Tentar novamente
            </button>
            {raiz && (
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              >
                Recarregar página
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
