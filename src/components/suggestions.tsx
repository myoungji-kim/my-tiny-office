"use client";

import { useCallback, useState, useTransition } from "react";

import { settleSuggestionAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView } from "../server/view-model";

import { TeachDialog } from "./teach-dialog";

interface Suggestion {
  readonly runId: string;
  readonly text: string;
}

// What the agent thought worth remembering. Nothing is kept until the user
// teaches it, in their own words if they like; passing on it lets it go.
export function Suggestions({
  locale,
  companyId,
  person,
  task,
  suggestions,
  memories,
  areas,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: EmployeeView;
  readonly task: { readonly id: string; readonly title: string };
  readonly suggestions: readonly Suggestion[];
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
}) {
  const w = getDictionary(locale).projects.tk;
  const [teaching, setTeaching] = useState<Suggestion | undefined>(undefined);
  const [pending, start] = useTransition();
  const close = useCallback(() => setTeaching(undefined), [setTeaching]);
  const settle = (s: Suggestion) => settleSuggestionAction(companyId, s.runId, s.text);

  return (
    <div className="panel sug-card">
      <div className="panel-hd">
        <h2>{w.suggestTitle}</h2>
        <p>{w.suggestWhy(person.name)}</p>
      </div>
      <div className="panel-bd">
        {suggestions.map((s) => (
          <div key={s.runId + s.text} className="sug">
            <span className="sug-tx">{s.text}</span>
            <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => start(async () => void (await settle(s)))}>
              {w.passIt}
            </button>
            <button className="btn btn-primary btn-sm" type="button" disabled={pending} onClick={() => setTeaching(s)}>
              {w.teachIt}
            </button>
          </div>
        ))}
      </div>
      {teaching !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "person", person }}
          memories={memories.filter((m) => m.employeeId === person.id)}
          areas={areas}
          source={{ taskId: task.id, title: task.title }}
          text={teaching.text}
          onTaught={() => settle(teaching)}
          onClose={close}
        />
      )}
    </div>
  );
}
