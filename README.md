# Quantivo RAG

Minimal prototype of the Quantivo retrieval-augmented architecture.

## Overview

Two modules:

* **AdminService** — ingest text, split into overlapping chunks, embed via Voyage
  AI and upsert to Pinecone.
* **ClientChatService** — multilingual chat bot that detects language, translates
  to English for search, retrieves context from Pinecone and synthesizes a
  response with Gemini, finally translating back to the user's language.

Supporting services:

* `TranslationService` – Gemini language detection, translation, generation
* `VectorService` – thin Pinecone REST wrapper
* `AuthService` – JWT-based user authentication

## Authentication

The system includes JWT-based authentication:

* Register a new user at the login screen
* Login with credentials
* Tokens stored in browser local storage
* All API endpoints (`/api/chat`, `/api/ingest`) require a valid Bearer token

For development the app now **seeds a default administrator** on startup if no users exist.  When the server first runs it will print:

```
Default admin user created: username=admin password=admin
```

You can immediately log in with those credentials or register your own user (the first
user you register after the seed will also be an admin).  Subsequent registrations are
regular users.

If you're unsure of the current user's role, hit the new `/api/auth/me` endpoint with a valid token (e.g. via browser dev tools or curl) and inspect the returned `role` field. The role is also shown in the UI header when logged in.

An admin panel is available under the "Admin" tab once logged in as an administrator. Use it to view and edit runtime configuration; the data is now persisted in an SQLite database (`config.db`) in a simple `settings` table. Each row corresponds to a named key (such as an API key) and stores a JSON serialised value.  You can add, modify or remove entries via the admin UI.

## UI & Styling

Built with **React 18** and **Tailwind CSS**:

* Modern login/register page
* Tabbed interface for Chat and Document Ingestion
* Real-time message display with role-based styling
* Mobile-friendly responsive design

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Build TypeScript:
   ```sh
   npm run build
   ```
3. Set environment variables (for backend server; the app will log warnings if any are missing):
   - `VOYAGE_API_KEY` – Voyage AI key
   - `PINECONE_API_KEY`, `PINECONE_ENV`, `PINECONE_INDEX` (needed for vector storage; if not reachable the app will continue without retrieval)
   - `GEMINI_API_KEY`
   - optional `JWT_SECRET` (used to sign authentication tokens; defaults to a development secret)

   On Windows PowerShell you can export them like:
   ```powershell
   $env:VOYAGE_API_KEY="…"
   $env:PINECONE_API_KEY="…"
   $env:PINECONE_ENV="your-env"         # e.g. asia-south1-gcp, etc.
   $env:PINECONE_INDEX="quantivo"
   $env:GEMINI_API_KEY="…"
   # optionally:
   $env:JWT_SECRET="some-secret-for-jwt"
   ```

   For frontend development you can set base API URL in `frontend/.env`:
   ```dotenv
   VITE_API_BASE_URL=http://localhost:3000
   ```
   (Vite automatically loads `.env` when you run `npm run dev`.)4. Build and run the server (production mode):
   ```sh
   npm run build
   npm start
   ```
   Then open `http://localhost:3000` in a browser to access the app.

5. **Frontend development** (with hot reload):
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
   Visit `http://localhost:5173` for the dev server.

6. **Production mode** (pre-built SPA served from Express):
   ```sh
   npm run build:frontend  # Build React SPA to frontend/dist
   npm run build           # Build TypeScript backend
   npm start               # Serve both on http://localhost:3000
   ```

Note: this is a skeleton; replace stubbed API endpoints and error handling with
production-grade code. Store JWT secret securely with `JWT_SECRET` env var.
