import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { BarChart3, Check, Copy, Trash2 } from 'lucide-react';
import { getMyLinks, deleteLink, isUnexpectedError } from '../api';

export default function MyLinks({ token, onViewAnalytics, onNewLink }) {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    getMyLinks(token)
      .then((data) => setLinks(data.links))
      .catch((err) => {
        if (isUnexpectedError(err)) Sentry.captureException(err);
        setError(err.message);
      });
  }, [token]);

  async function handleDelete(code) {
    try {
      await deleteLink(token, code);
      setLinks((prev) => prev.filter((l) => l.shortCode !== code));
    } catch (err) {
      if (isUnexpectedError(err)) Sentry.captureException(err);
      setError(err.message);
    }
  }

  async function copy(link) {
    await navigator.clipboard?.writeText(link.shortUrl);
    setCopied(link.shortCode);
    setTimeout(() => setCopied(null), 1600);
  }

  const total = (links || []).reduce((sum, l) => sum + l.clickCount, 0);

  return (
    <>
      <header className="rise-in grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold sm:text-4xl">My links</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {links ? `${links.length} links · ${total.toLocaleString()} total clicks` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={onNewLink}
          className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-ember transition-all duration-200 hover:brightness-110 active:scale-[0.99]"
        >
          New link
        </button>
      </header>

      {error && (
        <p className="rise-in mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground">
          {error}
        </p>
      )}

      <div
        className="panel rise-in mt-8 overflow-hidden rounded-2xl"
        style={{ animationDelay: '70ms' }}
      >
        <div className="hidden grid-cols-[1.1fr_1.6fr_5rem_7.5rem] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:grid">
          <span>Short link</span>
          <span>Destination</span>
          <span className="text-right">Clicks</span>
          <span />
        </div>

        {links && links.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            You haven't shortened any links yet — go to the Shorten tab while logged in.
          </p>
        )}

        {(links || []).map((link) => (
          <div
            key={link.shortCode}
            className="grid gap-3 border-b border-border/60 px-5 py-4 transition-colors duration-200 last:border-0 hover:bg-accent/40 sm:grid-cols-[1.1fr_1.6fr_5rem_7.5rem] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-mono text-sm text-primary hover:underline"
              >
                {link.shortUrl.replace(/^https?:\/\//, '')}
              </a>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(link.createdAt).toLocaleDateString()}
              </p>
            </div>

            <p className="min-w-0 truncate text-sm text-muted-foreground">{link.longUrl}</p>

            <p className="font-mono text-sm sm:text-right">
              {link.clickCount.toLocaleString()}
            </p>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => copy(link)}
                aria-label="Copy short link"
                title={copied === link.shortCode ? 'Copied' : 'Copy short link'}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              >
                {copied === link.shortCode ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => onViewAnalytics(link.shortCode)}
                aria-label="View analytics"
                title="View analytics"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(link.shortCode)}
                aria-label="Delete link"
                title="Delete link"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors duration-200 hover:border-destructive/50 hover:bg-destructive/15 hover:text-destructive-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
