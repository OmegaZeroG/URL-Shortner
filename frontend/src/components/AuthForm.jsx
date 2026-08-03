import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { login, signup, isUnexpectedError } from '../api';
import { styles } from '../styles';

export default function AuthForm({ mode, onAuthed, setView }) {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isSignup ? await signup(email, password) : await login(email, password);
      onAuthed(data.token, data.user.email);
    } catch (err) {
      if (isUnexpectedError(err)) Sentry.captureException(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1 style={styles.heading}>{isSignup ? 'Sign Up' : 'Log In'}</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        <input
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          placeholder={isSignup ? 'Password (min 8 characters)' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <button
          style={styles.linkButton}
          onClick={() => setView(isSignup ? 'login' : 'signup')}
        >
          {isSignup ? 'Log in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}
