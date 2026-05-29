import Anthropic from "@anthropic-ai/sdk";
import { ergoTool } from "./ergoTool.js";

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

/**
 * Forward a conversation to the Anthropic API with the ergonomic payload tool enabled.
 * @param {Array} messages - Anthropic message array ({ role, content }).
 * @param {string} [system] - System prompt; falls back to a minimal default.
 * @returns {Promise<{ content: Array, stop_reason: string }>}
 */
export async function analyze(messages, system) {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: system || "You are an expert Ergonomic Systems Engineer and design consultant.",
    tools: [ergoTool],
    messages,
  });

  return { content: response.content, stop_reason: response.stop_reason };
}
