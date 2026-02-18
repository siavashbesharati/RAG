import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Documents.module.css';

export default function Documents() {
  const { api } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api('/documents');
      const data = await res.json();
      if (res.ok) setDocuments(data.documents || []);
    } catch (e) {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api('/documents', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTitle('');
      setContent('');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      const res = await api(`/documents/${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch (e) {
      setError('Delete failed');
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Documents</h1>
        <button onClick={() => setShowForm(!showForm)} className={styles.btn}>
          {showForm ? 'Cancel' : 'Add document'}
        </button>
      </div>
      <p className={styles.sub}>Add text content. It will be chunked, embedded, and stored in the vector database for RAG.</p>

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Paste or type your support content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={8}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Indexing...' : 'Add & index'}
          </button>
        </form>
      )}

      <div className={styles.list}>
        {documents.length === 0 ? (
          <p className={styles.empty}>No documents yet. Add one to get started.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className={styles.doc}>
              <div>
                <strong>{doc.title}</strong>
                <span className={styles.date}>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <button onClick={() => handleDelete(doc.id)} className={styles.del}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
