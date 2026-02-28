import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'config.db');

/**
 * Configuration service backed by an SQLite table called `settings`.
 * Each row is a structured record per key with fields:
 * - key (PRIMARY KEY)
 * - value (JSON string)
 * - description (optional text)
 * - type (optional text)
 * - metadata (JSON string)
 * - created_at (unix ms)
 * - updated_at (unix ms)
 */
export interface ConfigRecord {
  key: string;
  value: any;
  description?: string | null;
  type?: string | null;
  metadata?: any;
  createdAt: number;
  updatedAt: number;
}

export class ConfigService {
  private db: Database.Database;

  // Fixed keys: only these exist, all values null by default. Keys cannot be added or deleted.
  public static readonly REQUIRED_KEYS = ['VOYAGE_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX', 'GEMINI_API_KEY'] as const;

  private DEFAULT_RECORDS: ConfigRecord[] = [
    { key: 'VOYAGE_API_KEY', value: null, description: 'Voyage AI embeddings API key', type: 'string', metadata: null, createdAt: Date.now(), updatedAt: Date.now() },
    { key: 'PINECONE_API_KEY', value: null, description: 'Pinecone vector database API key', type: 'string', metadata: null, createdAt: Date.now(), updatedAt: Date.now() },
    { key: 'PINECONE_INDEX', value: null, description: 'Pinecone index name (e.g. quantivo)', type: 'string', metadata: null, createdAt: Date.now(), updatedAt: Date.now() },
    { key: 'GEMINI_API_KEY', value: null, description: 'Google Gemini API key (for chat responses)', type: 'string', metadata: null, createdAt: Date.now(), updatedAt: Date.now() },
  ];

