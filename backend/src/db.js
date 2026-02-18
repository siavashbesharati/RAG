import Database from 'better-sqlite3';
import { config } from './config.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const dbPath = config.database.path;
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT DEFAULT 'New Chat',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );

  CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant ON chat_sessions(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_key ON tenant_api_keys(api_key);
`);
