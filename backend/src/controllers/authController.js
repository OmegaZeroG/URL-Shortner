const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

async function signup(req, res) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const insert = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    const user = insert.rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    // Same error for "no such user" and "wrong password" — don't leak which
    // one it was, that's an account-enumeration vector.
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login };