  constructor() {
    this.db = new Database(DB_PATH);
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          type TEXT,
          metadata TEXT,
          created_at INTEGER,
          updated_at INTEGER
        )`
      )
      .run();
    // Ensure new columns exist for older DBs that may only have key/value
    try {
      const cols: Array<{ name: string }> = this.db
        .prepare("PRAGMA table_info('settings')")
        .all() as any;
      const names = new Set(cols.map((c) => c.name));
      const adds: Array<string> = [];
      if (!names.has('description')) adds.push("ALTER TABLE settings ADD COLUMN description TEXT");
      if (!names.has('type')) adds.push("ALTER TABLE settings ADD COLUMN type TEXT");
      if (!names.has('metadata')) adds.push("ALTER TABLE settings ADD COLUMN metadata TEXT");
      if (!names.has('created_at')) adds.push("ALTER TABLE settings ADD COLUMN created_at INTEGER");
      if (!names.has('updated_at')) adds.push("ALTER TABLE settings ADD COLUMN updated_at INTEGER");
      for (const sql of adds) {
        try {
          this.db.prepare(sql).run();
        } catch (err) {
          // ignore individual alter errors
        }
      }
    } catch (err) {
      // ignore
    }
    // Seed required keys so they exist as records (editable values)
    try {
      this.ensureDefaultKeys();
    } catch (e) {
      // ignore seeding errors
    }
  }

  private ensureDefaultKeys() {
    const now = Date.now();
    const getOne = this.db.prepare('SELECT key FROM settings WHERE key = ?');
    const insert = this.db.prepare(
      `INSERT INTO settings (key, value, description, type, metadata, created_at, updated_at)
       VALUES (@key, @value, @description, @type, @metadata, @created_at, @updated_at)`
    );
    // Use INSERT OR IGNORE to ensure a record exists without overwriting existing values.
    const insertOrIgnore = this.db.prepare(
      `INSERT OR IGNORE INTO settings (key, value, description, type, metadata, created_at, updated_at)
       VALUES (@key, @value, @description, @type, @metadata, @created_at, @updated_at)`
    );
    const insertTxn = this.db.transaction((recs: ConfigRecord[]) => {
      for (const r of recs) {
        insertOrIgnore.run({
          key: r.key,
          value: r.value === undefined || r.value === null ? null : JSON.stringify(r.value),
          description: r.description ?? null,
          type: r.type ?? null,
          metadata: r.metadata === undefined || r.metadata === null ? null : JSON.stringify(r.metadata),
          created_at: r.createdAt ?? now,
          updated_at: r.updatedAt ?? now,
        });
        // if row existed, ensure updated_at exists
        this.db.prepare('UPDATE settings SET updated_at = @updated_at WHERE key = @key AND (updated_at IS NULL OR updated_at = 0)').run({ key: r.key, updated_at: now });
      }
    });
    insertTxn(this.DEFAULT_RECORDS);
  }

  /**
   * Get a single record by key.
   */
  public get(key: string): ConfigRecord | null {
    const row: any = this.db
      .prepare('SELECT key, value, description, type, metadata, created_at, updated_at FROM settings WHERE key = ?')
      .get(key);
    if (!row) return null;
    let parsedValue: any = null;
    let parsedMetadata: any = null;
    try {
      parsedValue = row.value ? JSON.parse(row.value) : null;
    } catch {
      parsedValue = row.value;
    }
    try {
      parsedMetadata = row.metadata ? JSON.parse(row.metadata) : null;
    } catch {
      parsedMetadata = row.metadata;
    }
    return {
      key: row.key,
      value: parsedValue,
      description: row.description,
      type: row.type,
      metadata: parsedMetadata,
      createdAt: row.created_at || 0,
      updatedAt: row.updated_at || 0,
    } as ConfigRecord;
  }

  /**
   * Get only the required API keys (for Admin panel and runtime).
   */
  public getRequiredKeys(): ConfigRecord[] {
    return ConfigService.REQUIRED_KEYS.map((key) => this.get(key)).filter(Boolean) as ConfigRecord[];
  }

  /**
   * Return all required key records. Always returns exactly the 3 required keys.
   */
  public getAll(): ConfigRecord[] {
    const rows: Array<any> = this.db
      .prepare(
        'SELECT key, value, description, type, metadata, created_at, updated_at FROM settings WHERE key IN (?, ?, ?, ?)'
      )
      .all(...ConfigService.REQUIRED_KEYS) as any;
    const byKey = new Map<string, ConfigRecord>();
    for (const r of rows) {
      let parsedValue: any = null;
      try {
        parsedValue = r.value ? JSON.parse(r.value) : null;
      } catch {
        parsedValue = r.value;
      }
      byKey.set(r.key, {
        key: r.key,
        value: parsedValue,
        description: r.description,
        type: r.type,
        metadata: null,
        createdAt: r.created_at || 0,
        updatedAt: r.updated_at || 0,
      } as ConfigRecord);
    }
    // Always return all 3 keys; missing ones get null value
    return ConfigService.REQUIRED_KEYS.map((key) => {
      const existing = byKey.get(key);
      if (existing) return existing;
      return {
        key,
        value: null,
        description: null,
        type: 'string',
        metadata: null,
        createdAt: 0,
        updatedAt: 0,
      } as ConfigRecord;
    });
  }

  /**
   * Update method accepts either:
   * - { records: ConfigRecord[] } to upsert structured records
   * - { delete: string } to remove a key
   * - legacy: plain object map { key: value }
   */
  public update(payload: any): void {
    const now = Date.now();
    const insert = this.db.prepare(
      `INSERT INTO settings (key, value, description, type, metadata, created_at, updated_at)
       VALUES (@key, @value, @description, @type, @metadata, @created_at, @updated_at)`
    );
    const updateStmt = this.db.prepare(
      `UPDATE settings SET value = @value, description = @description, type = @type, metadata = @metadata, updated_at = @updated_at WHERE key = @key`
    );
    const remove = this.db.prepare('DELETE FROM settings WHERE key = @key');

    const txn = this.db.transaction((pl: any) => {
      if (!pl) return;

      // Deleting required keys is not allowed
      if (pl.delete && typeof pl.delete === 'string') {
        if (ConfigService.REQUIRED_KEYS.includes(pl.delete as any)) return;
        remove.run({ key: pl.delete });
        return;
      }

      // Only allow updating value for required keys; no adding new keys
      if (Array.isArray(pl.records)) {
        for (const rec of pl.records) {
          if (!rec || !rec.key) continue;
          if (!ConfigService.REQUIRED_KEYS.includes(rec.key as any)) continue;
          const existing = this.db.prepare('SELECT 1 FROM settings WHERE key = ?').get(rec.key);
          const valueJson = rec.value === undefined ? null : JSON.stringify(rec.value);
          const row = this.db.prepare('SELECT description, type FROM settings WHERE key = ?').get(rec.key) as any;
          const description = row?.description ?? rec.description ?? null;
          const type = row?.type ?? rec.type ?? null;
          if (existing) {
            updateStmt.run({
              key: rec.key,
              value: valueJson,
              description,
              type,
              metadata: null,
              updated_at: now,
            });
          } else {
            insert.run({
              key: rec.key,
              value: valueJson,
              description: rec.description ?? null,
              type: rec.type ?? null,
              metadata: null,
              created_at: now,
              updated_at: now,
            });
          }
        }
        return;
      }

      // legacy map form: { key: value } - only for required keys
      if (typeof pl === 'object') {
        for (const [key, val] of Object.entries(pl)) {
          if (!ConfigService.REQUIRED_KEYS.includes(key as any)) continue;
          if (val === null) {
            updateStmt.run({ key, value: null, description: null, type: null, metadata: null, updated_at: now });
            continue;
          }
          const existing = this.db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
          const valueJson = typeof val === 'string' ? JSON.stringify(val) : JSON.stringify(val);
          const row = this.db.prepare('SELECT description, type FROM settings WHERE key = ?').get(key) as any;
          if (existing) {
            updateStmt.run({ key, value: valueJson, description: row?.description ?? null, type: row?.type ?? null, metadata: null, updated_at: now });
          } else {
            insert.run({ key, value: valueJson, description: null, type: null, metadata: null, created_at: now, updated_at: now });
          }
        }
      }
    });

    txn(payload);
  }
}
