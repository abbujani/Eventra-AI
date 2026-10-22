import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.js';
import { AppProvider } from './store/appStore.js';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

// Static hosting (GitHub Pages) serves the app from a sub-path such as
// `/Eventra-AI/`; Vite's BASE_URL keeps the router in sync with it.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
