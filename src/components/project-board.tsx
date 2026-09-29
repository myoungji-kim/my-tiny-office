"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState, useTransition } from "react";

import { resumeTaskAction } from "../app/project-actions";
import type { TaskStatus } from "../domain/task";
import { getDictionary, type Dictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { Icon } from "./icons";
import { areaName } from "./names";
import { Prio } from "./project-marks";
import { Sprite } from "./sprite";
import { TaskDialog } from "./task-dialog";
import { blockerText, timeLine } from "./task-lines";
import { TeachDialog } from "./teach-dialog";
import { useDismiss } from "./use-dismiss";

// A column is a status a task rests in, ordered the way work moves.
const COLUMNS: readonly { readonly status: TaskStatus; readonly color: string }[] = [
  { status: "backlog", color: "var(--faint)" },
  { status: "working", color: "var(--warn)" },
  { status: "approval", color: "var(--brand)" },
  { status: "done", color: "var(--ok)" },
  { status: "held", color: "var(--line-2)" },
];

const CLOCK = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="8" r="5.6" />
    <path d="M8 5v3.2l2 1.3" />
  </svg>
);

const NONE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="8" cy="8" r="5.6" />
    <path d="M5.6 8h4.8" />
  </svg>
);

function Card({
  task,
  who,
  area,
  open,
  t,
  onPick,
}: {
  readonly task: TaskView;
  readonly who: EmployeeView | undefined;
  readonly area: AreaView | undefined;
  readonly open: boolean;
  readonly t: Dictionary;
  readonly onPick: (task: TaskView, el: HTMLElement, viaKey: boolean) => void;
}) {
  const w = t.projects;
  const blocked = blockerText(task, w);
  const time = timeLine(task, w);
  const cls = ["work", blocked !== undefined && "is-blocked", task.status === "done" && "is-done", task.status === "held" && "is-held"].filter(Boolean).join(" ");
  return (
    <button className={cls} type="button" data-id={task.id} aria-expanded={open} onClick={(e) => onPick(task, e.currentTarget, e.detail === 0)}>
      {area !== undefined && <span className="area-chip">{areaName(area, t.areas)}</span>}
      <span className="w-title">{task.title}</span>
      {blocked !== undefined && (
        <>
          <span className="w-block">
            {NONE}
            {w.blocked}
          </span>
          <span className="r-line blocked" title={task.blocker?.kind === "commandNotAllowed" ? task.blocker.command : task.blocker?.kind === "writeNotAllowed" ? task.blocker.target : undefined}>
            {NONE}
            <span className="r-tx">{blocked}</span>
          </span>
        </>
      )}
      <span className="w-foot">
        {who === undefined ? (
          <span>{w.unassigned}</span>
        ) : (
          <span className="w-who">
            <span className="w-av">
              <Sprite species={who.species} size={20} />
            </span>
            <span>{who.name}</span>
          </span>
        )}
        {time === undefined ? (
          <Prio priority={task.priority} label={t.priority[task.priority]} />
        ) : (
          <span className="w-time">
            {CLOCK}
            {time}
          </span>
        )}
      </span>
    </button>
  );
}

const GAP = 8;
const EDGE = 12;

function place(pop: HTMLElement, anchor: HTMLElement) {
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  let left = r.right + GAP;
  if (left + w > innerWidth - EDGE) left = r.left - w - GAP;
  if (left < EDGE) left = Math.min(Math.max(EDGE, r.left), innerWidth - w - EDGE);
  pop.style.left = Math.round(left) + "px";
  pop.style.top = Math.round(Math.max(EDGE, Math.min(r.top, innerHeight - h - EDGE))) + "px";
}

type Dialog = { readonly kind: "new" } | { readonly kind: "edit"; readonly task: TaskView; readonly assignee: boolean } | { readonly kind: "teach"; readonly task: TaskView };

