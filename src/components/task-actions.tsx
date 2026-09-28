"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { resumeTaskAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { ActButton } from "./act-button";
import { TaskDialog } from "./task-dialog";

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
  // another screen's 담당 변경 arrives with the assignee open
  readonly assignFirst: boolean;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const router = useRouter();
  const live = project.status === "active";
  const canAssign = task.status === "backlog" && live;
  const canEdit = (task.status === "backlog" || task.status === "held") && project.takesWork;
  const canResume = task.status === "held" && live;
  const [dialog, setDialog] = useState<"assign" | "edit" | undefined>(assignFirst && canAssign && ready ? "assign" : undefined);
  const close = useCallback(() => {
    setDialog(undefined);
    if (assignFirst) router.replace(`/projects/${project.id}/${task.id}`, { scroll: false });
  }, [assignFirst, router, project.id, task.id]);
  const choices = projects.some((p) => p.id === project.id) ? projects : [project, ...projects];

  return (
    <>
      {!ready && (canAssign || canResume) && <span className="ghost-note">{t.claude.cannotStart}</span>}
      {canEdit && (
        <button className="btn btn-secondary btn-lg" type="button" onClick={() => setDialog("edit")}>
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
      {dialog !== undefined && (
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
