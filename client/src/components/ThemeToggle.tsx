import { useState } from "react";

export default function ThemeToggle() {
  // The inline script in index.html sets the initial class before React mounts.
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("ergo-theme", next ? "dark" : "light");
    } catch {
      /* ignore storage failures */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-accent-500 hover:text-accent-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-accent-500 dark:hover:text-accent-500"
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
