import { useEffect, useState } from 'react';
import { getMyLinks, deleteLink } from '../api';
import { styles } from '../styles';

export default function MyLinks({ token, onViewAnalytics }) {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyLinks(token)
      .then((data) => setLinks(data.links))
      .catch((err) => setError(err.message));
  }, [token]);

  async function handleDelete(code) {
    try {
      await deleteLink(token, code);
      setLinks((prev) => prev.filter((l) => l.shortCode !== code));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={styles.wideCard}>
      <h1 style={styles.heading}>My Links</h1>

      {error && <p style={styles.error}>{error}</p>}
      {links === null && !error && <p style={{ color: '#94a3b8' }}>Loading...</p>}
      {links && links.length === 0 && (
        <p style={{ color: '#94a3b8' }}>
          You haven't shortened any links yet — go to the Shorten tab while logged in.
        </p>
      )}

      {links && links.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Short URL</th>
              <th style={styles.th}>Destination</th>
              <th style={styles.th}>Clicks</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.shortCode}>
                <td style={styles.td}>
                  <a href={link.shortUrl} target="_blank" rel="noreferrer">
                    {link.shortUrl}
                  </a>
                </td>
                <td style={styles.td}>{link.longUrl}</td>
                <td style={styles.td}>{link.clickCount}</td>
                <td style={styles.td}>
                  <button
                    style={styles.analyticsButton}
                    onClick={() => onViewAnalytics(link.shortCode)}
                  >
                    Analytics
                  </button>
                  <button style={styles.deleteButton} onClick={() => handleDelete(link.shortCode)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