export function ProjectBoard({
  locale,
  companyId,
  project,
  projects,
  tasks,
  employees,
  areas,
  memories,
  ready,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly project: ProjectView;
  // the projects that take work, which a task can move between
  readonly projects: readonly ProjectView[];
  readonly tasks: readonly TaskView[];
  readonly employees: readonly EmployeeView[];
  readonly areas: readonly AreaView[];
  readonly memories: readonly MemoryView[];
  readonly ready: boolean;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  const [dialog, setDialog] = useState<Dialog | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [, start] = useTransition();
  const pop = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const focusFirst = useRef(false);
  const close = useCallback(() => {
    setOpenId(undefined);
    anchor.current = null;
  }, []);
  const closeDialog = useCallback(() => setDialog(undefined), []);
  useDismiss(openId !== undefined, pop, anchor, close);

  const pick = (task: TaskView, el: HTMLElement, viaKey: boolean) => {
    if (openId === task.id && anchor.current === el) return close();
    anchor.current = el;
    focusFirst.current = viaKey;
    setError(undefined);
    setOpenId(task.id);
  };

  useLayoutEffect(() => {
    const p = pop.current;
    if (openId === undefined || p === null || anchor.current === null) return;
    place(p, anchor.current);
    if (focusFirst.current) p.querySelector<HTMLElement>(".mrow")?.focus({ preventScroll: true });
    const follow = () => anchor.current !== null && place(p, anchor.current);
    addEventListener("resize", follow);
    addEventListener("scroll", follow, true);
    return () => {
      removeEventListener("resize", follow);
      removeEventListener("scroll", follow, true);
    };
  }, [openId]);

  const mine = tasks.filter((x) => x.projectId === project.id);
  const live = project.status === "active";
  const writable = project.takesWork;
  const task = mine.find((x) => x.id === openId);
  const whoOf = (x: TaskView) => employees.find((e) => e.id === x.assigneeId);
  const areaOf = (x: TaskView) => areas.find((a) => a.id === x.area);
  // a task edited in place keeps its own project among the choices
  const choices = projects.some((p) => p.id === project.id) ? projects : [project, ...projects];

  // What the popover offers follows from where the task is; `off` rows wait for Claude Code.
  type Act = { readonly label: string; readonly key?: boolean; readonly off?: boolean; readonly then: Dialog | "resume" };
  const acts: Act[] = [];
  if (task !== undefined) {
    if (task.status === "backlog" && live) acts.push({ label: w.actions.assign, off: !ready, then: { kind: "edit", task, assignee: true } });
    if (task.status === "held" && live) acts.push({ label: w.actions.resume, key: true, off: !ready, then: "resume" });
    if (task.status === "held" && task.assigneeId !== undefined) acts.push({ label: w.actions.teach, then: { kind: "teach", task } });
    // Finished work is the record of what happened, so it is not rewritten.
    if ((task.status === "backlog" || task.status === "held") && writable) acts.push({ label: w.actions.edit, then: { kind: "edit", task, assignee: false } });
  }
  const gated = acts.some((a) => a.off === true);

  const run = (act: Act) => {
    if (act.then !== "resume") {
      close();
      return setDialog(act.then);
    }
    if (task === undefined) return;
    start(async () => {
      const result = await resumeTaskAction(companyId, task.id);
      if (result.error !== undefined) setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      else close();
    });
  };

  const teachTo = dialog?.kind === "teach" ? whoOf(dialog.task) : undefined;

  return (
    <>
      <div className="board">
        {COLUMNS.map(({ status, color }) => {
          const list = mine.filter((x) => x.status === status);
          return (
            <section key={status} className="col">
              <div className="col-hd">
                <span className="col-dot" style={{ background: color }} />
                <h2>{w.columns[status]}</h2>
                <span className="col-n">{list.length}</span>
                <span className="col-line" />
              </div>
              {list.map((x) => (
                <Card key={x.id} task={x} who={whoOf(x)} area={areaOf(x)} open={openId === x.id} t={t} onPick={pick} />
              ))}
              {list.length === 0 && <p className="col-empty">{w.empty}</p>}
              {status === "backlog" && writable && (
                <button className="col-add" type="button" onClick={() => setDialog({ kind: "new" })}>
                  {Icon.plus}
                  <span>{w.addTask}</span>
                </button>
              )}
            </section>
          );
        })}
      </div>

      <div ref={pop} className="pop" role="dialog" aria-label={task?.title} data-open={task === undefined ? undefined : ""}>
        {task !== undefined && (
          <>
            <div className="p-hd">
              <span className="p-av">{whoOf(task) === undefined ? "—" : <Sprite species={whoOf(task)?.species ?? ""} size={38} />}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="p-name">{task.title}</span>
                <span className="p-role">
                  {[areaOf(task) === undefined ? undefined : areaName(areaOf(task)!, t.areas), t.priority[task.priority]].filter(Boolean).join(" · ")}
                </span>
              </span>
            </div>
            <span className="p-rule" />
            {task.status === "held" && task.heldReason !== undefined && (
              <span className="p-said">
                <b>{w.heldBecause}</b>
                {task.heldReason}
              </span>
            )}
            <div className="p-acts">
              <Link className="mrow" href={`/projects/${project.id}/${task.id}`} onClick={close}>
                {w.actions.detail}
              </Link>
              {gated && <p className="p-why">{t.claude.cannotStart}</p>}
              {acts.map((act) => (
                <button key={act.label} className={act.key === true ? "mrow mrow-key" : "mrow"} type="button" disabled={act.off} onClick={() => run(act)}>
                  {act.label}
                </button>
              ))}
              {error !== undefined && (
                <p className="p-why" role="alert">
                  {error}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {dialog?.kind === "new" && (
        <TaskDialog
          locale={locale}
          companyId={companyId}
          projects={projects}
          projectId={project.id}
          areas={areas}
          employees={employees}
          memories={memories}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === "edit" && (
        <TaskDialog
          locale={locale}
          companyId={companyId}
          projects={choices}
          projectId={project.id}
          areas={areas}
          employees={employees}
          memories={memories}
          edit={dialog.task}
          focusAssignee={dialog.assignee}
          onClose={closeDialog}
        />
      )}
      {dialog?.kind === "teach" && teachTo !== undefined && (
        <TeachDialog
          locale={locale}
          companyId={companyId}
          target={{ kind: "person", person: teachTo }}
          memories={memories.filter((m) => m.employeeId === teachTo.id)}
          areas={areas}
          area={dialog.task.area}
          source={{ taskId: dialog.task.id, title: dialog.task.title }}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
