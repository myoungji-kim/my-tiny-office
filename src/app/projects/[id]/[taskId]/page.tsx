import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isReady } from "../../../../application/runtime-status";
import { ActButton } from "../../../../components/act-button";
import { dateText } from "../../../../components/dates";
import { Icon } from "../../../../components/icons";
import { areaName } from "../../../../components/names";
import { blockerText, timeLine, withCode } from "../../../../components/task-lines";
import { Prio } from "../../../../components/project-marks";
import { Shell } from "../../../../components/shell";
import { CopyButton } from "../../../../components/settings-parts";
import { Suggestions } from "../../../../components/suggestions";
import { TaskActions } from "../../../../components/task-actions";
import { TaskChanges } from "../../../../components/task-changes";
import { TaskView, type TalkView } from "../../../../components/task-view";
import { loadTaskWork, type TalkMessage } from "../../../../server/task-work";
import { carriedBy } from "../../../../domain/memory";
import { isAllowableCommand } from "../../../../domain/project";
import type { TaskStatus } from "../../../../domain/task";
import { getDictionary } from "../../../../i18n";
import { allowCommandAction, carryOnAction } from "../../../project-actions";
import { companyScreen, param, type SearchParams } from "../../../screen-data";

export const dynamic = "force-dynamic";

const timeText = (locale: string, at: number) => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
const whenText = (locale: string, at: number) =>
  new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

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

const panel = (title: string, body: ReactNode, className = "panel") => (
  <div className={className}>
    <div className="panel-hd">
      <h2>{title}</h2>
    </div>
    <div className="panel-bd">{body}</div>
  </div>
);

