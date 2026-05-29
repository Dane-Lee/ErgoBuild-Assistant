import { useState } from "react";
import IntakeForm, { type IntakeData } from "./components/IntakeForm";
import ThemeToggle from "./components/ThemeToggle";
import ChatPanel from "./components/ChatPanel";
import PayloadPanel from "./components/PayloadPanel";
import { analyze } from "./lib/claudeClient";
import type {
  AnthropicMessage,
  ChatMessage,
  ContentBlock,
  ErgonomicPayload,
  ToolUseBlock,
} from "./types/payload";

function composeIntakeMessage(data: IntakeData): string {
  const lines = [
    `Domain: ${data.domain}`,
    data.population ? `User population: ${data.population}` : null,
    data.constraints.length ? `Constraints: ${data.constraints.join(", ")}` : null,
    data.taskFrequencyPerHour !== undefined
      ? `Task frequency: ${data.taskFrequencyPerHour} times per hour`
      : null,
    data.dailyExposureHours !== undefined
      ? `Daily exposure: ${data.dailyExposureHours} hours per shift`
      : null,
    "",
    `Problem: ${data.task}`,
  ].filter((l): l is string => l !== null);
  return lines.join("\n");
}

function isToolUse(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use" && (block as ToolUseBlock).name === "generate_ergonomic_payload";
}

export default function App() {
  const [history, setHistory] = useState<AnthropicMessage[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [payload, setPayload] = useState<ErgonomicPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const runTurn = async (userText: string) => {
    setError(null);
    setLoading(true);

    const userMessage: AnthropicMessage = { role: "user", content: userText };
    const nextHistory = [...history, userMessage];

    setChat((prev) => [...prev, { role: "user", text: userText }]);
    setHistory(nextHistory);

    try {
      const res = await analyze(nextHistory);

      // Chat text = concatenation of all text blocks.
      const text = res.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
        .trim();
      if (text) setChat((prev) => [...prev, { role: "assistant", text }]);

      // Latest payload from a tool_use block, if present.
      const toolUses = res.content.filter(isToolUse);
      if (toolUses.length > 0) {
        setPayload(toolUses[toolUses.length - 1].input);
      }

      // Persist the assistant turn, plus tool_result blocks so follow-ups stay valid.
      const updated: AnthropicMessage[] = [...nextHistory, { role: "assistant", content: res.content }];
      if (toolUses.length > 0) {
        updated.push({
          role: "user",
          content: toolUses.map((t) => ({
            type: "tool_result",
            tool_use_id: t.id,
            content: "Payload received and rendered.",
          })),
        });
      }
      setHistory(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const onAnalyze = (data: IntakeData) => {
    setStarted(true);
    void runTurn(composeIntakeMessage(data));
  };

  const clearConversation = () => {
    setHistory([]);
    setChat([]);
    setPayload(null);
    setError(null);
    setStarted(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-slate-100">ErgoBuild Assistant</h1>
          <p className="text-sm text-ink-500 dark:text-slate-400">Ergonomic design consultant</p>
        </div>
        <div className="flex items-center gap-2">
          {started && (
            <button
              type="button"
              onClick={clearConversation}
              className="rounded-lg border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-red-400 hover:text-red-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-red-400 dark:hover:text-red-400"
            >
              Clear conversation
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <IntakeForm disabled={loading} onAnalyze={onAnalyze} />

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-h-[60vh] flex-1 grid-cols-1 gap-5 lg:grid-cols-2">
        <ChatPanel messages={chat} loading={loading} onSend={runTurn} />
        <PayloadPanel payload={payload} />
      </div>
    </div>
  );
}
