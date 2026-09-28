"use client";

import { useEffect, useState } from "react";

import { getDictionary, type Locale } from "../i18n";

import { Icon } from "./icons";
import { Markdown } from "./markdown";

const COPY = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.2" />
  </svg>
);

const COPIED_MS = 1_500;

// What the employee said at the end, formatted or as the text they wrote,
// with the text a click away from the clipboard.
export function SaidPanel({ locale, name, text }: { readonly locale: Locale; readonly name: string; readonly text: string }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [plain, setPlain] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const label = copied ? t.claude.copied : t.claude.copy;

  return (
    <div className="panel">
      <div className="panel-hd said-hd">
        <h2>{w.said(name)}</h2>
        <div className="opts" role="radiogroup" aria-label={w.saidAs}>
          <button className="opt" type="button" role="radio" aria-checked={!plain} onClick={() => setPlain(false)}>
            {w.formatted}
          </button>
          <button className="opt" type="button" role="radio" aria-checked={plain} onClick={() => setPlain(true)}>
            {w.plain}
          </button>
        </div>
      </div>
      <div className="panel-bd said-bd">
        <button
          className={copied ? "copy-ic done" : "copy-ic"}
          type="button"
          aria-label={label}
          title={label}
          onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
        >
          {copied ? Icon.yes : COPY}
        </button>
        {plain ? <pre className="said-raw">{text}</pre> : <Markdown text={text} />}
      </div>
    </div>
  );
}
