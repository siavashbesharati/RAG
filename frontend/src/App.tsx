import React, { useState, useEffect } from 'react';
import AuthPage from './AuthPage';
import AdminPage from './AdminPage';

// Friendly error messages for common API errors
function friendlyError(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('unauthorized') || lower.includes('invalid token') || lower.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (lower.includes('api keys') || lower.includes('not configured') || lower.includes('administrator')) {
    return raw;
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return "We couldn't reach the server. Please check your connection and try again.";
  }
  if (lower.includes('voyage') || lower.includes('embedding')) {
    return "There was a problem with the embedding service. Please check that your Voyage API key is correct in the Admin panel.";
  }
  if (lower.includes('gemini') || lower.includes('generativelanguage')) {
    return "There was a problem with the AI service. Please check that your Gemini API key is correct in the Admin panel.";
  }
  if (lower.includes('mistral')) {
    return "There was a problem with the AI service. Please check that your Mistral API key is correct in the Admin panel.";
  }
  if (lower.includes('pinecone')) {
    return "There was a problem with the vector database. Please check your Pinecone API key and index name in the Admin panel.";
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return "The request took too long. Please try again in a moment.";
  }
  if (lower.includes('invalid array length') || lower.includes('heap') || lower.includes('out of memory')) {
    return "The document may be too large. Try a smaller document, or restart the server and try again.";
  }
  if (raw && raw.length > 0) return raw;
  return "Something went wrong. Please try again.";
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string>('user');
  const [sessionId, setSessionId] = useState('session-1');
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [docText, setDocText] = useState('');
  const [tab, setTab] = useState<'chat' | 'ingest' | 'admin'>('chat');
  const [ingestStatus, setIngestStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const stored = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('username');
    const storedRole = localStorage.getItem('role');
    if (stored) {
      setToken(stored);
      setUsername(storedUser);
      if (storedRole) setRole(storedRole);
    }
  }, []);

  function handleLogin(newToken: string, newUsername: string, newRole: string) {
    setToken(newToken);
    setUsername(newUsername);
    setRole(newRole);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('role', newRole);
  }

  function handleLogout() {
    setToken(null);
    setUsername(null);
    setRole('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setMessages([]);
    setIngestStatus(null);
  }

  async function send() {
    if (!input) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setInput('');
    setChatLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(base + '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMessages((m) => [...m, { role: 'assistant', text: friendlyError(data.error || 'Something went wrong.') }]);
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: data.answer || "I don't have an answer for that right now." }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: friendlyError(e.message || 'Connection error.') }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function ingest() {
    if (!docText.trim()) {
      setIngestStatus({ type: 'error', msg: 'Please paste some document text first.' });
      return;
    }
    setIngestStatus(null);
    setIngestLoading(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(base + '/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: docText, metadata: {} }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setIngestStatus({ type: 'error', msg: friendlyError(data.error || 'Ingestion failed.') });
      } else {
        setIngestStatus({ type: 'success', msg: 'Document ingested successfully!' });
        setDocText('');
      }
    } catch (e: any) {
      setIngestStatus({ type: 'error', msg: friendlyError(e.message || 'Connection error.') });
    } finally {
      setIngestLoading(false);
    }
  }

  if (!token) {
    return <AuthPage onLogin={handleLogin} darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 transition-colors duration-500">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white transition-colors duration-300">Quantivo Smart Support</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-lg transition-transform duration-500">{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300 transition-colors duration-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">{username}</span>
              {role && <span className="ml-1.5 text-slate-400 dark:text-slate-500">({role})</span>}
            </span>
            <button className="btn-secondary text-sm dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8 transition-colors duration-500">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit mb-8 transition-colors duration-500">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              tab === 'chat' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            onClick={() => setTab('chat')}
          >
            Chat
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
              tab === 'ingest' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            onClick={() => setTab('ingest')}
          >
            Ingest
          </button>
          {role === 'admin' && (
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                tab === 'admin' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              onClick={() => setTab('admin')}
            >
              Admin
            </button>
          )}
        </div>

        {/* Chat */}
        {tab === 'chat' && (
          <div className="card dark:bg-slate-800 dark:border-slate-700 transition-all duration-500">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">Session ID</label>
              <input
                type="text"
                className="input-field max-w-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 h-96 overflow-y-auto mb-4 space-y-4 shadow-lg dark:shadow-slate-900/50 transition-all duration-500">
              {messages.length === 0 && !chatLoading ? (
                <p className="text-slate-400 dark:text-slate-500 text-center py-8 text-sm transition-colors duration-300">Start a conversation with Maria...</p>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <img
                        src={m.role === 'user' ? `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=64748b&color=fff&size=96` : 'https://ui-avatars.com/api/?name=Maria&background=6366f1&color=fff&size=96'}
                        alt={m.role === 'user' ? 'You' : 'Maria'}
                        className="w-10 h-10 rounded-full shrink-0 object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
                      />
                      <div
                        className={`flex flex-col max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <span className={`text-xs font-medium mb-1 ${m.role === 'user' ? 'text-slate-600 dark:text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {m.role === 'user' ? (username || 'You') : 'Maria'}
                        </span>
                        <div
                          className={`p-3 rounded-2xl shadow-md transition-all duration-300 ${
                            m.role === 'user'
                              ? 'bg-slate-900 dark:bg-slate-600 text-white rounded-tr-sm'
                              : 'bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{m.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <img
                        src="https://ui-avatars.com/api/?name=Maria&background=6366f1&color=fff&size=96"
                        alt="Maria"
                        className="w-10 h-10 rounded-full shrink-0 object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
                      />
                      <div className="flex flex-col items-start max-w-[80%]">
                        <span className="text-xs font-medium mb-1 text-indigo-600 dark:text-indigo-400">Maria</span>
                        <div className="p-3 rounded-2xl rounded-tl-sm shadow-md bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600">
                          <div className="flex gap-1">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && send()}
              />
              <button
                className="btn-primary shrink-0 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={send}
                disabled={chatLoading}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Ingest */}
        {tab === 'ingest' && (
          <div className="card dark:bg-slate-800 dark:border-slate-700 transition-all duration-500">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 transition-colors duration-300">Document text</label>
            <textarea
              className="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
              rows={12}
              placeholder="Paste your document or knowledge base text here..."
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
            />
            {ingestStatus && (
              <div className={`mt-4 ${ingestStatus.type === 'success' ? 'success-banner dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200' : 'error-banner dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'}`}>
                {ingestStatus.msg}
              </div>
            )}
            <button
              className="btn-primary mt-4 w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed dark:bg-slate-600 dark:hover:bg-slate-500"
              onClick={ingest}
              disabled={ingestLoading}
            >
              {ingestLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ingesting...
                </>
              ) : (
                'Ingest document'
              )}
            </button>
          </div>
        )}

        {tab === 'admin' && role === 'admin' && <AdminPage token={token} />}
      </main>
    </div>
  );
}
