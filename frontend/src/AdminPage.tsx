import React, { useState, useEffect } from 'react';

interface ConfigRecord {
  key: string;
  value: any;
  description?: string | null;
  type?: string | null;
  updatedAt?: number;
}

const KEY_LABELS: Record<string, string> = {
  VOYAGE_API_KEY: 'Voyage AI API Key',
  PINECONE_API_KEY: 'Pinecone API Key',
  PINECONE_INDEX: 'Pinecone Index Name',
  LLM_PROVIDER: 'LLM Provider',
  GEMINI_API_KEY: 'Gemini API Key',
  MISTRAL_API_KEY: 'Mistral API Key',
};

export default function AdminPage({ token }: { token: string | null }) {
  const [records, setRecords] = useState<ConfigRecord[]>([]);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    if (!token) return;
    setError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(base + '/api/admin/config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        const arr = Array.isArray(json) ? json : [];
        setRecords(arr);
        const vals: Record<string, string> = {};
        arr.forEach((r: ConfigRecord) => {
          vals[r.key] = r.value != null ? String(r.value) : '';
        });
        setEditingValues(vals);
      } else {
        setError('Unable to load configuration.');
      }
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    }
  }

  async function saveValue(key: string, value?: string) {
    if (!token) return;
    setError('');
    setSuccess('');
    const val = value !== undefined ? value : (editingValues[key] ?? '');
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '';
      const resp = await fetch(base + '/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ records: [{ key, value: val || null }] }),
      });
      if (resp.ok) {
        setSuccess('Settings saved successfully.');
        setEditingValues((v) => ({ ...v, [key]: val }));
        fetchConfig();
      } else {
        setError('Could not save. Please try again.');
      }
    } catch (e: any) {
      setError('Something went wrong. Please try again.');
    }
  }

  const llmProvider = (editingValues['LLM_PROVIDER'] || 'gemini').toLowerCase();

  return (
    <div className="config-panel dark:bg-slate-800 dark:border-slate-700 transition-all duration-500">
      <h2 className="config-title dark:text-white transition-colors duration-300">API Configuration</h2>
      <p className="config-subtitle dark:text-slate-400 transition-colors duration-300">Configure these keys for document ingestion and chat. Values are stored securely in the database.</p>
      {error && <div className="error-banner dark:bg-red-900/30 dark:border-red-800 dark:text-red-200">{error}</div>}
      {success && <div className="success-banner dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200">{success}</div>}
      <div className="config-grid">
        {records.map((r) => (
          <div key={r.key} className="config-row">
            <label className="config-label dark:text-slate-300">{KEY_LABELS[r.key] || r.key}</label>
            <div className="config-input-wrap">
              {r.key === 'LLM_PROVIDER' ? (
                <select
                  className="config-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={editingValues[r.key] ?? 'gemini'}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditingValues((prev) => ({ ...prev, [r.key]: v }));
                    saveValue(r.key, v);
                  }}
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="mistral">Mistral AI</option>
                </select>
              ) : (
                <>
                  <input
                    type={r.key.includes('KEY') ? 'password' : 'text'}
                    className="config-input dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                    placeholder={r.description || ''}
                    value={editingValues[r.key] ?? ''}
                    onChange={(e) => setEditingValues((v) => ({ ...v, [r.key]: e.target.value }))}
                  />
                  <button className="config-save-btn dark:bg-slate-600 dark:hover:bg-slate-500" onClick={() => saveValue(r.key)}>
                    Save
                  </button>
                </>
              )}
            </div>
            {r.key === 'GEMINI_API_KEY' && llmProvider !== 'gemini' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use when LLM Provider is Gemini</p>
            )}
            {r.key === 'MISTRAL_API_KEY' && llmProvider !== 'mistral' && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Use when LLM Provider is Mistral</p>
            )}
          </div>
        ))}
      </div>
      {records.length === 0 && !error && (
        <p className="config-empty dark:text-slate-400">Loading configuration...</p>
      )}
    </div>
  );
}
