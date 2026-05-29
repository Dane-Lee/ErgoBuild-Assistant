import { SYSTEM_PROMPT } from "./systemPrompt";
import type { AnalyzeResponse, AnthropicMessage } from "../types/payload";

/**
 * Send the full conversation to the local backend, which proxies the Anthropic API.
 * Returns Claude's raw content blocks (text + tool_use).
 */
export async function analyze(messages: AnthropicMessage[]): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system: SYSTEM_PROMPT }),
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      /* ignore parse failure */
    }
    throw new Error(detail);
  }

  return (await res.json()) as AnalyzeResponse;
}
