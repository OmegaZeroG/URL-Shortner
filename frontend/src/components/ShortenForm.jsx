import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { ArrowRight, Check, Copy, Sparkles } from 'lucide-react';
import { shortenUrl, isUnexpectedError } from '../api';

const strategies = [
  {
    value: 'counter',
    label: 'Counter + Base62 (default)',
    hint: 'Shortest possible codes (1-2 chars at this scale) from a single shared DB sequence.',
  },
  {
    value: 'snowflake',
    label: 'Snowflake ID',
    hint: 'Distributed, no shared DB counter — the trade-off is a longer code (~11 chars).',
  },
];

export default function ShortenForm({ token }) {
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [idStrategy, setIdStrategy] = useState('counter');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const active = strategies.find((s) => s.value === idStrategy);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setCopied(false);
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

  async function copy() {
    if (!result) return;
    await navigator.clipboard?.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <div className="rise-in mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Real Redis caching, real load-test numbers, real deploys
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl">
          Long links in.
          <br />
          <span className="bg-gradient-to-r from-primary to-ember-soft bg-clip-text text-transparent">
            Sharp links out.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Shorten a URL, optionally pick how the short code is generated, and
          track every click once you're logged in.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel rise-in mx-auto mt-10 max-w-2xl rounded-3xl p-6 sm:p-8"
        style={{ animationDelay: '80ms' }}
      >
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Destination URL
        </label>
        <input
          type="url"
          required
          value={longUrl}
          onChange={(e) => setLongUrl(e.target.value)}
          placeholder="https://example.com/a/very/long/path"
          className="mt-2.5 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-[15px] outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-ring/25"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Custom alias
            </label>
            <input
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value.replace(/\s/g, ''))}
              placeholder="optional"
              className="mt-2.5 w-full rounded-xl border border-input bg-background/60 px-4 py-3 font-mono text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-ring/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              ID strategy
            </label>
            <select
              value={idStrategy}
              onChange={(e) => setIdStrategy(e.target.value)}
              disabled={!!customAlias.trim()}
              title={
                customAlias.trim()
                  ? 'ID strategy is ignored when a custom alias is set'
                  : 'How the short code is generated'
              }
              className="mt-2.5 w-full appearance-none rounded-xl border border-input bg-background/60 px-4 py-3 text-[15px] outline-none transition-all duration-200 focus:border-primary/60 focus:ring-4 focus:ring-ring/25 disabled:opacity-50"
            >
              {strategies.map((s) => (
                <option key={s.value} value={s.value} className="bg-surface">
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          {active.hint}
        </p>

        {!token && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Log in to save this link under "My Links" and track its clicks.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-ember transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {loading ? 'Shortening...' : 'Shorten link'}
          {!loading && (
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          )}
        </button>

        {result && (
          <div className="rise-in mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Your short link
              </p>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate font-mono text-[15px] text-primary hover:underline"
              >
                {result.shortUrl}
              </a>
            </div>
            <button
              type="button"
              onClick={copy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-sm transition-colors duration-200 hover:bg-accent"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </form>
    </>
  );
}
