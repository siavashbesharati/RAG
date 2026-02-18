import { Router } from 'express';
import { authMiddleware, getTenantId } from '../middleware/auth.js';
import { db } from '../db.js';
import { uuid, chunkText } from '../utils.js';
import { upsertVectors, deleteByDocId } from '../services/pinecone.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const docs = db
    .prepare('SELECT id, title, created_at FROM documents WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId);
  res.json({ documents: docs });
});

router.post('/', async (req, res) => {
  try {
    const tenantId = getTenantId(req.user.id);
    if (!tenantId) return res.status(400).json({ error: 'No tenant found' });

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const docId = uuid();
    db.prepare(
      'INSERT INTO documents (id, tenant_id, title, content) VALUES (?, ?, ?, ?)'
    ).run(docId, tenantId, title, content);

    const chunks = chunkText(content).map((c) => ({
      ...c,
      id: `${docId}_${c.id}`,
      docId,
    }));

    await upsertVectors(tenantId, chunks);

    res.status(201).json({
      id: docId,
      title,
      chunksCount: chunks.length,
      message: 'Document indexed successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to add document' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req.user.id);
    if (!tenantId) return res.status(400).json({ error: 'No tenant found' });

    const { id } = req.params;
    const doc = db.prepare('SELECT id FROM documents WHERE id = ? AND tenant_id = ?').get(id, tenantId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await deleteByDocId(tenantId, id);
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to delete' });
  }
});

export default router;
