import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const ai = config.geminiApiKey ? new GoogleGenAI({ apiKey: config.geminiApiKey }) : null;

const MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are a helpful customer support assistant. Answer questions based ONLY on the provided context. 
If the context doesn't contain relevant information, say so politely and suggest the user contact support.
Be concise, friendly, and professional.`;

export async function generateResponse(userMessage, contextChunks, chatHistory = []) {
  if (!ai) throw new Error('GEMINI_API_KEY not configured');

  const contextText = contextChunks
    .map((m) => m.metadata?.text || m.text || '')
    .filter(Boolean)
    .join('\n\n');

  const contextBlock = contextText
    ? `\n\nRelevant knowledge base:\n${contextText}\n\n`
    : '\n\n(No relevant documents in knowledge base. Answer from general knowledge if appropriate, or say you don\'t have specific information.)\n\n';

  const historyBlock = chatHistory
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const fullPrompt = `${SYSTEM_PROMPT}${contextBlock}${historyBlock ? historyBlock + '\n' : ''}User: ${userMessage}\nAssistant:`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: fullPrompt,
  });

  return response.text || '';
}
