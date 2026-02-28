"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
/**
 * Wraps Gemini API calls for language detection and translation.
 * Because we want "technical English" for embedding/querying, we
 * expose a simple detect/translate pair.
 */
class TranslationService {
    constructor(geminiApiKey) {
        this.geminiApiKey = geminiApiKey;
    }
    /**
     * Returns a BCP-47 language code such as "en", "fa", "ar" etc.
     */
    async detectLanguage(text) {
        const url = 'https://api.gemini.ai/v1/detect';
        const res = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ text }),
        });
        if (!res.ok) {
            throw new Error(`Language detection failed: ${await res.text()}`);
        }
        const json = await res.json();
        return json.language;
    }
    /**
     * Translate text from one language to another.  By convention we
     * translate into English before embedding, and back into the
     * original language for the final answer.
     */
    async translate(text, from, to) {
        const url = 'https://api.gemini.ai/v1/translate';
        const res = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({ text, from, to }),
        });
        if (!res.ok) {
            throw new Error(`Translation failed: ${await res.text()}`);
        }
        const json = await res.json();
        return json.translation;
    }
    headers() {
        return {
            Authorization: `Bearer ${this.geminiApiKey}`,
            'Content-Type': 'application/json',
        };
    }
    /**
     * Generic text generation using Gemini.  The caller constructs a
     * prompt and optionally requests a language for the output.  If
     * no language is specified, Gemini will default to English.
     */
    async generate(prompt, options = {}) {
        const url = 'https://api.gemini.ai/v1/generate';
        const res = await fetch(url, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                prompt,
                max_tokens: options.maxTokens || 256,
                temperature: options.temperature || 0.7,
                language: options.language,
            }),
        });
        if (!res.ok) {
            throw new Error(`Gemini generation failed: ${await res.text()}`);
        }
        const json = await res.json();
        return json.text;
    }
}
exports.TranslationService = TranslationService;
