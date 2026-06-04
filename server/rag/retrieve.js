import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { embedQuery } from "./voyage.js";

const here = dirname(fileURLToPath(import.meta.url));
const STORE_PATH = join(here, "store", "index.json");

let store = null;
let loadAttempted = false;

async function loadStore() {
  if (loadAttempted) return store;
  loadAttempted = true;
  if (!existsSync(STORE_PATH)) {
    store = null;
    return null;
  }
  const raw = await readFile(STORE_PATH, "utf8");
  store = JSON.parse(raw);
  return store;
}

export async function ragStatus() {
  const s = await loadStore();
  if (!s) return { ready: false };
  return { ready: true, model: s.model, documents: s.documentCount, chunks: s.chunkCount };
}

// Store embeddings are unit vectors, so cosine similarity == dot product.
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function normalizeQuery(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

const MAX_PER_SOURCE = Number(process.env.RAG_MAX_PER_SOURCE) || 2;

/**
 * Retrieve the top-k most relevant chunks for a query, with a per-source cap so a
 * single large document can't crowd out other relevant guidebooks (diversity).
 * Returns [] if no index has been built (RAG is optional).
 * @param {string} query
 * @param {number} [k]
 * @param {number} [maxPerSource]
 * @returns {Promise<Array<{ source:string, text:string, score:number }>>}
 */
export async function retrieve(query, k = 6, maxPerSource = MAX_PER_SOURCE) {
  const s = await loadStore();
  if (!s || !query?.trim()) return [];

  const qvec = normalizeQuery(await embedQuery(query));
  const scored = s.chunks.map((c) => ({ source: c.source, text: c.text, score: dot(qvec, c.embedding) }));
  scored.sort((a, b) => b.score - a.score);

  // Greedily pick by score while enforcing the per-source cap.
  const perSource = new Map();
  const picked = [];
  for (const cand of scored) {
    const used = perSource.get(cand.source) || 0;
    if (used >= maxPerSource) continue;
    perSource.set(cand.source, used + 1);
    picked.push(cand);
    if (picked.length >= k) break;
  }

  // If the cap left us short (small/narrow corpus), top up by raw score.
  if (picked.length < k) {
    const chosen = new Set(picked);
    for (const cand of scored) {
      if (chosen.has(cand)) continue;
      picked.push(cand);
      if (picked.length >= k) break;
    }
  }
  return picked;
}

/**
 * Format retrieved passages into a context block for the system prompt.
 * @param {Array<{source:string,text:string}>} passages
 */
export function formatContext(passages) {
  if (!passages.length) return "";
  const blocks = passages
    .map((p, i) => `[${i + 1}] Source: ${p.source}\n${p.text}`)
    .join("\n\n---\n\n");
  return `You have access to the following excerpts retrieved from the ergonomics reference library. Use them as your primary evidence. In design_justification, cite the specific source document(s) by name for each key number or recommendation you draw from them. If none of the excerpts are relevant to the question, say so explicitly in design_justification rather than inventing a citation.

=== RETRIEVED REFERENCE EXCERPTS ===
${blocks}
=== END EXCERPTS ===`;
}
