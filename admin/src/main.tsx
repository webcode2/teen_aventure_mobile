import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { LegacyHashRedirect } from './guards';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LegacyHashRedirect />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
