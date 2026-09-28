import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { isReady } from "../../../../application/runtime-status";
import { ActButton } from "../../../../components/act-button";
import { dateText } from "../../../../components/dates";
import { Icon } from "../../../../components/icons";
import { areaName } from "../../../../components/names";
import { blockerText, timeLine, withCode } from "../../../../components/task-lines";
import { Prio } from "../../../../components/project-marks";
import { Shell } from "../../../../components/shell";
import { CopyButton } from "../../../../components/settings-parts";
import { TaskActions } from "../../../../components/task-actions";
import { TaskChanges } from "../../../../components/task-changes";
import { loadTaskWork } from "../../../../server/task-work";
import { isAllowableCommand } from "../../../../domain/project";
import type { TaskStatus } from "../../../../domain/task";
import { getDictionary } from "../../../../i18n";
import { allowCommandAction, carryOnAction } from "../../../project-actions";
import { companyScreen, param, type SearchParams } from "../../../screen-data";

export const dynamic = "force-dynamic";

const timeText = (locale: string, at: number) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

const PLUG = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2v3.6M10 2v3.6M4.4 5.6h7.2v2.6a3.6 3.6 0 0 1-7.2 0z" />
    <path d="M8 11.8V14" />
  </svg>
);

const STEP_ICON: Readonly<Record<"read" | "edit" | "run", ReactNode>> = {
  read: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1.6 8s2.4-4 6.4-4 6.4 4 6.4 4-2.4 4-6.4 4-6.4-4-6.4-4z" />
      <circle cx="8" cy="8" r="1.7" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M10.6 2.8l2.6 2.6L6 12.6H3.4V10z" />
    </svg>
  ),
  run: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3.5 3.5L3 11.5M8.5 12h4.5" />
    </svg>
  ),
};

const CHIP: Readonly<Record<TaskStatus, string>> = { backlog: "planned", working: "working", approval: "reviewing", done: "available", held: "leave" };

const RUN = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 4.5l3.5 3.5L3 11.5M8.5 12h4.5" />
  </svg>
);

const panel = (title: string, body: ReactNode) => (
  <div className="panel">
    <div className="panel-hd">
      <h2>{title}</h2>
    </div>
    <div className="panel-bd">{body}</div>
  </div>
);

