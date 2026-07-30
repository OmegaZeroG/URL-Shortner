const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const linkRoutes = require('./routes/linkRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
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

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
