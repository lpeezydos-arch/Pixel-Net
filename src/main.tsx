import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/source-sans-3';
import './styles/tokens.css';
import './app.css';
import { App } from './App';
import { startAnalytics } from './analytics';

startAnalytics(import.meta.env.VITE_GA_ID);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
