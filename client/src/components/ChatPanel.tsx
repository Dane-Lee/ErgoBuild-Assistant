import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types/payload";

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, loading, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = () => {
    const text = draft.trim();
    if (!text || loading) return;
    onSend(text);
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-ink-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="border-b border-ink-300 px-5 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">Conversation</h2>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-ink-500 dark:text-slate-400">
            Submit an analysis above to start. The conversation appears here; the structured
            engineering payload appears on the right.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm " +
                (m.role === "user"
                  ? "bg-accent-600 text-white"
                  : "border border-ink-300 bg-ink-100 text-ink-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100")
              }
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-ink-300 bg-ink-100 px-4 py-2 text-sm text-ink-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
              Analyzing…
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-ink-300 p-3 dark:border-slate-700">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask a follow-up…"
            className="flex-1 resize-none rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || draft.trim().length === 0}
            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
