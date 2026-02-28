/**
 * Abstraction for LLM providers (Gemini, Mistral, etc.)
 */
export interface LLMProvider {
  generate(prompt: string): Promise<string>;
}
