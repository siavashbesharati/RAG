"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientChatService = void 0;
/**
 * Drives the end-to-end user interaction. Maintains session state and
 * orchestrates detection, translation, retrieval, and response
 * generation.
 */
class ClientChatService {
    constructor(translation, vector, voyageApiKey) {
        this.translation = translation;
        this.vector = vector;
        this.voyageApiKey = voyageApiKey;
        this.sessions = new Map();
    }
    async handleMessage(sessionId, message) {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = { history: [] };
            this.sessions.set(sessionId, session);
        }
        // 1. Detect language and record user input
        const lang = await this.translation.detectLanguage(message);
        session.history.push({ role: 'user', text: message });
        // 2. Translate to English if needed
        const technicalEnglish = lang === 'en'
            ? message
            : await this.translation.translate(message, lang, 'en');
        // 3. Embed query using Voyage API
        const queryEmbedding = await this.embedText(technicalEnglish);
        // 4. Retrieve context from Pinecone
        const matches = await this.vector.queryEmbedding(queryEmbedding, 5);
        let answer;
        if (matches.length === 0) {
            answer =
                "I'm sorry, I couldn't find information on that. Let me connect you to a human support agent.";
        }
        else {
            // 5. Generate a response with Gemini using the context
            answer = await this.generateAnswer(technicalEnglish, matches, lang);
        }
        // 6. Save assistant reply in history
        session.history.push({ role: 'assistant', text: answer });
        return answer;
    }
    async embedText(text) {
        const url = 'https://api.voyageai.com/v1/embeddings';
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.voyageApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ input: [text], model: 'voyage-3.5-lite', input_type: 'query' }),
        });
        if (!res.ok) {
            throw new Error('Failed to embed query');
        }
        const json = await res.json();
        return json.data[0].embedding;
    }
    async generateAnswer(englishQuery, contexts, userLang) {
        // assemble a prompt for Gemini
        const systemPrompt = 'You are Quantivo Smart Support. Use the provided context to answer the question concisely.';
        const contextText = contexts
            .map((c, i) => `Context ${i + 1}: ${c.metadata.originalText || c.metadata}`)
            .join('\n---\n');
        const prompt = `${systemPrompt}\n\nContext:\n${contextText}\n\nQuestion: ${englishQuery}`;
        // ask translation service to generate text
        let answerInEnglish = await this.translation.generate(prompt, {
            maxTokens: 300,
            temperature: 0.7,
            language: 'en',
        });
        // translate back if necessary
        if (userLang !== 'en') {
            answerInEnglish = await this.translation.translate(answerInEnglish, 'en', userLang);
        }
        return answerInEnglish;
    }
}
exports.ClientChatService = ClientChatService;
