import { styles } from '../styles';

export default function Nav({ view, setView, isAuthed, userEmail, onLogout }) {
  return (
    <nav style={styles.nav}>
      <button style={styles.navButton(view === 'shorten')} onClick={() => setView('shorten')}>
        Shorten
      </button>
      {isAuthed ? (
        <>
          <button style={styles.navButton(view === 'mylinks')} onClick={() => setView('mylinks')}>
            My Links
          </button>
          <button style={styles.navButton(false)} onClick={onLogout}>
            Logout ({userEmail})
          </button>
        </>
      ) : (
        <>
          <button style={styles.navButton(view === 'login')} onClick={() => setView('login')}>
            Login
          </button>
          <button style={styles.navButton(view === 'signup')} onClick={() => setView('signup')}>
            Sign Up
          </button>
        </>
      )}
    </nav>
  );
}
