// Hand-rolled bar/column charts styled to match the "Ink & Ember" design —
// no charting library needed, just divs sized with inline `width`/`height`
// percentages. Kept deliberately simple: this project's data volume (clicks
// per link) never needs virtualization or complex scales.

export function StatBars({ title, data }) {
  // data: [{ label, value }], already whatever order the API returned.
  const entries = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...entries.map((e) => e.value));

  return (
    <section className="panel rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
        {entries.map((entry, i) => (
          <div key={entry.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm">{entry.label}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {entry.value}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bar-grow h-full rounded-full bg-gradient-to-r from-primary to-ember-soft"
                style={{
                  width: `${(entry.value / max) * 100}%`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClicksChart({ data }) {
  // data: [{ date, clicks }]
  const max = Math.max(1, ...data.map((d) => d.clicks));

  return (
    <section className="panel rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Clicks over time
      </h3>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No clicks yet.</p>
      ) : (
        <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">
          {data.map((point, i) => (
            <div
              key={point.date}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="flex w-full flex-1 flex-col justify-end gap-2">
                <span className="text-center font-mono text-[10px] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {point.clicks}
                </span>
                <div
                  className="rise-in mx-auto w-full max-w-14 rounded-t-lg bg-gradient-to-t from-primary/25 to-primary transition-all duration-300 group-hover:to-ember-soft"
                  style={{
                    height: `${Math.max(4, (point.clicks / max) * 100)}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
              <span className="truncate text-[10px] text-muted-foreground">{point.date}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
