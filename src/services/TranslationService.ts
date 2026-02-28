/**
 * Wraps Gemini API calls for language detection and translation.
 * Because we want "technical English" for embedding/querying, we
 * expose a simple detect/translate pair.
 */
export class TranslationService {
  constructor(private geminiApiKey: string) {}

  /**
   * Returns a BCP-47 language code such as "en", "fa", "ar" etc.
   */
  public async detectLanguage(text: string): Promise<string> {
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
    return json.language as string;
  }

  /**
   * Translate text from one language to another.  By convention we
   * translate into English before embedding, and back into the
   * original language for the final answer.
   */
  public async translate(
    text: string,
    from: string,
    to: string
  ): Promise<string> {
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
    return json.translation as string;
  }

  private headers() {
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
  public async generate(
    prompt: string,
    options: { maxTokens?: number; temperature?: number; language?: string } = {}
  ): Promise<string> {
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
    return json.text as string;
  }
}
