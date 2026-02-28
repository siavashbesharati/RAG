"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async generate(prompt) {
        const url = `${BASE_URL}?key=${encodeURIComponent(this.apiKey)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
            }),
        });
        if (!res.ok)
            throw new Error(`Gemini API failed: ${await res.text()}`);
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text)
            throw new Error('Gemini API returned empty response');
        return text.trim();
    }
}
exports.GeminiProvider = GeminiProvider;
