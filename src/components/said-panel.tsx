"use client";

import { useState } from "react";

import { getDictionary, type Locale } from "../i18n";

import { Markdown } from "./markdown";
import { CopyButton } from "./settings-parts";

// What the employee said at the end, formatted or as the text they wrote.
export function SaidPanel({ locale, name, text }: { readonly locale: Locale; readonly name: string; readonly text: string }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [plain, setPlain] = useState(false);
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
        <CopyButton text={text} copy={t.claude.copy} copied={t.claude.copied} />
      </div>
      <div className="panel-bd">{plain ? <pre className="said-raw">{text}</pre> : <Markdown text={text} />}</div>
    </div>
  );
}
