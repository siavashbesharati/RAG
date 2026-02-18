import { Router } from 'express';
import { authMiddleware, getTenantId } from '../middleware/auth.js';
import { db } from '../db.js';
import { uuid } from '../utils.js';
import { querySimilar } from '../services/pinecone.js';
import { generateResponse } from '../services/gemini.js';

const router = Router();
router.use(authMiddleware);

router.get('/sessions', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const sessions = db
    .prepare('SELECT id, title, created_at FROM chat_sessions WHERE tenant_id = ? ORDER BY created_at DESC')
    .all(tenantId);
  res.json({ sessions });
});

router.post('/sessions', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const id = uuid();
  db.prepare('INSERT INTO chat_sessions (id, tenant_id) VALUES (?, ?)').run(id, tenantId);
  res.status(201).json({ id, title: 'New Chat' });
});

router.get('/sessions/:sessionId/messages', (req, res) => {
  const tenantId = getTenantId(req.user.id);
  if (!tenantId) return res.status(400).json({ error: 'No tenant found' });
  const session = db
    .prepare('SELECT id FROM chat_sessions WHERE id = ? AND tenant_id = ?')
    .get(req.params.sessionId, tenantId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const messages = db
    .prepare('SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at')
    .all(session.id);
  res.json({ messages });
});

router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const tenantId = getTenantId(req.user.id);
    if (!tenantId) return res.status(400).json({ error: 'No tenant found' });

    const { sessionId } = req.params;
    const { message } = req.body;

    const session = db
      .prepare('SELECT id FROM chat_sessions WHERE id = ? AND tenant_id = ?')
      .get(sessionId, tenantId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message required' });
    }

    const userMsgId = uuid();
    db.prepare(
      'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(userMsgId, sessionId, 'user', message);

    const chatHistory = db
      .prepare('SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at')
      .all(sessionId)
      .map((m) => ({ role: m.role, content: m.content }));

    const contextChunks = await querySimilar(tenantId, message, 5);
    const reply = await generateResponse(message, contextChunks, chatHistory.slice(0, -1));

    const assistantMsgId = uuid();
    db.prepare(
      'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)'
    ).run(assistantMsgId, sessionId, 'assistant', reply);

    res.status(201).json({
      userMessage: { id: userMsgId, role: 'user', content: message },
      assistantMessage: { id: assistantMsgId, role: 'assistant', content: reply },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

export default router;
