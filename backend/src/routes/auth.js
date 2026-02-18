import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';
import { uuid } from '../utils.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const id = uuid();
    const tenantId = uuid();
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(id, email, passwordHash, name || email.split('@')[0]);
    db.prepare('INSERT INTO tenants (id, user_id, name) VALUES (?, ?, ?)').run(
      tenantId,
      id,
      name || 'My Workspace'
    );
    const token = jwt.sign({ userId: id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.status(201).json({
      token,
      user: { id, email, name: name || email.split('@')[0] },
      tenantId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const user = db.prepare(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?'
    ).get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tenant = db.prepare('SELECT id FROM tenants WHERE user_id = ?').get(user.id);
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
      tenantId: tenant?.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
