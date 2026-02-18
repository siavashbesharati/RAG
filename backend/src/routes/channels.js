/**
 * Channel Integration API
 * Use these endpoints to integrate WhatsApp, Telegram, Instagram, website chat, etc.
 * Authenticate with X-API-Key header (tenant API key).
 */
import { Router } from 'express';
import { db } from '../db.js';
import { uuid } from '../utils.js';
import { querySimilar } from '../services/pinecone.js';
import { generateResponse } from '../services/gemini.js';

const router = Router();

function getTenantByApiKey(apiKey) {
  if (!apiKey) return null;
  const row = db.prepare('SELECT tenant_id, api_key FROM tenant_api_keys WHERE api_key = ?').get(apiKey);
  return row?.tenant_id || null;
}

function channelAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const tenantId = getTenantByApiKey(apiKey);
  if (!tenantId) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  req.tenantId = tenantId;
  next();
}

router.post('/chat', channelAuth, async (req, res) => {
  try {
    const { message, session_id: sessionId, channel } = req.body;
    const tenantId = req.tenantId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message (string) required' });
    }

    const contextChunks = await querySimilar(tenantId, message, 5);
    const reply = await generateResponse(message, contextChunks, []);

    res.json({
      reply,
      session_id: sessionId || null,
      channel: channel || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rag-support' });
});

export default router;
