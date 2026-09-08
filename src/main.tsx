import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enforce HTTPS across non-local public network environments (client-side defense-in-depth)
if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local')) {
    window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
