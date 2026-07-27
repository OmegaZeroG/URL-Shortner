import { useState } from 'react';
import { shortenUrl } from './api';

export default function App() {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await shortenUrl({ longUrl, customAlias: customAlias.trim() || undefined });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>URL Shortener</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="url"
            required
            placeholder="Paste a long URL..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Custom alias (optional)"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Shortening...' : 'Shorten'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {result && (
          <div style={styles.result}>
            <a href={result.shortUrl} target="_blank" rel="noreferrer">
              {result.shortUrl}
            </a>
            <button
              style={styles.copyButton}
              onClick={() => navigator.clipboard.writeText(result.shortUrl)}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '480px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  heading: { color: '#f1f5f9', marginBottom: '1.5rem', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  error: { color: '#f87171', marginTop: '1rem' },
  result: {
    marginTop: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0f172a',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
  },
  copyButton: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: 'none',
    background: '#334155',
    color: '#f1f5f9',
    cursor: 'pointer',
  },
};
