import type { ExtractedPage } from "./extract";

export interface Chunk {
  content: string;
  page: number;
  chunkId: number;
}

export function chunkPages(
  pages: ExtractedPage[],
  { chunkSize = 1000, overlap = 200 }: { chunkSize?: number; overlap?: number } = {}
): Chunk[] {
  const chunks: Chunk[] = [];
  let globalChunkId = 0;

  for (const { page, text } of pages) {
    const pageChunks = splitText(text, chunkSize, overlap);
    for (const content of pageChunks) {
      chunks.push({ content, page, chunkId: globalChunkId++ });
    }
  }

  return chunks;
}

function splitText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  const len = text.length;
  if (len === 0) return chunks;

  while (start < len) {
    let end = Math.min(start + chunkSize, len);
    if (end < len) {
      const boundary = Math.max(
        text.lastIndexOf("\n\n", end),
        text.lastIndexOf(". ", end),
        text.lastIndexOf("? ", end),
        text.lastIndexOf("! ", end)
      );
      if (boundary > start && boundary > start + chunkSize / 2) {
        end = boundary + 2;
      }
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end >= len) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}
