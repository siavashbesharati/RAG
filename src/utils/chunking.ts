export function smartChunk(
  text: string,
  chunkSize = 500,
  overlapRatio = 0.15
): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;

  const overlap = Math.floor(chunkSize * overlapRatio);
  let start = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    if (end >= text.length) break; // done
    start = Math.max(0, end - overlap);
    if (start >= end) break; // no progress (text shorter than chunk size)
  }

  return chunks;
}
