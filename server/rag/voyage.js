// Minimal Voyage AI embeddings client (REST, via global fetch — no SDK dependency).
// Voyage is Anthropic's recommended embeddings provider.

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
export const VOYAGE_MODEL = process.env.VOYAGE_MODEL || "voyage-3.5";

// Tunable for rate limits. Unpaid Voyage keys are capped at 3 RPM / 10K TPM, so a
// small batch + spacing is required; paid keys can use large batches with no delay.
export const BATCH_SIZE = Number(process.env.VOYAGE_BATCH_SIZE) || 128;
const MIN_INTERVAL_MS = Number(process.env.VOYAGE_MIN_INTERVAL_MS) || 0;
const MAX_ATTEMPTS = 8;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getKey() {
  const key = process.env.VOYAGE_API_KEY;
  if (!key || key.includes("REPLACE_ME")) {
    throw new Error(
      "VOYAGE_API_KEY is missing or still the placeholder. Add your Voyage key to .env."
    );
  }
  return key;
}

async function embedBatch(inputs, inputType, key) {
  let lastBody = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ input: inputs, model: VOYAGE_MODEL, input_type: inputType }),
    });

    if (res.status === 429 || res.status >= 500) {
      lastBody = (await res.text()).slice(0, 200);
      // Honor Retry-After if present; otherwise exponential backoff capped at 30s.
      const ra = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(30000, 1000 * 2 ** attempt);
      await sleep(wait);
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Voyage API error ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json();
    // Preserve request order via the returned index.
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
  throw new Error(
    `Voyage API: exhausted ${MAX_ATTEMPTS} retries (rate limit or server error). Last: ${lastBody}`
  );
}

/**
 * Embed an array of document texts. Returns an array of vectors in the same order.
 * @param {string[]} texts
 * @param {(done:number,total:number)=>void} [onProgress]
 */
export async function embedDocuments(texts, onProgress) {
  const key = getKey();
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const start = Date.now();
    const vecs = await embedBatch(batch, "document", key);
    out.push(...vecs);
    onProgress?.(out.length, texts.length, vecs);
    if (MIN_INTERVAL_MS > 0 && i + BATCH_SIZE < texts.length) {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed);
    }
  }
  return out;
}

/**
 * Embed in batches, invoking onBatch(items, vectors) after each successful batch
 * so the caller can checkpoint progress. Resumable ingestion uses this.
 * @param {Array<{text:string}>} items
 * @param {(batchItems:any[], vectors:number[][])=>Promise<void>|void} onBatch
 */
export async function embedDocumentsBatched(items, onBatch) {
  const key = getKey();
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const start = Date.now();
    const vecs = await embedBatch(batch.map((it) => it.text), "document", key);
    await onBatch(batch, vecs);
    if (MIN_INTERVAL_MS > 0 && i + BATCH_SIZE < items.length) {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed);
    }
  }
}

/**
 * Embed a single query string. Returns one vector.
 * @param {string} text
 */
export async function embedQuery(text) {
  const key = getKey();
  const [vec] = await embedBatch([text], "query", key);
  return vec;
}
