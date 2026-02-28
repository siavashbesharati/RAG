"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralProvider = void 0;
const BASE_URL = 'https://api.mistral.ai/v1/chat/completions';
class MistralProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    async generate(prompt) {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1024,
            }),
        });
        if (!res.ok)
            throw new Error(`Mistral API failed: ${await res.text()}`);
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (!text)
            throw new Error('Mistral API returned empty response');
        return text.trim();
    }
}
exports.MistralProvider = MistralProvider;
