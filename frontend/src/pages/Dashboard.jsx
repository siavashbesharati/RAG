import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  return (
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      <p className={styles.sub}>Manage your knowledge base and test your RAG-powered support.</p>

      <div className={styles.cards}>
        <Link to="/documents" className={styles.card}>
          <h2>Documents</h2>
          <p>Add text content to build your knowledge base. Content is converted to vectors and stored for RAG retrieval.</p>
        </Link>
        <Link to="/chat" className={styles.card}>
          <h2>Chat</h2>
          <p>Test how the AI responds using your knowledge base. Ask questions and see RAG in action.</p>
        </Link>
        <Link to="/settings" className={styles.card}>
          <h2>API Keys</h2>
          <p>Generate API keys to integrate WhatsApp, Telegram, Instagram, website chat, and more.</p>
        </Link>
      </div>

      <div className={styles.steps}>
        <h3>Quick start</h3>
        <ol>
          <li>Add documents with your support content</li>
          <li>Go to Chat and ask questions</li>
          <li>Create an API key in Settings for channel integrations</li>
        </ol>
      </div>
    </div>
  );
}
