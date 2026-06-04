import Anthropic from "@anthropic-ai/sdk";
import { ergoTool } from "./ergoTool.js";
import { retrieve, formatContext } from "./rag/retrieve.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
 * Prepare the messages array for caching + RAG:
 * - Injects the retrieved reference excerpts into the latest user turn (NOT the
 *   system prompt), so the tools+system prefix stays byte-stable and cacheable.
 * - Puts a cache_control breakpoint on the last block of the latest turn so the
 *   whole conversation prefix is reused on the next turn (multi-turn caching).
 */
function prepareMessages(messages, contextText) {
  if (!messages.length) return messages;
  const out = messages.map((m) => ({ ...m }));

  // Target the most recent user turn (the current question).
  let idx = out.length - 1;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i].role === "user") {
      idx = i;
      break;
    }
  }

  const target = out[idx];
  let blocks =
    typeof target.content === "string"
      ? [{ type: "text", text: target.content }]
      : target.content.map((b) => ({ ...b }));

  // Cache breakpoint on the turn's ORIGINAL last block. Everything up to and
  // including it is byte-identical when the client replays this turn as history
  // next time, so the cached prefix is reusable across turns. The volatile RAG
  // context is appended AFTER this breakpoint, so it never enters the cached
  // region (and the client never persists it, so historical turns still match).
  const bp = blocks.length - 1;
  blocks[bp] = { ...blocks[bp], cache_control: { type: "ephemeral" } };

  if (contextText) {
    blocks.push({ type: "text", text: contextText });
  }

  out[idx] = { ...target, content: blocks };
  return out;
}

/**
 * Forward a conversation to the Anthropic API with the ergonomic payload tool enabled.
 * Retrieves RAG passages for the latest user message and injects them into that turn.
 * @param {Array} messages - Anthropic message array ({ role, content }).
 * @param {string} [system] - Base system prompt; falls back to a minimal default.
 * @returns {Promise<{ content: Array, stop_reason: string, sources: Array }>}
 */
export async function analyze(messages, system) {
  const anthropic = getClient();
  const baseSystem = system || "You are an expert Ergonomic Systems Engineer and design consultant.";

  // RAG: retrieve relevant reference passages for the latest user message.
  let contextText = "";
  let sources = [];
  try {
    const passages = await retrieve(latestUserText(messages), 6);
    if (passages.length) {
      contextText = formatContext(passages);
      sources = passages.map((p) => ({ source: p.source, score: Number(p.score.toFixed(3)) }));
    }
  } catch (e) {
    // RAG is best-effort; never block an analysis if retrieval/embeddings fail.
    console.warn("[rag] retrieval skipped:", e.message);
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    // Array form so the stable base prompt carries a cache breakpoint.
    // The volatile RAG context lives in the user turn (see prepareMessages),
    // keeping tools + system byte-identical across requests.
    system: [{ type: "text", text: baseSystem, cache_control: { type: "ephemeral" } }],
    tools: [ergoTool],
    messages: prepareMessages(messages, contextText),
  });

  const u = response.usage;
  if (u && (u.cache_read_input_tokens || u.cache_creation_input_tokens)) {
    console.log(
      `[cache] read=${u.cache_read_input_tokens ?? 0} write=${u.cache_creation_input_tokens ?? 0} input=${u.input_tokens ?? 0}`
    );
  }

  return { content: response.content, stop_reason: response.stop_reason, sources };
}
