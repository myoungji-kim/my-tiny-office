"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { reviseMemoryAction, teachAction } from "../app/people-actions";
import { MAX_MEMORY_TEXT } from "../domain/memory";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView } from "../server/view-model";

import { Icon } from "./icons";
import { areaName } from "./names";
import { Sprite } from "./sprite";

type Person = Pick<EmployeeView, "id" | "name" | "species" | "status" | "role">;

// Who the memory goes to: one person, the whole company, or someone the user
// picks from `people` here.
export type TeachTarget =
  | { readonly kind: "person"; readonly person: Person }
  | { readonly kind: "company" }
  | { readonly kind: "pick"; readonly people: readonly Person[] };

const HOUSE = (
  <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M2 6.5L8 2l6 4.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
  </svg>
);

// Every place that says "teach" opens this one dialog; where it was opened
// from decides only what is already filled in. `source` is the task it was
// opened from, which is where the memory came from.
export function TeachDialog({
  locale,
  companyId,
  target,
  memories,
  areas,
  edit,
  area,
  source,
  text: startWith,
  onTaught,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly target: TeachTarget;
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly edit?: MemoryView;
  readonly area?: string;
  readonly source?: { readonly taskId: string; readonly title: string };
  // what to start from, such as something an agent thought worth remembering
  readonly text?: string;
  // after the memory is kept, before the dialog closes
  readonly onTaught?: () => Promise<unknown>;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.teach;
  const company = target.kind === "company";
  const [picked, setPicked] = useState<Person | undefined>(target.kind === "person" ? target.person : undefined);
  const [areaId, setAreaId] = useState(company ? undefined : (edit?.areaId ?? area));
  const [text, setText] = useState(edit?.text ?? startWith ?? "");
  const [keepSource, setKeepSource] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const field = useRef<HTMLTextAreaElement>(null);
  const firstPick = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    (firstPick.current ?? field.current)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus({ preventScroll: true });
    };
  }, [onClose]);

  // what the one it goes to already carries
  const carried = memories.filter((m) => m.id !== edit?.id && (company ? m.kind === "company" : m.employeeId === picked?.id));
  const before = carried.reduce((n, m) => n + m.text.length, 0);
  const len = text.trim().length;
  const chosen = areas.find((a) => a.id === areaId);
  // A first memory in an area is what makes it theirs.
  const gains = picked !== undefined && chosen !== undefined && !carried.some((m) => m.kind === "expertise" && m.areaId === chosen.id);
  const from = edit?.source ?? source?.title;
  const inArea = (p: Person) => memories.filter((m) => m.kind === "expertise" && m.employeeId === p.id && m.areaId === areaId).length;

  const title =
    edit !== undefined
      ? w.titleEdit
      : company
        ? w.titleCompany
        : target.kind === "pick"
          ? w.titlePick(chosen === undefined ? "" : areaName(chosen, t.areas))
          : w.titleTo(target.person.name);
  const sub = company ? w.subCompany : target.kind === "pick" && edit === undefined ? w.subPick : w.subTo;

  const save = () =>
    start(async () => {
      const result =
        edit !== undefined
          ? await reviseMemoryAction(companyId, edit.id, text, areaId)
          : company
            ? await teachAction(companyId, { kind: "company", employeeId: undefined, areaId: undefined, text, sourceTaskId: undefined })
            : await teachAction(companyId, {
                kind: "expertise",
                employeeId: picked?.id,
                areaId,
                text,
                sourceTaskId: keepSource ? source?.taskId : undefined,
              });
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      await onTaught?.();
      onClose();
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="teach-title">
        <div className="m-hd">
          <span className="m-av">{picked === undefined ? HOUSE : <Sprite species={picked.species} size={32} />}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="teach-title">
              {title}
            </span>
            <span className="m-s">{sub}</span>
          </span>
          <button className="ibtn" type="button" aria-label={w.cancel} onClick={onClose}>
            {Icon.x}
          </button>
        </div>
        {target.kind === "pick" && edit === undefined && (
          <div className="m-sec" role="radiogroup" aria-label={w.who}>
            <span className="k">{w.who}</span>
            {target.people.map((p, i) => (
              <button
                key={p.id}
                ref={i === 0 ? firstPick : undefined}
                className="pick"
                type="button"
                role="radio"
                aria-checked={picked?.id === p.id}
                onClick={() => setPicked(p)}
              >
                <span className="radio" />
                <span className="pick-t">{p.name}</span>
                <span className="pick-m">{p.role}</span>
                <span className="pick-m">{w.inArea(inArea(p))}</span>
              </button>
            ))}
          </div>
        )}
        <div className="m-sec">
          {!company && (
            <>
              <span className="k">{w.area}</span>
              <div className="opts" role="radiogroup" aria-label={w.area}>
                {areas.map((a) => (
                  <button key={a.id} className="opt" type="button" role="radio" aria-checked={a.id === areaId} onClick={() => setAreaId(a.id)}>
                    {areaName(a, t.areas)}
                  </button>
                ))}
              </div>
            </>
          )}
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
        {/* what teaching this does, once it is clear who it goes to */}
        {(company || picked !== undefined) && (
          <div className="m-sec" data-effect="">
            {gains && (
              <span className="gain">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8.4l3.2 3.2L13 4.8" />
                </svg>
                {w.gainArea(picked.name, areaName(chosen, t.areas))}
              </span>
            )}
            {picked?.status === "onLeave" && <span className="hint">{w.onLeave}</span>}
            <span className="hint">{w.carried(before, before + len)}</span>
          </div>
        )}
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button
            className="btn btn-primary btn-md"
            type="button"
            disabled={len === 0 || pending || (!company && (areaId === undefined || picked === undefined))}
            onClick={save}
          >
            {edit === undefined ? w.teach : w.save}
          </button>
        </div>
      </div>
    </div>
  );
}
