import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

// pdf-parse's package entry (index.js) runs debug code that reads a bundled
// test file when imported as a module; require the lib directly to avoid it.
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

/**
 * Extract plain text from a PDF file.
 * @param {string} filePath
 * @returns {Promise<{ text: string, pages: number }>}
 */
export async function extractPdfText(filePath) {
  const data = await readFile(filePath);
  const result = await pdfParse(data);
  // Normalize whitespace: collapse runs of blank lines and trailing spaces.
  const text = result.text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, pages: result.numpages };
}