const fold = (title: string, body: ReactNode) => (
  <details className="panel fold">
    <summary className="panel-hd">
      <h2>{title}</h2>
      <span className="fold-ic">{Icon.chevron}</span>
    </summary>
    <div className="panel-bd">{body}</div>
  </details>
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
  // what the company follows is carried too, and in the order the task's prompt numbers it
  const carried = who === undefined ? [] : carriedBy(who.id, office.memories);
  const blocker = task.status === "working" ? task.blocker : undefined;
  const running = task.status === "working" && blocker === undefined;
  const allowable = blocker?.kind === "commandNotAllowed" && isAllowableCommand(blocker.command);
  const work = await loadTaskWork(company.id, task.id);
  const person = (id: string | undefined) => office.employees.find((e) => e.id === id);
  const review = work?.review;
  const reviewer = person(review?.reviewerId);
  const actions = work?.steps ?? [];

  const stepRow = (s: (typeof actions)[number], key: number) => (
    <div key={key} className="step">
      <span className="step-at">{timeText(locale, s.at)}</span>
      <span className="step-ic">{STEP_ICON[s.kind]}</span>
      <span className="step-tx">
        {w.tk.steps[s.kind]} <code>{s.detail}</code>
      </span>
    </div>
  );

  const view = (m: TalkMessage): TalkView | undefined => {
    const at = whenText(locale, m.at);
    if (m.kind === "request") return { id: m.id, name: w.tk.you, species: undefined, label: w.tk.talkRequest, tone: "changes", at, text: m.text, suggestions: undefined };
    const by = person(m.by);
    if (by === undefined) return undefined;
    if (m.kind === "review") {
      const approve = m.verdict === "approve";
      const label = w.tk.talkReview + " · " + (approve ? w.tk.talkApprove : w.tk.talkChanges);
      return { id: m.id, name: by.name, species: by.species, label, tone: approve ? "approve" : "changes", at, text: m.text, suggestions: undefined };
    }
    return {
      id: m.id,
      name: by.name,
      species: by.species,
      label: m.when === "live" ? w.tk.talkNow : m.when === "stopped" ? w.tk.talkBefore : w.tk.talkReport,
      tone: undefined,
      at,
      text: m.text,
      suggestions:
        m.suggestions.length === 0 ? undefined : (
          <Suggestions locale={locale} companyId={company.id} person={by} task={{ id: task.id, title: task.title }} suggestions={m.suggestions} memories={office.memories} areas={office.areas} />
        ),
    };
  };
  const lastReview = (work?.talk ?? []).findLast((m) => m.kind === "review");
  const talk = (work?.talk ?? []).map(view).filter((m) => m !== undefined);

  // What is going on now closes the conversation: the step they are on, or the colleague looking.
  const live =
    running && actions.length > 0 ? (
      <div className="talk-live">
        <span className="dot working" />
        {w.tk.liveNow} · {w.tk.steps[actions[0].kind]} <code>{actions[0].detail}</code>
      </div>
    ) : reviewer !== undefined && (review?.state === "queued" || review?.state === "reviewing") ? (
      <div className="talk-live">
        <span className="dot reviewing" />
        {review.state === "queued" ? w.tk.rvQueued(reviewer.name) : w.tk.rvReviewing(reviewer.name)}
      </div>
    ) : reviewer !== undefined && review?.state === "withdrawn" ? (
      <div className="talk-live">{w.tk.rvWithdrawn(reviewer.name)}</div>
    ) : undefined;

  const changes = (
    <>
      {work !== undefined && work.changes.length > 0 ? (
        <TaskChanges companyId={company.id} taskId={task.id} changes={work.changes} />
      ) : (
        task.status !== "done" && <p className="col-empty talk-empty">{w.tk.noChanges}</p>
      )}
      {work !== undefined && task.status === "approval" && <span className="tk-apply">{withCode(w.tk.applyWhat, work.branch)}</span>}
      {work !== undefined && task.status === "done" && <span className="tk-apply">{withCode(w.tk.applied, work.branch)}</span>}
    </>
  );
  const did = actions.length > 0 ? actions.map(stepRow) : <p className="col-empty talk-empty">{w.tk.noChanges}</p>;

  const kv = (label: string, value: ReactNode) => (
    <div className="kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
  const about = task.description ?? (task.status === "backlog" ? w.tk.notStarted : undefined);
  const side = (
    <>
      {panel(
        w.tk.details,
        <>
          {kv(w.tk.fStatus, <span className={"chip " + CHIP[task.status]}>{w.columns[task.status]}</span>)}
          {kv(w.tk.fWho, who?.name ?? w.unassigned)}
          {kv(w.tk.fReviewer, person(task.reviewerId ?? review?.reviewerId)?.name ?? w.tk.noReviewer)}
          {area !== undefined && kv(w.tk.fArea, areaName(area, t.areas))}
          {kv(w.tk.fPrio, t.priority[task.priority])}
          {time !== undefined && kv(w.tk.fTime, time)}
          {kv(w.tk.created, dateText(locale, task.createdAt))}
        </>,
        "panel side-kv",
      )}
      {about !== undefined && panel(w.tk.desc, <span style={{ fontSize: 15 }}>{about}</span>)}
      {task.status === "held" && task.heldReason !== undefined && panel(w.heldBecause, <span style={{ fontSize: 15 }}>{task.heldReason}</span>)}
      {fold(
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
          <>
            {carried.map((m) => {
              const used = work?.memoriesUsed.includes(m.id) === true;
              return (
                <div key={m.id} className={used ? "tk-mem used" : "tk-mem"}>
                  {used ? Icon.yes : <svg viewBox="0 0 16 16" />}
                  <span>{m.text}</span>
                </div>
              );
            })}
            {actions.length > 0 && <span className="hint">{w.tk.memHow}</span>}
          </>
        ),
      )}
      {work?.sessionId !== undefined &&
        fold(
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
    </>
  );

  const now = blocker !== undefined && (
      <div className="notice notice-bad tk-now">
        <span className="n-ic">{blocker.kind === "commandNotAllowed" ? RUN : Icon.plug}</span>
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
  );

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
      <TaskView
        locale={locale}
        talk={talk}
        live={live}
        now={now}
        decide={task.status === "approval" && who !== undefined ? { by: who.name, changesAskedBy: lastReview?.verdict === "changes" ? person(lastReview.by)?.name : undefined } : undefined}
        changes={changes}
        did={did}
        side={side}
        counts={{ changes: work?.changes.length ?? 0, did: actions.length }}
      />
    </Shell>
  );
}
