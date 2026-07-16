import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FullPageMessage } from './components/FullPage';
import { ConfigError, loadConfig } from './config';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing');
const root = createRoot(container);

// Config is fetched before first render: splash (index.html) until then (SPEC §3).
loadConfig()
  .then((config) => {
    root.render(
      <StrictMode>
        <App config={config} />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    const detail =
      error instanceof ConfigError
        ? error.message
        : 'Unexpected error while loading configuration.';
    root.render(<FullPageMessage tone="error" title="Configuration error" detail={detail} />);
  });
