interface ConstraintTagsProps {
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function ConstraintTags({ options, selected, onToggle }: ConstraintTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (active
                ? "border-accent-600 bg-accent-600 text-white"
                : "border-ink-300 bg-white text-ink-700 hover:border-accent-500 hover:text-accent-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-accent-500 dark:hover:text-accent-500")
            }
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
