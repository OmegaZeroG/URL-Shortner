import { Link2, LogOut } from 'lucide-react';

export default function Nav({ view, setView, isAuthed, userEmail, onLogout }) {
  const items = isAuthed
    ? [
        { key: 'shorten', label: 'Shorten' },
        { key: 'mylinks', label: 'My Links' },
      ]
    : [{ key: 'shorten', label: 'Shorten' }];

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 sm:flex sm:justify-between">
        <button
          onClick={() => setView('shorten')}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Link2 className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="truncate font-display text-[15px] font-bold tracking-tight">
            trim<span className="text-primary">.</span>link
          </span>
        </button>

        <nav className="flex items-center gap-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors duration-200 ${
                view === item.key
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}

          {isAuthed ? (
            <button
              onClick={onLogout}
              title={userEmail}
              className="ml-1 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          ) : (
            <button
              onClick={() => setView('login')}
              className="ml-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity duration-200 hover:opacity-90"
            >
              Log in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
