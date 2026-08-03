import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { Link2 } from 'lucide-react';
import { login, signup, isUnexpectedError } from '../api';

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
    <div className="page-grain flex min-h-screen items-center justify-center px-5 py-16">
      <div className="rise-in w-full max-w-sm">
        <button
          onClick={() => setView('shorten')}
          className="mx-auto flex w-fit items-center gap-2.5"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Link2 className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-base font-bold tracking-tight">
            trim<span className="text-primary">.</span>link
          </span>
        </button>

        <div className="panel mt-8 rounded-3xl p-7">
          <h1 className="text-2xl font-bold">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isSignup
              ? 'Start shortening and tracking links in seconds.'
              : 'Log in to manage your links and analytics.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-[15px] outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-ring/25"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Password
              </label>
              <input
                type="password"
                required
                minLength={isSignup ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
                className="mt-2 w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-[15px] outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-4 focus:ring-ring/25"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive-foreground">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-ember transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : 'New here? '}
            <button
              onClick={() => setView(isSignup ? 'login' : 'signup')}
              className="text-primary hover:underline"
            >
              {isSignup ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <button onClick={() => setView('shorten')} className="hover:text-foreground">
            ← Back to shortener
          </button>
        </p>
      </div>
    </div>
  );
}
