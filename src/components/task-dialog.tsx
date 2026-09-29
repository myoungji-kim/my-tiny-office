"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { editTaskAction, newTaskAction } from "../app/project-actions";
import type { Priority } from "../domain/project";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { Icon } from "./icons";
import { areaName } from "./names";

const PRIORITIES = ["low", "normal", "high"] as const;

// The one choice worth making carefully is the area, because it decides who
// can review the work later, so the dialog answers that while it is made.
export function TaskDialog({
  locale,
  companyId,
  projects,
  projectId,
  areas,
  employees,
  memories,
  edit,
  focusAssignee = false,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  // the projects that take work
  readonly projects: readonly ProjectView[];
  readonly projectId: string;
  readonly areas: readonly AreaView[];
  readonly employees: readonly EmployeeView[];
  readonly memories: readonly MemoryView[];
  readonly edit?: TaskView;
  readonly focusAssignee?: boolean;
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const [into, setInto] = useState(edit?.projectId ?? projectId);
  const [title, setTitle] = useState(edit?.title ?? "");
  const [description, setDescription] = useState(edit?.description ?? "");
  const [area, setArea] = useState(edit === undefined ? areas[0]?.id : edit.area);
  const [priority, setPriority] = useState<Priority>(edit?.priority ?? "normal");
  const [who, setWho] = useState(edit?.assigneeId ?? "");
  const [reviewer, setReviewer] = useState(edit?.reviewerId ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const titleField = useRef<HTMLInputElement>(null);
  const whoField = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    (focusAssignee ? whoField : titleField).current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, focusAssignee]);

  const chosen = areas.find((a) => a.id === area);
  const knowing = employees.filter((e) => memories.some((m) => m.kind === "expertise" && m.employeeId === e.id && m.areaId === area));
  const knowers = knowing.map((e) => e.name);
  // only someone taught the area reviews it, and never whoever does the work
  const reviewers = knowing.filter((e) => e.id !== who);
  const reviewing = reviewers.find((e) => e.id === reviewer);
  const picked = employees.find((e) => e.id === who);
  const target = projects.find((p) => p.id === into);

  // What naming this person means for where the work goes next.
  const whatHappens =
    edit?.status === "held"
      ? picked === undefined
        ? w.whenResumedAnyone
        : w.whenResumed(picked.name)
      : target?.status === "planned"
        ? picked === undefined
          ? w.whenStartedAnyone
          : w.whenStarted(picked.name)
        : picked === undefined
          ? w.whoTakes
          : w.queuesFor(picked.name);

  const save = () =>
    start(async () => {
      const input = { projectId: into, title, description, areaId: area, priority, assigneeId: who || undefined, reviewerId: reviewing?.id };
      const result = edit === undefined ? await newTaskAction(companyId, input) : await editTaskAction(companyId, edit.id, input);
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      onClose();
    });

  const heading = edit === undefined ? w.newTaskTitle : w.editTaskTitle;

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t">{heading}</span>
          </span>
        </div>

        <div className="m-sec">
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="nt-project">
              {w.fProject}
            </label>
            <span className="select-wrap">
              <select className="select" id="nt-project" value={into} onChange={(e) => setInto(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {Icon.chevron}
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="nt-title">
              {w.fTitle} <span className="req">*</span>
            </label>
            <input ref={titleField} className="input" id="nt-title" placeholder={w.fTitlePlaceholder} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="nt-desc">
              {w.fDesc}
            </label>
            <textarea className="textarea" id="nt-desc" placeholder={w.fDescPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="m-sec">
          <div className="grid2" style={{ gap: 14 }}>
            <div className="field" style={{ marginTop: 0 }}>
              <label className="label" htmlFor="nt-area">
                {w.fArea}
              </label>
              <span className="select-wrap">
                <select className="select" id="nt-area" value={area ?? ""} onChange={(e) => setArea(e.target.value || undefined)}>
                  <option value="">{w.noArea}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {areaName(a, t.areas)}
                    </option>
                  ))}
                </select>
                {Icon.chevron}
              </span>
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label className="label" htmlFor="nt-prio">
                {w.fPriority}
              </label>
              <span className="select-wrap">
                <select className="select" id="nt-prio" value={priority} onChange={(e) => setPriority(PRIORITIES.find((p) => p === e.target.value) ?? "normal")}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {t.priority[p]}
                    </option>
                  ))}
                </select>
                {Icon.chevron}
              </span>
            </div>
          </div>
          {chosen !== undefined &&
            (knowers.length > 0 ? (
              <span className="hint">
                {w.areaHint} {w.canReview(knowers)}
              </span>
            ) : (
              <div className="notice notice-warn" style={{ marginTop: 12 }}>
                <span className="n-ic">{Icon.alert}</span>
                <span className="n-tx">
                  <span>{w.canReviewNobody(areaName(chosen, t.areas))}</span>
                </span>
              </div>
            ))}
        </div>

        <div className="m-sec">
          <div className="field" style={{ marginTop: 0 }}>
            <label className="label" htmlFor="nt-who">
              {w.fAssignee}
            </label>
            <span className="select-wrap">
              <select ref={whoField} className="select" id="nt-who" value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">{w.anyoneFree}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id} disabled={e.status === "onLeave"}>
                    {e.status === "onLeave" ? w.onLeaveOption(e.name) : e.name}
                  </option>
                ))}
              </select>
              {Icon.chevron}
            </span>
            <span className="hint">{whatHappens}</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="nt-reviewer">
              {w.fReviewer}
            </label>
            <span className="select-wrap">
              <select className="select" id="nt-reviewer" value={reviewing?.id ?? ""} disabled={chosen === undefined || reviewers.length === 0} onChange={(e) => setReviewer(e.target.value)}>
                <option value="">{w.noReviewer}</option>
                {reviewers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {Icon.chevron}
            </span>
            <span className="hint">{chosen === undefined ? w.reviewerNeedsArea : reviewing === undefined ? w.reviewerNone : w.reviewerWhen(reviewing.name)}</span>
          </div>
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={pending || title.trim() === "" || target === undefined} onClick={save}>
            {edit === undefined ? w.create : w.save}
          </button>
        </div>
      </div>
    </div>
  );
}
