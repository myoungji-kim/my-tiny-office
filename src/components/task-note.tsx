"use client";

import { useState, useTransition } from "react";

import { noteTaskAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";

// What the user adds to work someone is on: now, it stops the run and they
// carry on with it; held or stopped, it waits for their next run.
export function TaskNote({ locale, companyId, taskId, name, now }: { readonly locale: Locale; readonly companyId: string; readonly taskId: string; readonly name: string; readonly now: boolean }) {
  const t = getDictionary(locale);
  const w = t.projects.tk;
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const result = await noteTaskAction(companyId, taskId, text);
      if (result.error !== undefined) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      setError(undefined);
      setText("");
    });

  return (
    <div className="field">
      <label className="label" htmlFor="tk-note">
        {w.noteLabel(name)}
      </label>
      <div className="tk-say">
        <textarea
          className="textarea"
          id="tk-note"
          rows={2}
          placeholder={w.notePlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter that ends a Korean syllable is not a send; Shift+Enter is a new line
            if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || pending || text.trim() === "") return;
            e.preventDefault();
            send();
          }}
        />
        <button className="btn btn-secondary btn-sm" type="button" disabled={pending || text.trim() === ""} onClick={send}>
          {w.noteSend}
        </button>
      </div>
      <span className="hint" role={error === undefined ? undefined : "alert"}>
        {error ?? (now ? w.noteNow : w.noteLater)}
      </span>
    </div>
  );
}
