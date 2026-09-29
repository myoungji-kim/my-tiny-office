"use client";

import { APP_WIDTH_KEY, APP_WIDTHS, type AppWidth } from "./app-width";
import { useLocalChoice } from "./local-choice";

const parse = (saved: string | null) => (saved !== null && saved in APP_WIDTHS ? (saved as AppWidth) : undefined);

// The same choice from the settings screen (as options) and a task's page (as a switch).
export function WidthPicker({ label, names, look }: { readonly label: string; readonly names: Readonly<Record<AppWidth, string>>; readonly look: "opts" | "switch" }) {
  const [width, setWidth] = useLocalChoice<AppWidth>(APP_WIDTH_KEY, parse, "normal");
  const choose = (key: AppWidth) => {
    document.documentElement.style.setProperty("--app-width", APP_WIDTHS[key]);
    setWidth(key);
  };
  return (
    <div className={look === "opts" ? "opts" : "view-sw words"} role="radiogroup" aria-label={label}>
      {(Object.keys(APP_WIDTHS) as AppWidth[]).map((key) => (
        <button key={key} className={look === "opts" ? "opt" : undefined} type="button" role="radio" aria-checked={key === width} onClick={() => choose(key)}>
          {names[key]}
        </button>
      ))}
    </div>
  );
}
