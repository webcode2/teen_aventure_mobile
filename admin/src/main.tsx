import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { LegacyHashRedirect } from './guards';
import { ErrorBoundary } from './error-boundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LegacyHashRedirect />
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
