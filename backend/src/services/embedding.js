import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;

const EMBEDDING_MODEL = 'text-embedding-004';
// Alternative: gemini-embedding-001 (newer, supports up to 3072 dims)

export async function embedText(text) {
  if (!ai) throw new Error('GEMINI_API_KEY not configured');
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  const emb = response.embeddings?.[0]?.values;
  if (!emb) throw new Error('No embedding returned');
  return emb;
}

export async function embedTexts(texts) {
  if (!ai) throw new Error('GEMINI_API_KEY not configured');
  if (texts.length === 0) return [];
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
  });
  const embeddings = response.embeddings || [];
  return embeddings.map((e) => e.values).filter(Boolean);
}
