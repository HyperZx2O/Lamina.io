import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import DocsPage from './components/DocsPage.jsx';
import './styles/index.css';

function Root() {
  const pathname = window.location.pathname || '/';
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    return <DocsPage />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
