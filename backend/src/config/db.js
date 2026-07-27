const { Pool } = require('pg');
require('dotenv').config();

// Single shared connection pool. Reused across all queries in the app —
// never create a new Pool per-request, that's what kills Postgres connection
// limits under load.
//
// Neon (and most hosted Postgres) require SSL. Local Postgres doesn't use it,
// so we only enable it when DATABASE_URL isn't pointing at localhost.
const isLocal = (process.env.DATABASE_URL || '').includes('localhost');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(1);
});

module.exports = pool;
