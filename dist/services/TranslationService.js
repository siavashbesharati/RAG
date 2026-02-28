"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
/**
 * Uses Google Gemini API for language detection, translation, and text generation.
 * API: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
 */
class TranslationService {
    constructor(geminiApiKey) {
        this.geminiApiKey = geminiApiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }
    async callGemini(prompt, systemInstruction) {
        const url = `${this.baseUrl}?key=${encodeURIComponent(this.geminiApiKey)}`;
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];
        const body = {
            contents,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
            },
        };
        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Gemini API failed: ${text}`);
        }
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text)
            throw new Error('Gemini API returned empty response');
        return text.trim();
    }
    /**
     * Returns a BCP-47 language code such as "en", "fa", "ar" etc.
     */
    async detectLanguage(text) {
        const prompt = `What is the ISO 639-1 two-letter language code of this text? Reply with ONLY the code, nothing else.\n\nText: ${text}`;
        const result = await this.callGemini(prompt);
        return (result.split(/[\s,]/)[0] || 'en').toLowerCase().slice(0, 2);
    }
    /**
     * Translate text from one language to another.
     */
    async translate(text, from, to) {
        const prompt = `Translate the following text from ${from} to ${to}. Output ONLY the translation, no explanation.\n\nText: ${text}`;
        return this.callGemini(prompt);
    }
    /**
     * Generate text using Gemini.
     */
    async generate(prompt, _options = {}) {
        return this.callGemini(prompt);
    }
}
exports.TranslationService = TranslationService;
