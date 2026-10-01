"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { approveTaskAction, holdTaskAction, removeTaskAction, resumeTaskAction, sendBackAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { ActButton } from "./act-button";
import { Icon } from "./icons";
import { ReviewDialog } from "./review-dialog";
import { RowMenu } from "./row-menu";
import { StepDialog } from "./step-dialog";
import { TaskDialog } from "./task-dialog";
import { reworkWhyOf } from "./task-lines";

// The header carries what the task's popover offers, as page buttons.
export function TaskActions({
  locale,
  companyId,
  project,
  projects,
  task,
  employees,
  areas,
  memories,
  ready,
  worked,
  assignFirst,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly project: ProjectView;
  readonly projects: readonly ProjectView[];
  readonly task: TaskView;
  readonly employees: readonly EmployeeView[];
  readonly areas: readonly AreaView[];
  readonly memories: readonly MemoryView[];
  readonly ready: boolean;
  // an agent has already worked on it
  readonly worked: boolean;
  // another screen's 담당 변경 arrives with the assignee open
  readonly assignFirst: boolean;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const router = useRouter();
  const live = project.status === "active";
  const canAssign = task.status === "backlog" && live;
  const canEdit = (task.status === "backlog" || task.status === "held" || task.status === "working") && project.takesWork;
  const canResume = task.status === "held" && live;
  // a change to running work restarts the agent
  const restarts = canEdit && task.status === "working";
  const deciding = task.status === "approval" && project.status !== "done";
  const who = employees.find((e) => e.id === task.assigneeId);
  const [dialog, setDialog] = useState<"assign" | "edit" | "hold" | "stop" | "rework" | "review" | undefined>(assignFirst && canAssign && ready ? "assign" : undefined);
  const close = useCallback(() => {
    setDialog(undefined);
    if (assignFirst) router.replace(`/projects/${project.id}/${task.id}`, { scroll: false });
  }, [assignFirst, router, project.id, task.id]);
  const choices = projects.some((p) => p.id === project.id) ? projects : [project, ...projects];
  const [removing, startRemoving] = useTransition();
  const [error, setError] = useState<string | undefined>(undefined);
  const remove = () =>
    startRemoving(async () => {
      const result = await removeTaskAction(companyId, task.id);
      if (result.error !== undefined) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
      router.push(`/projects/${project.id}`);
    });
  const canRemove = task.status !== "done" && project.status !== "done";

  return (
    <>
      {!ready && (canAssign || canResume || deciding || restarts) && <span className="ghost-note">{t.claude.cannotStart}</span>}
      {error !== undefined && (
        <span className="hint" role="alert" style={{ margin: 0 }}>
          {error}
        </span>
      )}
      {canRemove && (
        <RowMenu
          className="ibtn"
          label={w.taskActions}
          keep={t.people.keep}
          busy={removing}
          // a task only written down goes without asking
          items={[{ label: w.actions.removeTask, icon: Icon.trash, bad: true, confirm: task.status === "backlog" && !worked ? undefined : w.removeTaskWhy[task.status], run: remove }]}
        />
      )}
      {task.status === "working" && (
        <button className="btn btn-secondary btn-lg" type="button" onClick={() => setDialog("stop")}>
          {w.actions.stop}
        </button>
      )}
      {canEdit && (
        <button className="btn btn-secondary btn-lg" type="button" disabled={restarts && !ready} onClick={() => setDialog("edit")}>
          {w.actions.edit}
        </button>
      )}
      {canAssign && (
        <button className="btn btn-primary btn-lg" type="button" disabled={!ready} onClick={() => setDialog("assign")}>
          {w.actions.assign}
        </button>
      )}
      {canResume && (
        <ActButton className="btn btn-primary btn-lg" action={resumeTaskAction.bind(null, companyId, task.id)} label={w.actions.resume} disabled={!ready} errors={t.errors} />
      )}
      {deciding && (
        <>
          <button className="btn btn-secondary btn-lg" type="button" onClick={() => setDialog("hold")}>
            {w.actions.hold}
          </button>
          <button className="btn btn-secondary btn-lg" type="button" disabled={!ready} onClick={() => setDialog("review")}>
            {w.actions.askReview}
          </button>
          <button className="btn btn-secondary btn-lg" type="button" disabled={!ready} onClick={() => setDialog("rework")}>
            {w.actions.rework}
          </button>
          <ActButton className="btn btn-primary btn-lg" action={approveTaskAction.bind(null, companyId, task.id)} label={w.actions.approve} errors={t.errors} />
        </>
      )}
      {dialog === "hold" && (
        <StepDialog
          heading={w.holdTaskTitle}
          why={w.holdTaskWhy}
          yes={w.holdYes}
          cancel={w.cancel}
          field={{ label: w.holdReason, placeholder: w.holdTaskPlaceholder }}
          errors={t.errors}
          onYes={(reason) => holdTaskAction(companyId, task.id, reason)}
          onClose={close}
        />
      )}
      {dialog === "stop" && (
        <StepDialog
          heading={w.stopTitle}
          why={w.stopWhy}
          yes={w.actions.stop}
          cancel={w.cancel}
          field={{ label: w.stopReason, placeholder: w.stopPlaceholder, optional: true }}
          errors={t.errors}
          onYes={(reason) => holdTaskAction(companyId, task.id, reason)}
          onClose={close}
        />
      )}
      {dialog === "review" && (
        <ReviewDialog locale={locale} companyId={companyId} task={task} employees={employees} memories={memories} areas={areas} onClose={close} />
      )}
      {dialog === "rework" && (
        <StepDialog
          heading={w.reworkTitle}
          why={reworkWhyOf(who, w)}
          yes={w.actions.rework}
          cancel={w.cancel}
          field={{ label: w.reworkLabel, placeholder: w.reworkPlaceholder }}
          errors={t.errors}
          onYes={(reason) => sendBackAction(companyId, task.id, reason)}
          onClose={close}
        />
      )}
      {(dialog === "assign" || dialog === "edit") && (
        <TaskDialog
          locale={locale}
          companyId={companyId}
          projects={choices}
          projectId={project.id}
          areas={areas}
          employees={employees}
          memories={memories}
          edit={task}
          focusAssignee={dialog === "assign"}
          onClose={close}
        />
      )}
    </>
  );
}
