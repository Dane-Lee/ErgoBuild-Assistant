import type { SavedAnalysis } from "../lib/history";

interface HistorySidebarProps {
  items: SavedAnalysis[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function HistorySidebar({ items, currentId, onSelect, onDelete, onNew }: HistorySidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-300 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-ink-300 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onNew}
          className="w-full rounded-lg bg-accent-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-500"
        >
          + New analysis
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">
          History
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-2 text-xs text-ink-500 dark:text-slate-400">
            Saved analyses appear here.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((it) => {
              const active = it.id === currentId;
              return (
                <li key={it.id}>
                  <div
                    className={
                      "group flex items-start gap-1 rounded-lg px-2 py-2 text-sm transition-colors " +
                      (active
                        ? "bg-accent-600/10 dark:bg-accent-500/15"
                        : "hover:bg-ink-100 dark:hover:bg-slate-700")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(it.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div
                        className={
                          "truncate font-medium " +
                          (active
                            ? "text-accent-600 dark:text-accent-500"
                            : "text-ink-900 dark:text-slate-100")
                        }
                        title={it.title}
                      >
                        {it.title}
                      </div>
                      <div className="text-xs text-ink-500 dark:text-slate-400">
                        {relativeTime(it.updatedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(it.id)}
                      aria-label="Delete analysis"
                      title="Delete"
                      className="rounded p-1 text-ink-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-slate-500"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
