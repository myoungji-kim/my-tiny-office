import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { isReady } from "../../../../application/runtime-status";
import { ActButton } from "../../../../components/act-button";
import { dateText } from "../../../../components/dates";
import { Icon } from "../../../../components/icons";
import { areaName } from "../../../../components/names";
import { blockerText, timeLine, withCommand } from "../../../../components/task-lines";
import { Prio } from "../../../../components/project-marks";
import { Shell } from "../../../../components/shell";
import { TaskActions } from "../../../../components/task-actions";
import type { TaskStatus } from "../../../../domain/task";
import { getDictionary } from "../../../../i18n";
import { allowCommandAction } from "../../../project-actions";
import { companyScreen, param, type SearchParams } from "../../../screen-data";

export const dynamic = "force-dynamic";

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

  const about = task.description ?? (task.status === "backlog" ? w.tk.notStarted : undefined);
  const main: ReactNode[] = [
    about === undefined ? undefined : <Fragment key="desc">{panel(w.tk.desc, <span style={{ fontSize: 14 }}>{about}</span>)}</Fragment>,
    task.status === "held" && task.heldReason !== undefined ? (
      <Fragment key="held">{panel(w.heldBecause, <span style={{ fontSize: 14 }}>{task.heldReason}</span>)}</Fragment>
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
          <span className="n-ic">{RUN}</span>
          <span className="n-tx">
            <b>{blocker.kind === "commandNotAllowed" ? withCommand(w.runStopped, blocker.command) : blockerText(task, w)}</b>
            {blocker.kind === "commandNotAllowed" && who !== undefined && <span>{w.runWhy(who.name)}</span>}
          </span>
          {blocker.kind === "commandNotAllowed" && (
            <span className="n-acts">
              <ActButton action={allowCommandAction.bind(null, company.id, project.id, blocker.command)} label={w.allowRun} disabled={!ready} errors={t.errors} />
            </span>
          )}
        </div>
      )}
      <div className="tk-grid" style={main.length === 0 ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
        {main.length > 0 && <div className="tk-col">{main}</div>}
        <div className="tk-col">
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
        </div>
      </div>
    </Shell>
  );
}
