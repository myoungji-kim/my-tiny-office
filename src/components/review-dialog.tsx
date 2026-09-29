"use client";

import { useEffect, useState, useTransition } from "react";

import { requestReviewAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, TaskView } from "../server/view-model";

import { Icon } from "./icons";
import { areaName } from "./names";

// Who can review is decided by what they were taught: a colleague who knows
// the task's area, never whoever did it, nobody on leave.
export function ReviewDialog({
  locale,
  companyId,
  task,
  employees,
  memories,
  areas,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly task: TaskView;
  readonly employees: readonly EmployeeView[];
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const area = areas.find((a) => a.id === task.area);
  const candidates = employees.filter(
    (e) => e.id !== task.assigneeId && e.status !== "onLeave" && memories.some((m) => m.kind === "expertise" && m.employeeId === e.id && m.areaId === task.area),
  );
  const [picked, setPicked] = useState(candidates[0]?.id);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ask = () =>
    start(async () => {
      if (picked === undefined) return;
      const result = await requestReviewAction(companyId, task.id, picked);
      if (result.error !== undefined) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      onClose();
    });

  const why = area === undefined ? w.askReviewNoArea : candidates.length === 0 ? w.askReviewNobody(areaName(area, t.areas)) : w.askReviewWhy;

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="review-title">
              {w.askReviewTitle}
            </span>
            <span className="m-s">{why}</span>
          </span>
          <button className="ibtn" type="button" aria-label={w.cancel} onClick={onClose}>
            {Icon.x}
          </button>
        </div>
        {candidates.length > 0 && (
          <div className="m-sec">
            <div className="opts" role="radiogroup" aria-label={w.askReviewTitle}>
              {candidates.map((e) => (
                <button key={e.id} className="opt" type="button" role="radio" aria-checked={e.id === picked} onClick={() => setPicked(e.id)}>
                  {e.status === "available" ? e.name : w.askReviewBusy(e.name)}
                </button>
              ))}
            </div>
            {error !== undefined && (
              <p className="hint" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={pending || picked === undefined} onClick={ask}>
            {w.askReviewYes}
          </button>
        </div>
      </div>
    </div>
  );
}
