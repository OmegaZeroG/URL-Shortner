import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { ArrowLeft } from 'lucide-react';
import { getLinkAnalytics, isUnexpectedError } from '../api';
import { StatBars, ClicksChart } from './Charts';

export default function Analytics({ token, code, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLinkAnalytics(token, code)
      .then(setData)
      .catch((err) => {
        if (isUnexpectedError(err)) Sentry.captureException(err);
        setError(err.message);
      });
  }, [token, code]);

  if (error) {
    return (
      <div className="panel rounded-2xl p-10 text-center">
        <h1 className="text-2xl font-bold">Couldn't load analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button onClick={onBack} className="mt-6 inline-block text-sm text-primary hover:underline">
          Back to my links
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-sm text-muted-foreground">Loading...</p>;
  }

  const totalClicks = data.clicksByDay.reduce((sum, d) => sum + d.count, 0);
  const peakDay = Math.max(0, ...data.clicksByDay.map((d) => d.count));

  const timeline = data.clicksByDay.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    clicks: d.count,
  }));

  const toEntries = (rows, key) =>
    rows.map((r) => ({ label: r[key], value: r.count }));

  return (
    <>
      <header className="rise-in grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Analytics
          </p>
          <h1 className="mt-2 truncate font-mono text-2xl font-bold sm:text-3xl">{code}</h1>
        </div>
        <button
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">My links</span>
        </button>
      </header>

      <div className="rise-in mt-8 grid gap-4 sm:grid-cols-2" style={{ animationDelay: '60ms' }}>
        {[
          { label: 'Total clicks', value: totalClicks.toLocaleString() },
          { label: 'Peak day', value: peakDay.toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="panel rounded-2xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rise-in mt-4" style={{ animationDelay: '120ms' }}>
        <ClicksChart data={timeline} />
      </div>

      <div className="rise-in mt-4 grid gap-4 sm:grid-cols-2" style={{ animationDelay: '180ms' }}>
        <StatBars title="Device" data={toEntries(data.byDevice, 'device')} />
        <StatBars title="Browser" data={toEntries(data.byBrowser, 'browser')} />
        <StatBars title="Country" data={toEntries(data.byCountry, 'country')} />
        <StatBars title="Referrer" data={toEntries(data.byReferrer, 'referrer')} />
      </div>
    </>
  );
}
