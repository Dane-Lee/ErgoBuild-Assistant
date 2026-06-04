import dotenv from "dotenv";
dotenv.config({ override: true });

import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";

// Transcribe scanned (image-only) PDFs to text using Claude's vision/PDF support,
// so they can join the RAG index. Output is written as `<name>.ocr.txt` in corpus/,
// which `ingest.js` picks up automatically.
//
// Usage: drop the scanned PDFs into corpus/_ocr_input/, then `npm run rag:ocr`.
// (Scanned PDFs are excluded from the normal corpus during triage, so they are
// staged here explicitly. This step is deferred/optional and costs Anthropic tokens.)

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const INPUT_DIR = join(repoRoot, "corpus", "_ocr_input");
const CORPUS_DIR = join(repoRoot, "corpus");
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const PAGES_PER_REQUEST = 15; // keep image-token load per request reasonable

const PROMPT =
  "Transcribe ALL text from this document verbatim. Preserve headings, lists, and tables as plain text (use simple dashes/columns). Do not summarize, comment, or add anything — output only the transcription.";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes("REPLACE_ME")) {
    throw new Error("ANTHROPIC_API_KEY missing or placeholder. Add your key to .env.");
  }
  return new Anthropic({ apiKey });
}

// Split a PDF into base64 sub-PDFs of <= PAGES_PER_REQUEST pages each.
async function splitToBase64Parts(bytes) {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const parts = [];
  for (let start = 0; start < total; start += PAGES_PER_REQUEST) {
    const out = await PDFDocument.create();
    const end = Math.min(start + PAGES_PER_REQUEST, total);
    const idx = Array.from({ length: end - start }, (_, k) => start + k);
    const copied = await out.copyPages(src, idx);
    copied.forEach((p) => out.addPage(p));
    const b64 = Buffer.from(await out.save()).toString("base64");
    parts.push({ b64, range: `${start + 1}-${end}` });
  }
  return parts;
}

async function ocrFile(client, file) {
  const bytes = await readFile(join(INPUT_DIR, file));
  const parts = await splitToBase64Parts(bytes);
  console.log(`  ${file}: ${parts.length} part(s)`);
  const out = [];
  for (const part of parts) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: part.b64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    out.push(text);
    process.stdout.write(`\r    pages ${part.range} done`);
  }
  process.stdout.write("\n");
  return out.join("\n\n");
}

async function main() {
  if (!existsSync(INPUT_DIR)) {
    await mkdir(INPUT_DIR, { recursive: true });
    console.log(`Created ${INPUT_DIR}. Drop scanned PDFs there and re-run.`);
    return;
  }
  const files = (await readdir(INPUT_DIR)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  if (files.length === 0) {
    console.log(`No PDFs in ${INPUT_DIR}. Drop scanned PDFs there and re-run.`);
    return;
  }
  const client = getClient();
  console.log(`OCR via ${MODEL} for ${files.length} file(s):`);
  for (const file of files) {
    const text = await ocrFile(client, file);
    const outName = file.replace(/\.pdf$/i, "") + ".ocr.txt";
    await writeFile(join(CORPUS_DIR, outName), text);
    console.log(`  wrote corpus/${outName} (${text.length} chars)`);
  }
  console.log("\nDone. Run `npm run rag:ingest` to embed the OCR'd text.");
}

main().catch((e) => {
  console.error("OCR failed:", e.message);
  process.exit(1);
});
