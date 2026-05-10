import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './popup_view';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Popup root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
