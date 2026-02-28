import React, { useState } from 'react';

interface AuthPageProps {
  onLogin: (token: string, username: string, role: string) => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}

function friendlyAuthError(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('invalid') && lower.includes('password')) return 'Invalid username or password. Please try again.';
  if (lower.includes('username') && lower.includes('taken')) return 'This username is already taken. Try a different one.';
  if (lower.includes('required')) return 'Please enter both username and password.';
  if (lower.includes('network') || lower.includes('fetch')) return "We couldn't reach the server. Check your connection and try again.";
  if (raw && raw.length > 0) return raw;
  return 'Something went wrong. Please try again.';
}

export default function AuthPage({ onLogin, darkMode = false, onToggleDark }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '';
      const endpoint = base + (isLogin ? '/api/auth/login' : '/api/auth/register');
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const text = await resp.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || 'Request failed' };
      }
      if (!resp.ok) {
        setError(friendlyAuthError(data.error || `Request failed (${resp.status})`));
        return;
      }
      if (!data.token) {
        setError('Something went wrong. Please try again.');
        return;
      }
      onLogin(data.token, username.trim(), data.role || 'user');
    } catch (e: any) {
      setError(friendlyAuthError(e.message || 'Connection error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4">
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className="text-lg transition-transform duration-500">{darkMode ? '☀️' : '🌙'}</span>
          </button>
        )}
      </div>
      <div className="card w-full max-w-sm dark:bg-slate-800 dark:border-slate-700 transition-all duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white transition-colors duration-300">Quantivo</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm transition-colors duration-300">Smart Support AI</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="error-banner dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">{error}</div>}
          <button
            className="btn-primary w-full dark:bg-slate-600 dark:hover:bg-slate-500"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="text-slate-900 dark:text-slate-200 font-medium hover:underline"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
