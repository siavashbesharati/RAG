import { randomUUID } from 'crypto';

export function uuid() {
  return randomUUID();
}

export function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;
  let i = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push({ id: `chunk_${i}`, text: chunk });
      i++;
    }
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}
