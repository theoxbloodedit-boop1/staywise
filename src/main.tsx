import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root')!;
const ssrRoute = rootEl.getAttribute('data-ssr-route');
const currentPath = (window.location.pathname || '/').replace(/\/+$/, '') || '/';

if (ssrRoute && ssrRoute === currentPath && rootEl.firstElementChild) {
  ReactDOM.hydrateRoot(
    rootEl,
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
