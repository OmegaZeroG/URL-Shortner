const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Sentry } = require('./instrument');
const pool = require('./config/db');
const linkRoutes = require('./routes/linkRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Render (and most PaaS platforms) sit behind a reverse proxy. Without this,
// req.ip returns the proxy's internal IP for every single request instead
// of the real client IP — silently breaking both the per-IP rate limiter
// (middleware/rateLimiter.js) and geo lookups (utils/geo.js), since every
// request would appear to come from the same "IP." This tells Express to
// trust the X-Forwarded-For header set by Render's proxy (one hop).
app.set('trust proxy', 1);

// Standard secure headers (CSP, HSTS, X-Frame-Options, etc.) — disable
// contentSecurityPolicy's default directives since this is a JSON API, not
// a page that serves its own HTML/scripts; a strict default CSP has no
// effect here and just adds noise to headers.
app.use(helmet({ contentSecurityPolicy: false }));

// Locked down to specific origins instead of the previous wildcard — set
// FRONTEND_ORIGIN to a comma-separated list in .env (defaults to the local
// Vite dev server). Requests with no Origin header (curl, server-to-server,
// the GET /:code redirect itself since that's a top-level browser
// navigation, not a fetch/XHR) are always allowed — CORS only governs
// cross-origin fetch/XHR calls, it has no effect on direct navigation.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json());

// Touches Postgres (not just the Node process) so an external keep-alive
// ping (e.g. UptimeRobot) also prevents the DB provider's own idle-suspend,
// not just Render's. Redis isn't pinged here — it's already exercised on
// every real redirect, and its idle-suspend behavior isn't a concern for
// this project's free tier.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Health check DB query failed:', err.message);
    res.status(503).json({ status: 'error', error: 'Database unreachable' });
  }
});

app.use('/', authRoutes);
app.use('/', linkRoutes);

// Catches anything that reaches Express's error-handling chain via
// next(err) or a synchronous throw in middleware (e.g. a malformed-JSON
// body from express.json()). Most of this app's own errors are already
// caught inside each controller and reported via captureError() instead
// (see instrument.js) — this is the safety net for what isn't.
Sentry.setupExpressErrorHandler(app);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
