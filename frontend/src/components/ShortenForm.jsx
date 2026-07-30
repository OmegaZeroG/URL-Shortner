import { useState } from 'react';
import { shortenUrl } from '../api';
import { styles } from '../styles';

export default function ShortenForm({ token }) {
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
      const data = await shortenUrl({
        longUrl,
        customAlias: customAlias.trim() || undefined,
        token,
      });
      setResult(data);
      setLongUrl('');
      setCustomAlias('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
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

      {!token && (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Log in to save this link under "My Links" and track its clicks.
        </p>
      )}

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
  );
}
