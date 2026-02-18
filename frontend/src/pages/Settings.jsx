import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Settings.module.css';

export default function Settings() {
  const { api } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const res = await api('/api-keys');
    const data = await res.json();
    if (res.ok) setApiKeys(data.apiKeys || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await api('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'Channel Integration' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data);
        load();
      }
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key? Integrations using it will stop working.')) return;
    const res = await api(`/api-keys/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNewKey(null);
      load();
    }
  };

  return (
    <div className={styles.page}>
      <h1>Settings</h1>
      <p className={styles.sub}>API keys for channel integrations (WhatsApp, Telegram, Instagram, website, etc.)</p>

      <section className={styles.section}>
        <h2>API Keys</h2>
        <p className={styles.desc}>
          Use your API key to call the channel chat endpoint from external services. Include it in the <code>X-API-Key</code> header.
        </p>
        <button onClick={createKey} disabled={creating} className={styles.btn}>
          {creating ? 'Creating...' : 'Create API key'}
        </button>

        {newKey && (
          <div className={styles.newKeyBox}>
            <p className={styles.warning}>{newKey.warning}</p>
            <code className={styles.key}>{newKey.apiKey}</code>
          </div>
        )}

        {loading ? (
          <p className={styles.muted}>Loading...</p>
        ) : apiKeys.length === 0 ? (
          <p className={styles.muted}>No API keys yet.</p>
        ) : (
          <ul className={styles.list}>
            {apiKeys.map((k) => (
              <li key={k.id} className={styles.item}>
                <span>{k.name || 'API Key'}</span>
                <span className={styles.date}>{new Date(k.created_at).toLocaleDateString()}</span>
                <button onClick={() => revokeKey(k.id)} className={styles.revoke}>Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>Channel API</h2>
        <p className={styles.desc}>POST to your channel endpoint:</p>
        <pre className={styles.code}>
{`POST /api/channels/chat
Headers:
  X-API-Key: your-api-key
  Content-Type: application/json

Body:
{
  "message": "Customer question here",
  "session_id": "optional-session-id",
  "channel": "whatsapp"
}

Response:
{
  "reply": "AI response based on your knowledge base"
}`}
        </pre>
      </section>
    </div>
  );
}
