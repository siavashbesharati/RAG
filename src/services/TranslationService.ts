import { LLMProvider } from './llm/LLMProvider';

/**
 * Uses an LLM provider (Gemini or Mistral) for language detection, translation, and text generation.
 */
export class TranslationService {
  constructor(private llm: LLMProvider) {}

  /**
   * Returns a BCP-47 language code such as "en", "fa", "ar" etc.
   */
  public async detectLanguage(text: string): Promise<string> {
    const prompt = `What is the ISO 639-1 two-letter language code of this text? Reply with ONLY the code, nothing else.\n\nText: ${text}`;
    const result = await this.llm.generate(prompt);
    return (result.split(/[\s,]/)[0] || 'en').toLowerCase().slice(0, 2);
  }

  /**
   * Translate text from one language to another.
   */
  public async translate(text: string, from: string, to: string): Promise<string> {
    const prompt = `Translate the following text from ${from} to ${to}. Output ONLY the translation, no explanation.\n\nText: ${text}`;
    return this.llm.generate(prompt);
  }

  /**
   * Generate text using the configured LLM.
   */
  public async generate(
    prompt: string,
    _options: { maxTokens?: number; temperature?: number; language?: string } = {}
  ): Promise<string> {
    return this.llm.generate(prompt);
  }
}
