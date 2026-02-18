import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function getTenantId(userId) {
  const tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(userId);
  return tenant?.id || null;
}