export default async function TaskPage({ params, searchParams }: { params: Promise<{ id: string; taskId: string }>; searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.projects;
  const { id, taskId } = await params;
  const project = office.projects.find((p) => p.id === id);
  const task = office.tasks.find((x) => x.id === taskId && x.projectId === id);
  if (project === undefined || task === undefined) notFound();

  const ready = isReady(status);
  const who = office.employees.find((e) => e.id === task.assigneeId);
  const area = office.areas.find((a) => a.id === task.area);
  const time = timeLine(task, w);
  const carried = who === undefined ? [] : office.memories.filter((m) => m.employeeId === who.id);
  const blocker = task.status === "working" ? task.blocker : undefined;
  const running = task.status === "working" && blocker === undefined;
  const allowable = blocker?.kind === "commandNotAllowed" && isAllowableCommand(blocker.command);
  const work = await loadTaskWork(company.id, task.id);
  const actions = (work?.steps ?? []).flatMap((s) => (s.kind === "say" ? [] : [{ ...s, kind: s.kind }]));
  const said = work?.steps.find((s) => s.kind === "say");

  const steps =
    actions.length === 0 && said === undefined ? undefined : (
      <Fragment key="steps">
        {panel(
          running ? w.tk.now : w.tk.did,
          <>
            {actions.map((s, i) => (
              <div key={i} className={i === 0 && running ? "step latest" : "step"}>
                <span className="step-at">{timeText(locale, s.at)}</span>
                <span className="step-ic">{STEP_ICON[s.kind]}</span>
                <span className="step-tx">
                  {w.tk.steps[s.kind]} <code>{s.detail}</code>
                </span>
              </div>
            ))}
            {said !== undefined && who !== undefined && (
              <span className="said">
                <b>{w.tk.said(who.name)}</b>
                <span style={{ whiteSpace: "pre-wrap" }}>{said.detail}</span>
              </span>
            )}
          </>,
        )}
      </Fragment>
    );
  const changes =
    task.status === "backlog" || work === undefined ? undefined : (
      <Fragment key="changes">
        {panel(
          w.tk.changed,
          <>
            {work.changes.length > 0 ? (
              <TaskChanges companyId={company.id} taskId={task.id} changes={work.changes} />
            ) : task.status === "done" ? undefined : (
              <p className="col-empty" style={{ margin: 0 }}>
                {w.tk.noChanges}
              </p>
            )}
            {task.status === "approval" && <span className="tk-apply">{withCode(w.tk.applyWhat, work.branch)}</span>}
            {task.status === "done" && <span className="tk-apply">{withCode(w.tk.applied, work.branch)}</span>}
          </>,
        )}
      </Fragment>
    );
  const main = (task.status === "approval" || task.status === "done" ? [changes, steps] : [steps, changes]).filter((x) => x !== undefined);

  const about = task.description ?? (task.status === "backlog" ? w.tk.notStarted : undefined);
  const side: ReactNode[] = [
    about === undefined ? undefined : <Fragment key="desc">{panel(w.tk.desc, <span style={{ fontSize: 15 }}>{about}</span>)}</Fragment>,
    task.status === "held" && task.heldReason !== undefined ? (
      <Fragment key="held">{panel(w.heldBecause, <span style={{ fontSize: 15 }}>{task.heldReason}</span>)}</Fragment>
    ) : undefined,
  ].filter((x) => x !== undefined);

  const sub: ReactNode[] = [
    area === undefined ? undefined : (
      <span key="area" className="area-chip">
        {areaName(area, t.areas)}
      </span>
    ),
    <Prio key="prio" priority={task.priority} label={t.priority[task.priority]} />,
    who?.name ?? w.unassigned,
    time,
  ].filter((x) => x !== undefined);

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={office.employees}
      screen="projects"
      head={
        <div className="head">
          <Link className="crumb" href={`/projects/${project.id}`}>
            {Icon.back}
            <span>{project.name}</span>
          </Link>
          <div className="head-row">
            <span style={{ minWidth: 0 }}>
              <span className="proj-title">
                <h1>{task.title}</h1>
                <span className={`chip ${CHIP[task.status]}`}>{w.columns[task.status]}</span>
              </span>
              <span className="sub">
                {sub.map((part, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {part}
                  </span>
                ))}
              </span>
            </span>
            <div className="head-right">
              <TaskActions
                locale={locale}
                companyId={company.id}
                project={project}
                projects={office.projects.filter((p) => p.takesWork)}
                task={task}
                employees={office.employees}
                areas={office.areas}
                memories={office.memories}
                ready={ready}
                assignFirst={(await param(searchParams, "do")) === "assign"}
              />
            </div>
          </div>
        </div>
      }
    >
      {blocker !== undefined && (
        <div className="notice notice-bad">
          <span className="n-ic">{blocker.kind === "commandNotAllowed" ? RUN : PLUG}</span>
          <span className="n-tx">
            <b>{blocker.kind === "commandNotAllowed" ? withCode(w.runStopped, blocker.command) : blockerText(task, w)}</b>
            {blocker.kind === "commandNotAllowed" ? (
              who !== undefined && <span>{allowable ? w.runWhy(who.name) : w.runNotAllowable(who.name)}</span>
            ) : (
              <span>{blocker.kind === "disconnected" ? w.lostWhy : blocker.kind === "budgetReached" ? w.budgetWhy : w.workspaceWhy}</span>
            )}
          </span>
          <span className="n-acts">
            {blocker.kind === "commandNotAllowed" ? (
              <>
                <ActButton action={carryOnAction.bind(null, company.id, task.id)} label={w.withoutRun} disabled={!ready} errors={t.errors} />
                {allowable && (
                  <ActButton action={allowCommandAction.bind(null, company.id, project.id, blocker.command)} label={w.allowRun} disabled={!ready} errors={t.errors} />
                )}
              </>
            ) : (
              <ActButton
                action={carryOnAction.bind(null, company.id, task.id)}
                label={blocker.kind === "disconnected" ? w.reconnect : blocker.kind === "budgetReached" ? w.carryOn : w.retry}
                disabled={!ready}
                errors={t.errors}
              />
            )}
          </span>
        </div>
      )}
      <div className="tk-grid" style={{ ...(main.length === 0 ? { gridTemplateColumns: "minmax(0, 1fr)" } : {}), ...(blocker !== undefined ? { marginTop: 16 } : {}) }}>
        {main.length > 0 && <div className="tk-col">{main}</div>}
        <div className="tk-col">
          {side}
          {panel(
            who === undefined ? w.tk.memAhead : w.tk.mem(carried.length),
            who === undefined ? (
              <p className="col-empty" style={{ margin: 0 }}>
                {w.tk.memNobody}
              </p>
            ) : carried.length === 0 ? (
              <p className="col-empty" style={{ margin: 0 }}>
                {t.people.noMemory}
              </p>
            ) : (
              carried.map((m) => (
                <div key={m.id} className="tk-mem">
                  <svg viewBox="0 0 16 16" />
                  <span>{m.text}</span>
                </div>
              ))
            ),
          )}
          {panel(
            w.tk.record,
            <>
              <div className="kv">
                <span>{w.tk.created}</span>
                <b style={{ fontWeight: 500 }}>{dateText(locale, task.createdAt)}</b>
              </div>
              <div className="kv">
                <span>{w.tk.assignee}</span>
                <b style={{ fontWeight: 500 }}>{who?.name ?? w.unassigned}</b>
              </div>
            </>,
          )}
          {work?.sessionId !== undefined &&
            panel(
              w.tk.session,
              <>
                {work.worktree !== undefined && (
                  <div className="kv">
                    <span>{w.tk.folder}</span>
                    <b className="mono">{work.worktree}</b>
                  </div>
                )}
                <div className="kv">
                  <span>{w.tk.branch}</span>
                  <b className="mono">{work.branch}</b>
                </div>
                <span className="hint">{w.tk.resumeHint}</span>
                <div className="cmd">
                  <pre>
                    <span className="p">$</span> claude --resume {work.sessionId}
                  </pre>
                  <CopyButton text={"claude --resume " + work.sessionId} copy={t.claude.copy} copied={t.claude.copied} />
                </div>
              </>,
            )}
        </div>
      </div>
    </Shell>
  );
}
