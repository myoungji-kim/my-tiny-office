"use client";

import { useState, useTransition } from "react";

import { setLocaleAction } from "../app/actions";
import type { Locale } from "../i18n";

export function LanguagePicker({
  locale,
  label,
  names,
}: {
  readonly locale: Locale;
  readonly label: string;
  readonly names: Readonly<Record<Locale, string>>;
}) {
  const [, start] = useTransition();
  return (
    <div className="opts" role="radiogroup" aria-label={label}>
      {(Object.keys(names) as Locale[]).map((code) => (
        // each language is named in itself
        <button key={code} className="opt" type="button" role="radio" aria-checked={code === locale} lang={code} onClick={() => start(() => setLocaleAction(code))}>
          {names[code]}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, copy, copied }: { readonly text: string; readonly copy: string; readonly copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-secondary btn-sm" type="button" onClick={() => void navigator.clipboard.writeText(text).then(() => setDone(true))}>
      {done ? copied : copy}
    </button>
  );
}
