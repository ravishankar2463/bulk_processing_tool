import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// @ts-ignore CSS is loaded by the bundler; TypeScript may not have a CSS module declaration.
import './index.css';
import { initFrontendObservability } from './utils/telemetry';
import { ObservabilityErrorBoundary } from './components/observability/ObservabilityErrorBoundary';

// Initialize global frontend telemetry & exception listeners
initFrontendObservability();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ObservabilityErrorBoundary fallbackTitle="Application Portal Error">
      <App />
    </ObservabilityErrorBoundary>
  </React.StrictMode>
);
