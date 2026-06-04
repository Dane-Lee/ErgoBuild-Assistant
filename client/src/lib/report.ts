import type { ChatMessage, ErgonomicPayload, RagSource } from "../types/payload";

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function list(items?: (string | number)[]): string {
  if (!items || items.length === 0) return "<span class='muted'>—</span>";
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

interface ReportInput {
  chat: ChatMessage[];
  payload: ErgonomicPayload | null;
  sources: RagSource[];
}

/**
 * Build a formatted HTML report and open it in a new window for printing
 * (the browser's "Save as PDF" produces the file — no external dependency).
 */
export function exportReport({ chat, payload, sources }: ReportInput): void {
  const title = payload?.study_name || "Ergonomic Analysis";
  const date = new Date().toLocaleString();
  const uniqueSources = Array.from(new Set(sources.map((s) => s.source)));

  const payloadHtml = payload
    ? `
    <table class="kv">
      <tr><th>Study name</th><td>${esc(payload.study_name)}</td></tr>
      <tr><th>Force load (N)</th><td>${esc(payload.force_load_newtons)}</td></tr>
      <tr><th>Safety factor</th><td>${esc(payload.safety_factor)}</td></tr>
      <tr><th>Task frequency (per hour)</th><td>${esc(payload.task_frequency_per_hour ?? "—")}</td></tr>
      <tr><th>Daily exposure (hours)</th><td>${esc(payload.daily_exposure_hours ?? "—")}</td></tr>
    </table>
    <h3>Primary risk factors</h3>${list(payload.primary_risk_factors)}
    <h3>Design interventions</h3>${list(payload.design_interventions)}
    <h3>Preserve geometries (human contact)</h3>${list(payload.preserve_geometries)}
    <h3>Spatial constraints (infrastructure)</h3>${list(payload.spatial_constraints)}
    <h3>Material options</h3>${list(payload.material_options)}
    <h3>Applicable standards</h3>${list(payload.applicable_standards)}
    <h3>Design justification</h3><p>${esc(payload.design_justification)}</p>
    `
    : "<p class='muted'>No structured payload was generated.</p>";

  const sourcesHtml = uniqueSources.length
    ? `<h3>Reference sources (retrieved)</h3>${list(uniqueSources)}`
    : "";

  const transcriptHtml = chat
    .map(
      (m) =>
        `<div class="turn ${m.role}"><div class="who">${m.role === "user" ? "Analyst" : "ErgoBuild"}</div><div class="msg">${esc(
          m.text
        ).replace(/\n/g, "<br>")}</div></div>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #0f172a; max-width: 820px; margin: 40px auto; padding: 0 24px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 15px; text-transform: uppercase; letter-spacing: .05em; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin: 28px 0 10px; }
    h3 { font-size: 13px; margin: 16px 0 4px; color: #334155; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 8px; }
    table.kv { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.kv th { text-align: left; width: 220px; color: #475569; font-weight: 600; vertical-align: top; padding: 4px 8px 4px 0; }
    table.kv td { padding: 4px 0; }
    ul { margin: 4px 0 4px 18px; padding: 0; }
    li { margin: 2px 0; }
    .muted { color: #94a3b8; }
    .turn { margin: 10px 0; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .turn.user { background: #f1f5f9; }
    .who { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #64748b; margin-bottom: 4px; }
    @media print { body { margin: 0; } h2 { break-after: avoid; } .turn { break-inside: avoid; } }
  </style></head><body>
  <h1>${esc(title)}</h1>
  <div class="meta">ErgoBuild Assistant &middot; ${esc(date)}</div>
  <h2>Engineering Payload</h2>
  ${payloadHtml}
  ${sourcesHtml}
  <h2>Conversation</h2>
  ${transcriptHtml}
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to export the report.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
