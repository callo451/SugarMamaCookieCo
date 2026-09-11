import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { PortalAuthProvider } from './auth/PortalAuth';
import './admin.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <PortalAuthProvider><App /></PortalAuthProvider>
    </BrowserRouter>
  </StrictMode>
);
