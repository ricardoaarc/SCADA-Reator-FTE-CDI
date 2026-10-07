import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { instalarHandlersGlobais, instalarAlarmesDeIntegridade } from './services/globalErrorHandlers.ts';

// Captura erros fora da renderização (timers, eventos, Promises sem .catch)
instalarHandlersGlobais();
// Dados salvos inválidos ou não gravados viram alarme (SCD-DAT-001/002)
instalarAlarmesDeIntegridade();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary nome="Aplicação" nivel="raiz">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
