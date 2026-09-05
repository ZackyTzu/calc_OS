import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { CalculatorProvider } from './state/calculator';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <CalculatorProvider>
        <App />
      </CalculatorProvider>
    </HashRouter>
  </StrictMode>,
);
