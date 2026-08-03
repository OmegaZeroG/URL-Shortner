import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { shortenUrl, isUnexpectedError } from '../api';
import { styles } from '../styles';

export default function ShortenForm({ token }) {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [idStrategy, setIdStrategy] = useState('counter');
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
        idStrategy,
        token,
      });
      setResult(data);
      setLongUrl('');
      setCustomAlias('');
    } catch (err) {
      if (isUnexpectedError(err)) Sentry.captureException(err);
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
        <select
          value={idStrategy}
          onChange={(e) => setIdStrategy(e.target.value)}
          style={styles.input}
          disabled={!!customAlias.trim()}
          title={
            customAlias.trim()
              ? 'ID strategy is ignored when a custom alias is set'
              : 'How the short code is generated'
          }
        >
          <option value="counter">Counter + Base62 (default, shortest code)</option>
          <option value="snowflake">Snowflake ID (distributed, longer code)</option>
        </select>
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Shortening...' : 'Shorten'}
        </button>
      </form>

      {!token && (
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Log in to save this link under "My Links" and track its clicks.
        </p>
      )}

      <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.5rem' }}>
        Snowflake IDs are generated per-request with no shared DB counter — the
        trade-off is a longer short code (~11 chars vs 1-2).
      </p>

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
