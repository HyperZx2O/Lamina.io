import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import DocsPage from './components/DocsPage.jsx';
import OfflinePage from './components/OfflinePage.jsx';
import './styles/index.css';

// ── PWA registration (deferred) ────────────────────────────────────────────
// We don't want the service worker to compete with the first paint of the
// React tree, so registration kicks off after `load` via workbox-window.
// This file also doubles as a tiny router: anything that isn't `/`,
// `/docs/*`, or `/offline*` falls through to the default SPA shell. The
// service worker will additionally serve `/offline-fallback.html` for any
// unrecognised route hit while the user is offline.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // workbox-window is dynamically imported so it stays out of the
    // initial bundle. Failure to import is non-fatal — the app still works
    // without an SW, just without offline support.
    import('workbox-window')
      .then(({ Workbox }) => {
        const wb = new Workbox('/sw.js', { scope: '/' });
        // Expose the workbox instance for the OfflinePill component, which
        // listens for `offlineReady` / `needRefresh` and surfaces a small
        // "Update available — Reload?" prompt.
        window.__laminaSW = wb;
        wb.addEventListener('waiting', () => {
          window.dispatchEvent(new CustomEvent('lamina-sw-update'));
        });
        wb.addEventListener('offlineReady', () => {
          window.dispatchEvent(new CustomEvent('lamina-sw-offline-ready'));
        });
        wb.register().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[lamina] SW registration failed:', err);
        });
      })
      .catch(() => {
        // workbox-window not installed (e.g. dev mode) — silently noop.
      });
  });
}

function Root() {
  // The router key is bumped on every popstate (back/forward) and on any
  // `lamina:navigate` event the components dispatch. `Root()` only runs
  // once at mount otherwise, so without this, pushState would change the
  // URL bar but leave the React tree showing the previous page.
  const [routeTick, setRouteTick] = useState(0);

  useEffect(() => {
    const onPop = () => setRouteTick((n) => n + 1);
    // Components navigate via `window.history.pushState` + this custom
    // event, so the router re-evaluates the pathname without a full
    // page reload.
    const onNavigate = () => setRouteTick((n) => n + 1);
    window.addEventListener('popstate', onPop);
    window.addEventListener('lamina:navigate', onNavigate);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('lamina:navigate', onNavigate);
    };
  }, []);

  const pathname = window.location.pathname || '/';

  // Docs is its own app shell — render the docs editor without the main
  // header/footer chrome.
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    return <DocsPage key={routeTick} />;
  }

  // Offline hub: catalogue, reader, and quiz all live under /offline*.
  // OfflinePage handles the listing itself and opens PackReader as an
  // overlay when the URL is /offline/pack/:id.
  if (pathname === '/offline' || pathname.startsWith('/offline/')) {
    return <OfflinePage key={routeTick} />;
  }

  return <App key={routeTick} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
