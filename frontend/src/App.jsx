import { useState } from 'react';
import Nav from './components/Nav';
import ShortenForm from './components/ShortenForm';
import AuthForm from './components/AuthForm';
import MyLinks from './components/MyLinks';
import Analytics from './components/Analytics';

const TOKEN_KEY = 'url_shortener_token';
const EMAIL_KEY = 'url_shortener_email';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || '');
  const [view, setView] = useState('shorten');
  const [analyticsCode, setAnalyticsCode] = useState(null);

  function handleAuthed(newToken, email) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EMAIL_KEY, email);
    setToken(newToken);
    setUserEmail(email);
    setView('mylinks');
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken('');
    setUserEmail('');
    setView('shorten');
  }

  function handleViewAnalytics(code) {
    setAnalyticsCode(code);
    setView('analytics');
  }

  const isAuthed = Boolean(token);

  // Login/signup get a standalone full-screen layout (no top nav) — matches
  // the reference design, where auth is a deliberately quiet, focused page.
  if (view === 'login' || view === 'signup') {
    return (
      <AuthForm
        mode={view}
        onAuthed={handleAuthed}
        setView={setView}
      />
    );
  }

  return (
    <div className="page-grain min-h-screen">
      <Nav
        view={view}
        setView={setView}
        isAuthed={isAuthed}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:pt-16">
        {view === 'shorten' && <ShortenForm token={token} />}
        {view === 'mylinks' && isAuthed && (
          <MyLinks
            token={token}
            onViewAnalytics={handleViewAnalytics}
            onNewLink={() => setView('shorten')}
          />
        )}
        {view === 'analytics' && isAuthed && analyticsCode && (
          <Analytics token={token} code={analyticsCode} onBack={() => setView('mylinks')} />
        )}
      </main>
    </div>
  );
}
