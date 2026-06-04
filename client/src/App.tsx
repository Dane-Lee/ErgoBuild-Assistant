import { useEffect, useState } from "react";
import IntakeForm, { type IntakeData } from "./components/IntakeForm";
import ThemeToggle from "./components/ThemeToggle";
import ChatPanel from "./components/ChatPanel";
import PayloadPanel from "./components/PayloadPanel";
import HistorySidebar from "./components/HistorySidebar";
import { analyze } from "./lib/claudeClient";
import {
  loadAll,
  upsert,
  remove,
  newId,
  deriveTitle,
  type SavedAnalysis,
} from "./lib/history";
import type {
  AnthropicMessage,
  ChatMessage,
  ContentBlock,
  ErgonomicPayload,
  RagSource,
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
  const [sources, setSources] = useState<RagSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [rag, setRag] = useState<{ ready: boolean; documents?: number } | null>(null);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    setAnalyses(loadAll());
    fetch("/api/rag/status")
      .then((r) => r.json())
      .then(setRag)
      .catch(() => setRag({ ready: false }));
  }, []);

  function persist(
    id: string,
    chatArr: ChatMessage[],
    messagesArr: AnthropicMessage[],
    payloadVal: ErgonomicPayload | null,
    sourcesVal: RagSource[]
  ) {
    if (!id || chatArr.length === 0) return;
    const existing = loadAll().find((a) => a.id === id);
    setAnalyses(
      upsert({
        id,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        title: deriveTitle(payloadVal, chatArr),
        chat: chatArr,
        messages: messagesArr,
        payload: payloadVal,
        sources: sourcesVal,
      })
    );
  }

  const runTurn = async (
    userText: string,
    opts?: { id?: string; baseChat?: ChatMessage[]; baseHistory?: AnthropicMessage[] }
  ) => {
    const id = opts?.id ?? currentId ?? newId();
    if (!currentId) setCurrentId(id);
    const baseChat = opts?.baseChat ?? chat;
    const baseHistory = opts?.baseHistory ?? history;

    setError(null);
    setLoading(true);

    const nextHistory = [...baseHistory, { role: "user", content: userText } as AnthropicMessage];
    const nextChat = [...baseChat, { role: "user", text: userText } as ChatMessage];
    setChat(nextChat);
    setHistory(nextHistory);

    try {
      const res = await analyze(nextHistory);

      const text = res.content
        .filter((b): b is { type: "text"; text: string } => b.type === "text")
        .map((b) => b.text)
        .join("\n\n")
        .trim();
      const finalChat = text ? [...nextChat, { role: "assistant", text } as ChatMessage] : nextChat;
      if (text) setChat(finalChat);

      const newSources = res.sources && res.sources.length ? res.sources : sources;
      if (res.sources && res.sources.length) setSources(res.sources);

      const toolUses = res.content.filter(isToolUse);
      const newPayload = toolUses.length > 0 ? toolUses[toolUses.length - 1].input : payload;
      if (toolUses.length > 0) setPayload(newPayload);

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

      persist(id, finalChat, updated, newPayload, newSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const onAnalyze = (data: IntakeData) => {
    const id = newId();
    setCurrentId(id);
    setStarted(true);
    setPayload(null);
    setSources([]);
    void runTurn(composeIntakeMessage(data), { id, baseChat: [], baseHistory: [] });
  };

  const newAnalysis = () => {
    setCurrentId(null);
    setHistory([]);
    setChat([]);
    setPayload(null);
    setSources([]);
    setError(null);
    setStarted(false);
  };

  const selectAnalysis = (id: string) => {
    const a = loadAll().find((x) => x.id === id);
    if (!a) return;
    setCurrentId(a.id);
    setHistory(a.messages);
    setChat(a.chat);
    setPayload(a.payload);
    setSources(a.sources);
    setStarted(true);
    setError(null);
  };

  const deleteAnalysis = (id: string) => {
    setAnalyses(remove(id));
    if (id === currentId) newAnalysis();
  };

  return (
    <div className="flex min-h-screen">
      <HistorySidebar
        items={analyses}
        currentId={currentId}
        onSelect={selectAnalysis}
        onDelete={deleteAnalysis}
        onNew={newAnalysis}
      />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-1 flex-col gap-5 p-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-slate-100">ErgoBuild Assistant</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-ink-500 dark:text-slate-400">Ergonomic design consultant</p>
              {rag && (
                <span
                  title={
                    rag.ready
                      ? "Reference library active — answers cite retrieved guidebook passages"
                      : "Reference library not built — run npm run rag:ingest"
                  }
                  className={
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (rag.ready
                      ? "bg-accent-600/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500"
                      : "bg-ink-100 text-ink-500 dark:bg-slate-700 dark:text-slate-400")
                  }
                >
                  <span className={"h-1.5 w-1.5 rounded-full " + (rag.ready ? "bg-accent-500" : "bg-ink-300")} />
                  {rag.ready ? `Library: ${rag.documents} docs` : "Library off"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {started && (
              <button
                type="button"
                onClick={newAnalysis}
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
          <ChatPanel messages={chat} loading={loading} onSend={(t) => runTurn(t)} />
          <PayloadPanel payload={payload} sources={sources} chat={chat} />
        </div>
      </div>
    </div>
  );
}
