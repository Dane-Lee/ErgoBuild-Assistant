import dotenv from "dotenv";
dotenv.config({ override: true }); // .env is source of truth; see feedback note in repo history.

import { readFile, readdir, writeFile, mkdir, appendFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import { extractPdfText } from "./pdf.js";
import { chunkText } from "./chunk.js";
import { embedDocumentsBatched, VOYAGE_MODEL } from "./voyage.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const CORPUS_DIR = join(repoRoot, "corpus");
const STORE_DIR = join(here, "store");
const STORE_PATH = join(STORE_DIR, "index.json");
const CHECKPOINT_PATH = join(STORE_DIR, "checkpoint.jsonl");
// Default to the full manifest; INGEST_MANIFEST can point at a subset for a partial run.
const MANIFEST_PATH = process.env.INGEST_MANIFEST
  ? resolve(process.env.INGEST_MANIFEST)
  : join(here, "ingest-manifest.json");

const MIN_DOC_CHARS = 400; // below this, treat as scanned/empty and skip

function normalize(vec) {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

// Load any prior checkpoint as a map id -> embedding (only for the current model).
async function loadCheckpoint() {
  const done = new Map();
  if (!existsSync(CHECKPOINT_PATH)) return done;
  const rl = createInterface({ input: createReadStream(CHECKPOINT_PATH), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (rec.model === VOYAGE_MODEL && rec.id) done.set(rec.id, rec.embedding);
    } catch {
      /* ignore malformed line */
    }
  }
  return done;
}

async function main() {
  let files;
  if (existsSync(MANIFEST_PATH)) {
    files = JSON.parse(await readFile(MANIFEST_PATH, "utf8")).files;
  } else {
    files = (await readdir(CORPUS_DIR)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  }
  console.log(`Ingesting ${files.length} files from ${CORPUS_DIR}`);

  // 1. Extract + chunk every document into records.
  const records = [];
  const skipped = [];
  for (const file of files) {
    const path = join(CORPUS_DIR, file);
    if (!existsSync(path)) {
      skipped.push({ file, reason: "missing from corpus/" });
      continue;
    }
    let text = "";
    try {
      ({ text } = await extractPdfText(path));
    } catch (e) {
      skipped.push({ file, reason: `extract error: ${e.message}` });
      continue;
    }
    if (text.length < MIN_DOC_CHARS) {
      skipped.push({ file, reason: `no text layer (${text.length} chars)` });
      continue;
    }
    const source = file.replace(/\.pdf$/i, "");
    chunkText(text).forEach((chunk, i) => {
      records.push({ id: `${source}#${i}`, source, chunkIndex: i, text: chunk });
    });
  }
  if (skipped.length) {
    console.log(`Skipped ${skipped.length}: ${skipped.map((s) => s.file).join(", ")}`);
  }
  if (records.length === 0) {
    console.error("No chunks produced — aborting.");
    process.exit(1);
  }

  // 2. Resume: reuse embeddings already in the checkpoint.
  await mkdir(STORE_DIR, { recursive: true });
  const done = await loadCheckpoint();
  const todo = records.filter((r) => !done.has(r.id));
  console.log(
    `${records.length} chunks total; ${done.size} already embedded (checkpoint); ${todo.length} to embed via ${VOYAGE_MODEL}.`
  );

  // 3. Embed remaining, appending to the checkpoint after every batch.
  let embedded = 0;
  await embedDocumentsBatched(todo, async (batchItems, vectors) => {
    const lines = batchItems
      .map((it, i) => JSON.stringify({ model: VOYAGE_MODEL, id: it.id, embedding: vectors[i] }))
      .join("\n");
    await appendFile(CHECKPOINT_PATH, lines + "\n");
    for (let i = 0; i < batchItems.length; i++) done.set(batchItems[i].id, vectors[i]);
    embedded += batchItems.length;
    process.stdout.write(`\r  embedded ${done.size}/${records.length}`);
  });
  process.stdout.write("\n");

  // 4. Assemble the final store (normalized vectors for fast cosine).
  const chunks = records.map((r) => ({
    id: r.id,
    source: r.source,
    chunkIndex: r.chunkIndex,
    text: r.text,
    embedding: normalize(done.get(r.id)),
  }));
  const store = {
    model: VOYAGE_MODEL,
    dim: chunks[0].embedding.length,
    createdAt: new Date().toISOString(),
    documentCount: new Set(chunks.map((c) => c.source)).size,
    chunkCount: chunks.length,
    chunks,
  };
  await writeFile(STORE_PATH, JSON.stringify(store));
  await rm(CHECKPOINT_PATH, { force: true });

  console.log(
    `\nWrote ${STORE_PATH}\n  documents: ${store.documentCount}  chunks: ${store.chunkCount}  dim: ${store.dim}  (newly embedded this run: ${embedded})`
  );
}

main().catch((e) => {
  console.error("\nIngestion failed:", e.message);
  console.error("Progress is checkpointed — re-run `npm run rag:ingest` to resume.");
  process.exit(1);
});
