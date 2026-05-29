import { useState } from "react";
import type { ErgonomicPayload } from "../types/payload";

interface PayloadPanelProps {
  payload: ErgonomicPayload | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-100 py-3 last:border-b-0 dark:border-slate-700">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">{label}</div>
      <div className="text-sm text-ink-900 dark:text-slate-100">{children}</div>
    </div>
  );
}

function TagList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <span className="text-ink-500 dark:text-slate-500">—</span>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="rounded border border-ink-300 bg-ink-100 px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function PayloadPanel({ payload }: PayloadPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    if (!payload) return;
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-ink-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="flex items-center justify-between border-b border-ink-300 px-5 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">
          Engineering Payload
        </h2>
        <button
          type="button"
          onClick={copyJson}
          disabled={!payload}
          className="rounded-md border border-ink-300 px-3 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-accent-500 hover:text-accent-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-accent-500 dark:hover:text-accent-500"
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        {!payload ? (
          <p className="py-4 text-sm text-ink-500 dark:text-slate-400">
            No payload yet. Once Claude analyzes a problem, the structured engineering parameters
            appear here.
          </p>
        ) : (
          <>
            <Field label="Study name">{payload.study_name}</Field>
            <Field label="Primary risk factors">
              <TagList items={payload.primary_risk_factors} />
            </Field>
            <Field label="Design interventions">
              <TagList items={payload.design_interventions} />
            </Field>
            <Field label="Preserve geometries (human contact)">
              <TagList items={payload.preserve_geometries} />
            </Field>
            <Field label="Spatial constraints (infrastructure)">
              <TagList items={payload.spatial_constraints} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Force load (N)">{payload.force_load_newtons}</Field>
              <Field label="Safety factor">{payload.safety_factor}</Field>
              <Field label="Task frequency (per hour)">
                {payload.task_frequency_per_hour ?? "—"}
              </Field>
              <Field label="Daily exposure (hours)">
                {payload.daily_exposure_hours ?? "—"}
              </Field>
            </div>
            <Field label="Material options">
              <TagList items={payload.material_options} />
            </Field>
            <Field label="Applicable standards">
              <TagList items={payload.applicable_standards} />
            </Field>
            <Field label="Design justification">
              <p className="leading-relaxed text-ink-700 dark:text-slate-300">{payload.design_justification}</p>
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
