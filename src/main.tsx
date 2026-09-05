import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CalculatorProvider } from './state/calculator';
import { NspireProvider } from './state/nspire';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <CalculatorProvider>
        <NspireProvider>
          <App />
        </NspireProvider>
      </CalculatorProvider>
    </HashRouter>
  </StrictMode>,
);
