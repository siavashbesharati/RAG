export interface VectorData {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export interface QueryResult {
  id: string;
  score: number;
  values: number[];
  metadata: Record<string, any>;
}

export interface ChatSession {
  history: { role: 'user' | 'assistant'; text: string }[];
}
