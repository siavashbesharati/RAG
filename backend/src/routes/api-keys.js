import { Router } from 'express';
import { authMiddleware, getTenantId } from '../middleware/auth.js';
import { db } from '../db.js';
import { uuid } from '../utils.js';
import { randomBytes } from 'crypto';

const router = Router();
router.use(authMiddleware);

function generateApiKey() {
  return `rag_${randomBytes(24).toString('hex')}`;
}

router.get('/', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const keys = db
    .prepare(
      'SELECT id, name, created_at FROM tenant_api_keys WHERE tenant_id = ? ORDER BY created_at DESC'
    )
    .all(tenantId)
    .map((k) => ({ id: k.id, name: k.name, created_at: k.created_at }));
  res.json({ apiKeys: keys });
});

router.post('/', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });

  const { name } = req.body || {};
  const id = uuid();
  const apiKey = generateApiKey();

  db.prepare(
    'INSERT INTO tenant_api_keys (id, tenant_id, api_key, name) VALUES (?, ?, ?, ?)'
  ).run(id, tenantId, apiKey, name || 'Channel Integration');

  res.status(201).json({
    id,
    name: name || 'Channel Integration',
    apiKey,
    warning: 'Save this key. It will not be shown again.',
  });
});

router.delete('/:id', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const result = db
    .prepare('DELETE FROM tenant_api_keys WHERE id = ? AND tenant_id = ?')
    .run(req.params.id, tenantId);
  if (result.changes === 0) return res.status(404).json({ error: 'API key not found' });
  res.json({ message: 'API key revoked' });
});

export default router;
