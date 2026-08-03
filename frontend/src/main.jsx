import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css';

// VITE_SENTRY_DSN is optional — if it's not set (e.g. a local dev checkout
// without your own Sentry project), Sentry.init() is skipped entirely and
// the app renders exactly as it did before this feature existed.
const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // 10% of transactions traced — same reasoning as the backend (see
    // backend/src/instrument.js): plenty to demonstrate performance
    // monitoring without burning the free tier's monthly quota.
    tracesSampleRate: 0.1,
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="page-grain flex min-h-screen items-center justify-center px-5">
          <p className="text-destructive-foreground">
            Something went wrong. Please refresh the page.
          </p>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
