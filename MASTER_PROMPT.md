# Quantivo RAG Architecture – Master System Prompt

**Role:** Senior Full-Stack AI Architect

This document defines the system-level prompt and the architectural blueprint for the
`Quantivo` Retrieval‑Augmented Generation (RAG) system.  It is divided into two logical
modules: an **Admin Knowledge Pipeline** for ingestion, and a **Multilingual Client
Support Interface** for end users.

---

## 1. Admin Module: The Knowledge Ingestion Pipeline

* accepts raw text or documents
* performs **Smart Chunking** (500‑character segments with 15 % overlap)
* uses **Voyage AI** to embed chunks into high‑dimensional vectors
* manages Pinecone index creation, upsert and metadata (original text, category,
  source URL)
* **All data must be embedded in English** for retrieval consistency

Components:
- `AdminService.ts` – orchestrates chunking and embedding
- `VectorService.ts` – Pinecone wrapper

---

## 2. Client Module: Multilingual Support Interface

* Supports English, Persian, Armenian, Russian, Turkish and Arabic
* **Translation Bridge**:
  1. Detect user’s language
  2. Translate to Technical English via Gemini for search
  3. Retrieve relevant context from Pinecone
  4. Generate an answer with Gemini and translate back to original language
* Maintains session memory for conversational UX
* Identifies as **"Quantivo Smart Support"** and falls back to human support
  when context is insufficient

Components:
- `TranslationService.ts` – language detection, two‑way translation, and text
  generation via Gemini
- `ClientChatService.ts` – session management and end‑to‑end flow

---

## 3. Technical Implementation (TypeScript)

The codebase is deliberately modular; each service has a single responsibility and
each external dependency (Pinecone, Voyage, Gemini) is encapsulated behind a thin
wrapper.  Environment variables are used to supply API keys and configuration.

Use the services together in an application entry point to wire up ingestion jobs and
chat endpoints.

> **Note:** This prompt text may be provided to an LLM as the system context when
> generating or maintaining Quantivo-related services.
