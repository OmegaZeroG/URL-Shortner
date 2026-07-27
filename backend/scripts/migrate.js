// Simple migration runner: executes every .sql file in migrations/ (in
// filename order) against DATABASE_URL. Run with: npm run migrate
//
// This is intentionally minimal — it doesn't track which migrations have
// already run. For this project's size, migrations are written to be
// idempotent (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS), so
// re-running the whole set is always safe.

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function runMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in', MIGRATIONS_DIR);
    return;
  }

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Running migration: ${file}`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      console.error(`  ✗ ${file} failed:`, err.message);
      process.exitCode = 1;
      break;
    }
  }

  await pool.end();
}

runMigrations();
