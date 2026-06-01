// Character-based chunking with overlap, preferring paragraph/sentence boundaries.
// ~1200 chars (~300 tokens) per chunk keeps retrieval granular while staying well
// under Voyage's per-input token limit.

const CHUNK_SIZE = 1200;
const OVERLAP = 200;

/**
 * Split text into overlapping chunks.
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.chunkSize]
 * @param {number} [opts.overlap]
 * @returns {string[]}
 */
export function chunkText(text, opts = {}) {
  const chunkSize = opts.chunkSize ?? CHUNK_SIZE;
  const overlap = opts.overlap ?? OVERLAP;
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= chunkSize) return clean ? [clean] : [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);

    // If we're not at the very end, try to break on a natural boundary
    // (paragraph, then sentence, then space) within the last 25% of the window.
    if (end < clean.length) {
      const windowStart = start + Math.floor(chunkSize * 0.75);
      const slice = clean.slice(windowStart, end);
      const para = slice.lastIndexOf("\n\n");
      const sentence = slice.search(/[.!?]\s[^a-z]/);
      const space = slice.lastIndexOf(" ");
      const rel = para >= 0 ? para : sentence >= 0 ? sentence + 1 : space;
      if (rel >= 0) end = windowStart + rel + 1;
    }

    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
