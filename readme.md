# RAG Customer Support — Multi-tenant SaaS

AI-powered customer support using **RAG** (Retrieval-Augmented Generation) with **Pinecone** (vector DB) and **Google Gemini** (LLM). Multi-tenant SaaS with API-first design for integrating WhatsApp, Telegram, Instagram, website chat, and other channels.

## Features

- **User auth** — Register, login, JWT
- **Documents** — Add text content, auto-chunk and embed into Pinecone
- **Chat** — Test RAG responses in a chat UI
- **API-first** — REST API for external channel integrations
- **Multi-tenant** — Each user has isolated data and knowledge base
- **Flat light UI** — Simple, mobile-friendly interface

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, Express |
| Frontend | React, Vite |
| Vector DB | Pinecone |
| LLM | Google Gemini |
| Embeddings | Google text-embedding-004 |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

## Setup & Installation

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **Pinecone** account — [console.pinecone.io](https://console.pinecone.io)
- **Google AI** API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Clone & install

```bash
git clone <repo-url>
cd RAG
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-min-32-chars

# Add your keys
GEMINI_API_KEY=your-gemini-api-key
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=rag-support
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

DATABASE_PATH=./data/rag.db
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

### 4. Run locally

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:3000  
- API: http://localhost:4000  

---

## Configuration

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default: 4000) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | Yes | Secret for JWT (min 32 chars in prod) |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX_NAME` | No | Index name (default: rag-support) |
| `PINECONE_CLOUD` | No | `aws` or `gcp` |
| `PINECONE_REGION` | No | e.g. `us-east-1` |
| `DATABASE_PATH` | No | SQLite path (default: ./data/rag.db) |

### Pinecone index

The index is created automatically on first use with:

- **Dimension:** 768 (Google text-embedding-004)
- **Metric:** cosine
- **Serverless:** AWS/GCP

---

## Production Deployment

### Option A: Single server (Node + static)

1. Build frontend:
   ```bash
   cd frontend && npm run build
   ```

2. Serve static files from backend:
   ```js
   // In backend/src/index.js, add:
   import path from 'path';
   import { fileURLToPath } from 'url';
   const __dirname = path.dirname(fileURLToPath(import.meta.url));
   app.use(express.static(path.join(__dirname, '../../frontend/dist')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
   });
   ```

3. Run with PM2:
   ```bash
   cd backend
   pm2 start src/index.js --name rag-api
   ```

### Option B: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN cd backend && npm ci --omit=dev
RUN cd frontend && npm ci && npm run build
COPY backend ./backend
COPY frontend/dist ./frontend/dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "backend/src/index.js"]
```

### Option C: Separate frontend (Vercel/Netlify)

- Deploy frontend to Vercel/Netlify
- Set `VITE_API_URL` to your API base URL
- Deploy backend to Railway, Render, Fly.io, or similar

### Production checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a strong `JWT_SECRET` (32+ chars)
- [ ] Use HTTPS
- [ ] Configure CORS for your frontend domain
- [ ] Use PostgreSQL for production (see below)
- [ ] Set up backups for DB and Pinecone

### PostgreSQL (production)

Replace SQLite with PostgreSQL:

1. Install `pg` and `pg-pool`
2. Update `db.js` to use `pg` instead of `better-sqlite3`
3. Add `DATABASE_URL` to `.env`
4. Run migrations for the same schema

---

## API Reference

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (email, password, name?) |
| POST | `/api/auth/login` | Login (email, password) |

### Documents (requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Add document (title, content) |
| DELETE | `/api/documents/:id` | Delete document |

### Chat (requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/sessions` | List chat sessions |
| POST | `/api/chat/sessions` | Create session |
| GET | `/api/chat/sessions/:id/messages` | Get messages |
| POST | `/api/chat/sessions/:id/messages` | Send message (body: `{ message }`) |

### API Keys (requires `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/api-keys` | List API keys |
| POST | `/api/api-keys` | Create key (body: `{ name? }`) |
| DELETE | `/api/api-keys/:id` | Revoke key |

### Channel API (for integrations)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/channels/chat` | `X-API-Key` | Send message, get RAG response |

**Request:**
```json
{
  "message": "How do I reset my password?",
  "session_id": "optional-session-id",
  "channel": "whatsapp"
}
```

**Response:**
```json
{
  "reply": "To reset your password, go to Settings > Account...",
  "session_id": "optional-session-id",
  "channel": "whatsapp"
}
```

---

## Integrating Other Channels

### WhatsApp

1. Use [Twilio](https://www.twilio.com/whatsapp) or [Meta Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
2. On incoming message, call your API:
   ```js
   const res = await fetch('https://your-api.com/api/channels/chat', {
     method: 'POST',
     headers: {
       'X-API-Key': process.env.RAG_API_KEY,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({
       message: incomingMessage,
       session_id: userPhone,
       channel: 'whatsapp',
     }),
   });
   const { reply } = await res.json();
   // Send reply back via WhatsApp API
   ```

### Telegram

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Use `node-telegram-bot-api` or similar
3. On `message`, call `/api/channels/chat` with the message text
4. Send the `reply` back with `bot.sendMessage(chatId, reply)`

### Instagram

1. Use [Meta Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)
2. Same pattern: receive message → call `/api/channels/chat` → send reply

### Website chat widget

1. Embed a small JS widget on your site
2. On user send, call `/api/channels/chat` with `X-API-Key`
3. Display the `reply` in the widget

### Example: Node.js webhook

```js
// Express webhook for any channel
app.post('/webhook/chat', async (req, res) => {
  const { message, channel } = req.body;
  const apiKey = process.env.RAG_API_KEY;
  const ragRes = await fetch('https://your-api.com/api/channels/chat', {
    method: 'POST',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, channel }),
  });
  const { reply } = await ragRes.json();
  res.json({ reply });
});
```

---

## Project Structure

```
RAG/
├── backend/
│   ├── src/
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── index.js
│   │   ├── utils.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── documents.js
│   │   │   ├── chat.js
│   │   │   ├── api-keys.js
│   │   │   └── channels.js
│   │   └── services/
│   │       ├── embedding.js
│   │       ├── pinecone.js
│   │       └── gemini.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── context/
│   │   ├── components/
│   │   └── pages/
│   └── package.json
└── readme.md
```

---

## License

MIT
