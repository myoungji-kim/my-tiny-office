"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { assignAction, createForAction } from "../app/people-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { Icon } from "./icons";
import { MemoryCard } from "./memory-card";
import { areaName } from "./names";
import { Sprite } from "./sprite";
import { TeachDialog } from "./teach-dialog";

const PRIORITIES = ["low", "normal", "high"] as const;

// Work for one person: something already waiting, or a task made for them here.
export function AssignDialog({
  locale,
  companyId,
  person,
  roleLine,
  memories,
  areas,
  backlog,
  projects,
  onClose,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: EmployeeView;
  readonly roleLine: string;
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly backlog: readonly TaskView[];
  readonly projects: readonly ProjectView[];
  readonly onClose: () => void;
}) {
  const t = getDictionary(locale);
  const w = t.people;
  const [picked, setPicked] = useState<string>(backlog[0]?.id ?? "new");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draftArea, setDraftArea] = useState(areas[0]?.id);
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("normal");
  const [teaching, setTeaching] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const cancel = useRef<HTMLButtonElement>(null);
  const stopTeaching = useCallback(() => setTeaching(false), []);

  useEffect(() => {
    if (teaching) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, teaching]);

  useEffect(() => cancel.current?.focus({ preventScroll: true }), []);

  const task = backlog.find((x) => x.id === picked);
  const areaId = task === undefined ? draftArea : task.area;
  const area = areas.find((a) => a.id === areaId);
  // The point of teaching shows up here: what this person brings to this task.
  const useful = memories.filter((m) => m.kind === "expertise" && m.areaId !== undefined && m.areaId === areaId);
  const ready = !pending && (task !== undefined || (title.trim() !== "" && projectId !== ""));

  const submit = () =>
    start(async () => {
      const result =
        task !== undefined
          ? await assignAction(companyId, task.id, person.id)
          : await createForAction(companyId, person.id, { projectId, title, description, areaId: draftArea, priority });
      if (result.error !== undefined) {
        setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        return;
      }
      onClose();
    });

  if (teaching) {
    return (
      <TeachDialog
        locale={locale}
        companyId={companyId}
        target={{ kind: "person", person }}
        memories={memories}
        areas={areas}
        area={areaId}
        source={task === undefined ? undefined : { taskId: task.id, title: task.title }}
        onClose={stopTeaching}
      />
    );
  }

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="assign-title">
        <div className="m-hd">
          <span className="m-av">
            <Sprite species={person.species} size={44} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="assign-title">
              {w.assignTitle(person.name)}
            </span>
            <span className="m-s">{roleLine}</span>
          </span>
        </div>

        <div className="m-sec" role="radiogroup" aria-label={w.backlog}>
          <span className="k">{w.backlog}</span>
          {backlog.map((x) => {
            const a = areas.find((candidate) => candidate.id === x.area);
            return (
              <button key={x.id} className="pick" type="button" role="radio" aria-checked={x.id === picked} onClick={() => setPicked(x.id)}>
                <span className="radio" />
                <span className="pick-t">{x.title}</span>
                {a === undefined ? <span /> : <span className="area-chip">{areaName(a, t.areas)}</span>}
              </button>
            );
          })}
          <button className="pick pick-new" type="button" role="radio" aria-checked={picked === "new"} onClick={() => setPicked("new")}>
            <span className="radio" />
            <span className="pick-t">{w.newTask}</span>
            <span />
          </button>
        </div>

        {task === undefined && (
          <div className="m-sec">
            <span className="k">{w.newTask}</span>
            {projects.length === 0 ? (
              <p className="hint">{w.noProject}</p>
            ) : (
              <>
                <div className="field" style={{ marginTop: 0 }}>
                  <label className="label" htmlFor="na-project">
                    {w.fProject}
                  </label>
                  <span className="select-wrap">
                    <select className="select" id="na-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
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
                  <label className="label" htmlFor="na-title">
                    {w.fTitle} <span className="req">*</span>
                  </label>
                  <input className="input" id="na-title" autoComplete="off" placeholder={w.fTitlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="na-desc">
                    {w.fDesc}
                  </label>
                  <textarea className="textarea" id="na-desc" placeholder={w.fDescPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid2" style={{ gap: 14 }}>
                  <div className="field">
                    <label className="label" htmlFor="na-area">
                      {w.fArea}
                    </label>
                    <span className="select-wrap">
                      <select className="select" id="na-area" value={draftArea} onChange={(e) => setDraftArea(e.target.value)}>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {areaName(a, t.areas)}
                          </option>
                        ))}
                      </select>
                      {Icon.chevron}
                    </span>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="na-prio">
                      {w.fPriority}
                    </label>
                    <span className="select-wrap">
                      <select className="select" id="na-prio" value={priority} onChange={(e) => setPriority(PRIORITIES.find((p) => p === e.target.value) ?? "normal")}>
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
              </>
            )}
          </div>
        )}

        {area !== undefined && (
          <div className="m-sec">
            <span className="k">
              {w.broughtAlong} <span className="kn">{useful.length}</span>
            </span>
            <p className="hint" style={{ margin: "-2px 0 10px" }}>
              {w.broughtWhy}
            </p>
            {useful.length > 0 ? (
              useful.map((m) => <MemoryCard key={m.id} memory={m} words={w} />)
            ) : (
              <div className="notice notice-warn">
                <span className="n-ic">{Icon.alert}</span>
                <span className="n-tx">
                  <b>{w.noAreaMemory(areaName(area, t.areas))}</b>
                  <span>{w.noAreaMemoryWhy(person.name)}</span>
                </span>
                <span className="n-acts">
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => setTeaching(true)}>
                    {w.tellNow}
                  </button>
                </span>
              </div>
            )}
          </div>
        )}

        {error !== undefined && (
          <div className="m-sec">
            <p className="hint" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        <div className="m-foot">
          <button ref={cancel} className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {w.cancel}
          </button>
          <button className="btn btn-primary btn-md" type="button" disabled={!ready} onClick={submit}>
            {task !== undefined ? w.assignThis : w.createAndAssign}
          </button>
        </div>
      </div>
    </div>
  );
}
