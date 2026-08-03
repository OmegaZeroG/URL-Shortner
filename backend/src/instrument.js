// Sentry MUST be initialized before any other module in the app is
// required — that's how its auto-instrumentation (Express, pg, http, etc.)
// is able to patch those modules on the way in. This is why server.js
// requires this file as its very first line, before it requires app.js.
//
// SENTRY_DSN is optional on purpose: if it's not set (e.g. running locally
// without your own Sentry project), Sentry.init() is simply skipped and
// captureError() becomes a no-op — the app runs exactly as it did before
// this feature existed, it never hard-fails on a missing DSN.
require('dotenv').config();
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // 10% of transactions traced — plenty for a portfolio-scale project to
    // demonstrate performance monitoring without burning the free tier's
    // monthly transaction quota.
    tracesSampleRate: 0.1,
  });
  console.log('Sentry initialized (backend error tracking active)');
} else {
  console.warn('SENTRY_DSN not set — Sentry error tracking is disabled.');
}

// The app's controllers already catch their own errors (try/catch ->
// console.error -> res.status(500)) rather than calling next(err), which
// means Express's built-in error-handling middleware — including Sentry's
// setupExpressErrorHandler — never sees them. captureError() is called
// explicitly alongside each of those console.error() calls so Sentry
// actually receives the errors that matter, instead of only the rare
// uncaught ones. See app.js for the setupExpressErrorHandler wiring, which
// still catches anything that truly does go uncaught.
function captureError(err) {
  if (dsn) Sentry.captureException(err);
}

module.exports = { Sentry, captureError };
