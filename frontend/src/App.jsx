import { useState } from 'react';
import Nav from './components/Nav';
import ShortenForm from './components/ShortenForm';
import AuthForm from './components/AuthForm';
import MyLinks from './components/MyLinks';
import Analytics from './components/Analytics';
import { styles } from './styles';

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

  return (
    <div style={styles.page}>
      <Nav
        view={view}
        setView={setView}
        isAuthed={isAuthed}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {view === 'shorten' && <ShortenForm token={token} />}
      {view === 'login' && <AuthForm mode="login" onAuthed={handleAuthed} setView={setView} />}
      {view === 'signup' && <AuthForm mode="signup" onAuthed={handleAuthed} setView={setView} />}
      {view === 'mylinks' && isAuthed && (
        <MyLinks token={token} onViewAnalytics={handleViewAnalytics} />
      )}
      {view === 'analytics' && isAuthed && analyticsCode && (
        <Analytics token={token} code={analyticsCode} onBack={() => setView('mylinks')} />
      )}
    </div>
  );
}
