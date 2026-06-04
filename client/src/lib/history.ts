import type { AnthropicMessage, ChatMessage, ErgonomicPayload, RagSource } from "../types/payload";

export interface SavedAnalysis {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  chat: ChatMessage[];
  messages: AnthropicMessage[]; // raw API history, so follow-ups can continue
  payload: ErgonomicPayload | null;
  sources: RagSource[];
}

const KEY = "ergo-analyses";

export function loadAll(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(KEY);
    const items = raw ? (JSON.parse(raw) as SavedAnalysis[]) : [];
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

function saveAll(items: SavedAnalysis[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function upsert(item: SavedAnalysis): SavedAnalysis[] {
  const all = loadAll();
  const idx = all.findIndex((a) => a.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  saveAll(all);
  return loadAll();
}

export function remove(id: string): SavedAnalysis[] {
  saveAll(loadAll().filter((a) => a.id !== id));
  return loadAll();
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Derive a short title from the payload study name or the first user message. */
export function deriveTitle(payload: ErgonomicPayload | null, chat: ChatMessage[]): string {
  if (payload?.study_name) return payload.study_name;
  const firstUser = chat.find((m) => m.role === "user");
  if (firstUser) {
    const problem = firstUser.text.split("\n").find((l) => /problem/i.test(l)) || firstUser.text;
    const cleaned = problem.replace(/^problem:\s*/i, "").trim();
    return cleaned.length > 60 ? cleaned.slice(0, 57) + "…" : cleaned || "Untitled analysis";
  }
  return "Untitled analysis";
}
