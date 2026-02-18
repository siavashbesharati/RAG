import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const nav = [
    { path: '/', label: 'Dashboard' },
    { path: '/documents', label: 'Documents' },
    { path: '/chat', label: 'Chat' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>RAG Support</Link>
        <nav className={styles.nav}>
          {nav.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={location.pathname === path ? styles.navActive : styles.navLink}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.user}>
          <span className={styles.userName}>{user?.name || user?.email}</span>
          <button onClick={handleLogout} className={styles.logout}>Logout</button>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
