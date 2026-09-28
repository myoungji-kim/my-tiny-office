"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { reviseMemoryAction, teachAction } from "../app/people-actions";
import { MAX_MEMORY_TEXT } from "../domain/memory";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView } from "../server/view-model";

import { Icon } from "./icons";
import { areaName } from "./names";
import { Sprite } from "./sprite";

// Every place that says "teach" opens this one dialog; where it was opened
// from decides only what is already filled in. `source` is the task it was
// opened from, which is where the memory came from.
export function TeachDialog({
  locale,
  companyId,
  person,
  memories,
  areas,
  edit,
  area,
  source,
  onClose,
  onSaved,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: Pick<EmployeeView, "id" | "name" | "species" | "status">;
  // what this person already carries
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly edit?: MemoryView;
  readonly area?: string;
  readonly source?: { readonly taskId: string; readonly title: string };
  readonly onClose: () => void;
  readonly onSaved?: (areaId: string | undefined) => void;
}) {
  const t = getDictionary(locale);
  const w = t.teach;
  const [areaId, setAreaId] = useState(edit?.areaId ?? area);
  const [text, setText] = useState(edit?.text ?? "");
  const [keepSource, setKeepSource] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    field.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const others = memories.filter((m) => m.id !== edit?.id);
  const before = others.reduce((n, m) => n + m.text.length, 0);
  const len = text.trim().length;
  const chosen = areas.find((a) => a.id === areaId);
  // A first memory in an area is what makes it theirs.
  const gains = chosen !== undefined && !others.some((m) => m.kind === "expertise" && m.areaId === chosen.id);
  const from = edit?.source ?? source?.title;

  const save = () =>
    start(async () => {
      const result =
        edit === undefined
          ? await teachAction(companyId, {
              kind: "expertise",
              employeeId: person.id,
              areaId,
              text,
              sourceTaskId: keepSource ? source?.taskId : undefined,
            })
          : await reviseMemoryAction(companyId, edit.id, text, areaId);
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      onClose();
      onSaved?.(areaId);
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="teach-title">
        <div className="m-hd">
          <span className="m-av">
            <Sprite species={person.species} size={32} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="teach-title">
              {edit === undefined ? w.titleTo(person.name) : w.titleEdit}
            </span>
            <span className="m-s">{w.subTo}</span>
          </span>
          <button className="ibtn" type="button" aria-label={w.cancel} onClick={onClose}>
            {Icon.x}
          </button>
        </div>
        <div className="m-sec">
          <span className="k">{w.area}</span>
          <div className="opts" role="radiogroup" aria-label={w.area}>
            {areas.map((a) => (
              <button key={a.id} className="opt" type="button" role="radio" aria-checked={a.id === areaId} onClick={() => setAreaId(a.id)}>
                {areaName(a, t.areas)}
              </button>
            ))}
          </div>
          <div className="field">
            <label className="label" htmlFor="teach-text">
              {w.text}
            </label>
            <textarea
              ref={field}
              className="textarea"
              id="teach-text"
              rows={3}
              maxLength={MAX_MEMORY_TEXT}
              placeholder={w.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="field-foot">
              <span className="hint">{w.hint}</span>
              <span className="count">
                {text.length}/{MAX_MEMORY_TEXT}
              </span>
            </span>
          </div>
          {from !== undefined && edit === undefined && (
            <label className="source">
              <input type="checkbox" checked={keepSource} onChange={(e) => setKeepSource(e.target.checked)} />
              <span>{w.source(from)}</span>
            </label>
          )}
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="m-sec" data-effect="">
          {gains && (
            <span className="gain">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.4l3.2 3.2L13 4.8" />
              </svg>
              {w.gainArea(person.name, areaName(chosen, t.areas))}
            </span>
          )}
          {person.status === "onLeave" && <span className="hint">{w.onLeave}</span>}
          <span className="hint">{w.carried(before, before + len)}</span>
        </div>
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={len === 0 || areaId === undefined || pending} onClick={save}>
            {edit === undefined ? w.teach : w.save}
          </button>
        </div>
      </div>
    </div>
  );
}
