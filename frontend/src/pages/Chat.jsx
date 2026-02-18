import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Chat.module.css';

export default function Chat() {
  const { api } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadSessions = async () => {
    const res = await api('/chat/sessions');
    const data = await res.json();
    if (res.ok) setSessions(data.sessions || []);
  };

  const loadMessages = async (sessionId) => {
    if (!sessionId) return;
    const res = await api(`/chat/sessions/${sessionId}/messages`);
    const data = await res.json();
    if (res.ok) setMessages(data.messages || []);
  };

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    if (currentSession) loadMessages(currentSession.id);
    else setMessages([]);
  }, [currentSession?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createSession = async () => {
    const res = await api('/chat/sessions', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setSessions([{ id: data.id, title: data.title }, ...sessions]);
      setCurrentSession({ id: data.id, title: data.title });
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    let sessionId = currentSession?.id;
    if (!sessionId) {
      const res = await api('/chat/sessions', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create session');
        return;
      }
      sessionId = data.id;
      setCurrentSession({ id: data.id, title: data.title });
      setSessions([{ id: data.id, title: data.title }, ...sessions]);
    }

    setInput('');
    setLoading(true);
    setError('');

    const userMsg = { id: 'temp', role: 'user', content: msg };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await api(`/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessages((m) => [
        ...m.filter((x) => x.id !== 'temp'),
        userMsg,
        data.assistantMessage,
      ]);
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.filter((x) => x.id !== 'temp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.chat}>
      <div className={styles.sidebar}>
        <h2>Sessions</h2>
        <button onClick={createSession} className={styles.newBtn}>New session</button>
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setCurrentSession(s)}
            className={currentSession?.id === s.id ? styles.sessionActive : styles.session}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className={styles.main}>
        <h1>Playground</h1>
        <p className={styles.sub}>Ask questions. Responses use your knowledge base via RAG.</p>

        <div className={styles.messages}>
          {messages.length === 0 && !loading && (
            <p className={styles.placeholder}>Type a message to start. The AI will use your documents to answer.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? styles.userMsg : styles.assistantMsg}>
              {m.content}
            </div>
          ))}
          {loading && <div className={styles.assistantMsg}>...</div>}
          <div ref={bottomRef} />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className={styles.form}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
