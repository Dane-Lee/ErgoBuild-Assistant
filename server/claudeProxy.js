import Anthropic from "@anthropic-ai/sdk";
import { ergoTool } from "./ergoTool.js";
import { retrieve, formatContext } from "./rag/retrieve.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

let client;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes("REPLACE_ME")) {
      throw new Error(
        "ANTHROPIC_API_KEY is missing or still set to the placeholder. Add your key to .env."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Pull plain text out of the most recent user turn for retrieval.
function latestUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const text = m.content
        .filter((b) => b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n");
      if (text.trim()) return text;
    }
  }
  return "";
}

/**
 * Forward a conversation to the Anthropic API with the ergonomic payload tool enabled.
 * Augments the system prompt with passages retrieved from the RAG store (if built).
 * @param {Array} messages - Anthropic message array ({ role, content }).
 * @param {string} [system] - Base system prompt; falls back to a minimal default.
 * @returns {Promise<{ content: Array, stop_reason: string, sources: Array }>}
 */
export async function analyze(messages, system) {
  const anthropic = getClient();
  const baseSystem = system || "You are an expert Ergonomic Systems Engineer and design consultant.";

  // RAG: retrieve relevant reference passages for the latest user message.
  let finalSystem = baseSystem;
  let sources = [];
  try {
    const passages = await retrieve(latestUserText(messages), 6);
    if (passages.length) {
      finalSystem = `${baseSystem}\n\n${formatContext(passages)}`;
      sources = passages.map((p) => ({ source: p.source, score: Number(p.score.toFixed(3)) }));
    }
  } catch (e) {
    // RAG is best-effort; never block an analysis if retrieval/embeddings fail.
    console.warn("[rag] retrieval skipped:", e.message);
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: finalSystem,
    tools: [ergoTool],
    messages,
  });

  return { content: response.content, stop_reason: response.stop_reason, sources };
}
