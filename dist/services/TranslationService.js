"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = void 0;
/**
 * Uses an LLM provider (Gemini or Mistral) for language detection, translation, and text generation.
 */
class TranslationService {
    constructor(llm) {
        this.llm = llm;
    }
    /**
     * Returns a BCP-47 language code such as "en", "fa", "ar" etc.
     */
    async detectLanguage(text) {
        const prompt = `What is the ISO 639-1 two-letter language code of this text? Reply with ONLY the code, nothing else.\n\nText: ${text}`;
        const result = await this.llm.generate(prompt);
        return (result.split(/[\s,]/)[0] || 'en').toLowerCase().slice(0, 2);
    }
    /**
     * Translate text from one language to another.
     */
    async translate(text, from, to) {
        const prompt = `Translate the following text from ${from} to ${to}. Output ONLY the translation, no explanation.\n\nText: ${text}`;
        return this.llm.generate(prompt);
    }
    /**
     * Generate text using the configured LLM.
     */
    async generate(prompt, _options = {}) {
        return this.llm.generate(prompt);
    }
}
exports.TranslationService = TranslationService;
