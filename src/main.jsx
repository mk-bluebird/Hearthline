import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { assertValidComponentRegistry } from './lib/componentRegistry.js';

// Validate component registry once at startup
let registryValid = true;
let startupError = null;
try {
  assertValidComponentRegistry();
} catch (err) {
  registryValid = false;
  startupError = err.message;
}

if (!registryValid) {
  // Render a calm local error card
  const errorCard = document.createElement('div');
  errorCard.style.cssText = 'max-width:500px;margin:2rem auto;padding:1.5rem;border:1px solid #ccc;border-radius:8px;font-family:system-ui,sans-serif;background:#fff;';
  errorCard.innerHTML = `
    <h1 style="font-size:1.25rem;margin-bottom:1rem;color:#333;">Startup Error</h1>
    <p style="margin-bottom:1rem;color:#555;">Hearthline could not start its local privacy checks. No information was sent.</p>
    <p style="font-size:0.875rem;color:#666;">Technical details: ${startupError ? startupError.replace(/</g, '&lt;') : 'Unknown error'}</p>
    <button id="reset-btn" style="margin-top:1rem;padding:0.5rem 1rem;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;">Reset local demo data</button>
  `;
  
  const container = document.getElementById('root');
  if (container) {
    container.appendChild(errorCard);
    
    document.getElementById('reset-btn').addEventListener('click', () => {
      try {
        const prefix = 'hearthline-starter:';
        const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        keys.forEach(k => localStorage.removeItem(k));
        window.location.reload();
      } catch (e) {
        alert('Could not clear storage: ' + e.message);
      }
    });
  }
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
