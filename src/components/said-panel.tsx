"use client";

import { useEffect, useState } from "react";

import { getDictionary, type Locale } from "../i18n";

import { Icon } from "./icons";
import { Markdown } from "./markdown";
import { Sprite } from "./sprite";

const COPY = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" />
    <path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h.2" />
  </svg>
);

const PREVIEW = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M1.6 8s2.4-4 6.4-4 6.4 4 6.4 4-2.4 4-6.4 4-6.4-4-6.4-4z" />
    <circle cx="8" cy="8" r="1.7" />
  </svg>
);

const SOURCE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />
  </svg>
);

const COPIED_MS = 1_500;

// What the employee said at the end, read like a reply: across the page,
// formatted or as the text they wrote, a click away from the clipboard.
export function SaidPanel({ locale, name, species, text }: { readonly locale: Locale; readonly name: string; readonly species: string; readonly text: string }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [plain, setPlain] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyLabel = copied ? t.claude.copied : t.claude.copy;

  return (
    <div className="panel said-card">
      <div className="panel-hd said-hd">
        <span className="said-av">
          <Sprite species={species} size={32} />
        </span>
        <h2>{w.said(name)}</h2>
        <div className="view-sw" role="radiogroup" aria-label={w.saidAs}>
          <button type="button" role="radio" aria-checked={!plain} aria-label={w.formatted} title={w.formatted} onClick={() => setPlain(false)}>
            {PREVIEW}
          </button>
          <button type="button" role="radio" aria-checked={plain} aria-label={w.plain} title={w.plain} onClick={() => setPlain(true)}>
            {SOURCE}
          </button>
        </div>
      </div>
      <div className="panel-bd said-bd">
        <button
          className={copied ? "copy-ic done" : "copy-ic"}
          type="button"
          aria-label={copyLabel}
          title={copyLabel}
          onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true))}
        >
          {copied ? Icon.yes : COPY}
        </button>
        <div className="said-text">{plain ? <pre className="said-raw">{text}</pre> : <Markdown text={text} />}</div>
      </div>
    </div>
  );
}
