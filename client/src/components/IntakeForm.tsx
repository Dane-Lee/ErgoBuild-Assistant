import { useState } from "react";
import ConstraintTags from "./ConstraintTags";

const DOMAINS = [
  "Manufacturing / Assembly",
  "Warehouse / Material Handling",
  "Office / Workstation",
  "Healthcare / Patient Handling",
  "Laboratory",
  "Field / Outdoor",
  "Other",
];

const CONSTRAINT_OPTIONS = [
  "Limited budget",
  "No floor anchoring",
  "Must be height-adjustable",
  "Cleanroom-compatible",
  "Wheelchair accessible (ADA)",
  "Retrofit existing equipment",
  "Frequent repositioning",
  "High-cycle / repetitive use",
  "Wet / washdown environment",
];

export interface IntakeData {
  domain: string;
  population: string;
  task: string;
  constraints: string[];
}

interface IntakeFormProps {
  disabled: boolean;
  onAnalyze: (data: IntakeData) => void;
}

export default function IntakeForm({ disabled, onAnalyze }: IntakeFormProps) {
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [population, setPopulation] = useState("");
  const [task, setTask] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);

  const toggleConstraint = (tag: string) =>
    setConstraints((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const canSubmit = task.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSubmit) return;
    onAnalyze({ domain, population: population.trim(), task: task.trim(), constraints });
  };

  return (
    <section className="rounded-xl border border-ink-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-slate-400">
        New Analysis
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-slate-300">Domain</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-slate-300">User population</span>
          <input
            type="text"
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            placeholder="e.g. mixed-gender adults, 5th–95th percentile"
            disabled={disabled}
            className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-slate-300">Problem description</span>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={4}
          placeholder="Describe the ergonomic problem: the task, postures, forces, frequency, and what's going wrong."
          disabled={disabled}
          className="w-full resize-y rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </label>

      <div className="mt-4">
        <span className="mb-2 block text-sm font-medium text-ink-700 dark:text-slate-300">Constraints</span>
        <ConstraintTags options={CONSTRAINT_OPTIONS} selected={constraints} onToggle={toggleConstraint} />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-accent-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </section>
  );
}
