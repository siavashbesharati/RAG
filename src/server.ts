import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { AdminService } from './services/AdminService';
import { TranslationService } from './services/TranslationService';
import { VectorService } from './services/VectorService';
import { ClientChatService } from './services/ClientChatService';
import { AuthService } from './services/AuthService';
import { ConfigService } from './services/ConfigService';

const configService = new ConfigService();
const EMBEDDING_DIMENSION = 1024;
const PINECONE_ENV = 'us-west1-gcp';

// Read API keys from database only (no env fallback for required keys)
function getRuntimeConfig(): { voyageKey: string; pineconeKey: string; pineconeIndex: string; geminiKey: string } | null {
  const voyage = configService.get('VOYAGE_API_KEY')?.value;
  const pinecone = configService.get('PINECONE_API_KEY')?.value;
  const index = configService.get('PINECONE_INDEX')?.value;
  const gemini = configService.get('GEMINI_API_KEY')?.value;
  if (!voyage || !pinecone || !index || !gemini) return null;
  return {
    voyageKey: String(voyage).trim(),
    pineconeKey: String(pinecone).trim(),
    pineconeIndex: String(index).trim(),
    geminiKey: String(gemini).trim(),
  };
}

function createServicesFromConfig(config: { voyageKey: string; pineconeKey: string; pineconeIndex: string; geminiKey: string }) {
  const vectorService = new VectorService(config.pineconeKey, PINECONE_ENV, config.pineconeIndex);
  const adminService = new AdminService(vectorService, config.voyageKey);
  const translationService = new TranslationService(config.geminiKey);
  const clientChatService = new ClientChatService(translationService, vectorService, config.voyageKey);
  return { vectorService, adminService, clientChatService };
}

const authService = new AuthService();

async function init() {
  const seeded = authService.seedAdmin();
  if (seeded) {
    console.log('Default admin user created: username=admin password=admin');
  }
  // Ensure vector index when config is available
  const config = getRuntimeConfig();
  if (config) {
    const { vectorService } = createServicesFromConfig(config);
    await vectorService.ensureIndex(config.pineconeIndex, EMBEDDING_DIMENSION);
  }
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
const distPath = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(path.join(process.cwd(), 'frontend')));
}

interface AuthRequest extends express.Request {
  user?: { userId: string; username: string; role: 'user' | 'admin' };
}
const authMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue.' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);
    req.user = { userId: payload.userId, username: payload.username, role: payload.role };
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }
    const { userId, token, role } = authService.login(username, password);
    return res.json({ userId, token, role });
  } catch (e: any) {
    console.error('login error', e, 'body:', req.body);
    return res.status(401).json({ error: 'Invalid username or password. Please try again.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }
    const { userId, token } = authService.register(username, password);
    return res.json({ userId, token });
  } catch (e: any) {
    console.error('register error', e, 'body:', req.body);
    return res.status(400).json({ error: e.message || 'Registration failed. Username may already be taken.' });
  }
});

app.post('/api/ingest', authMiddleware, async (req, res) => {
  const config = getRuntimeConfig();
  if (!config) {
    return res.status(503).json({
      error: 'API keys are not configured yet. An administrator needs to add Voyage, Pinecone, Gemini, and index settings in the Admin panel.',
    });
  }
  try {
    const { text, metadata } = req.body;
    const { adminService } = createServicesFromConfig(config);
    await adminService.ingestText(text, metadata);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Ingest error:', e);
    res.status(500).json({ error: e.message });
  }
});

const adminMiddleware = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

app.get('/api/admin/config', authMiddleware, adminMiddleware, (req, res) => {
  res.json(configService.getAll());
});
app.post('/api/admin/config', authMiddleware, adminMiddleware, (req, res) => {
  const changes = req.body || {};
  configService.update(changes);
  res.json({ success: true, config: configService.getAll() });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({ userId: req.user?.userId, username: req.user?.username, role: req.user?.role });
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  const config = getRuntimeConfig();
  if (!config) {
    return res.status(503).json({
      error: 'The assistant is not ready yet. An administrator needs to configure Voyage, Pinecone, Gemini, and index settings in the Admin panel.',
    });
  }
  try {
    const { sessionId, message } = req.body;
    const { clientChatService } = createServicesFromConfig(config);
    const answer = await clientChatService.handleMessage(sessionId, message);
    res.json({ answer });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
