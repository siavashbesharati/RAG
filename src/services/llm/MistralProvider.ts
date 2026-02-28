import { LLMProvider } from './LLMProvider';

const BASE_URL = 'https://api.mistral.ai/v1/chat/completions';

export class MistralProvider implements LLMProvider {
  constructor(private apiKey: string) {}

  async generate(prompt: string): Promise<string> {
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
    if (!res.ok) throw new Error(`Mistral API failed: ${await res.text()}`);
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Mistral API returned empty response');
    return text.trim();
  }
}
