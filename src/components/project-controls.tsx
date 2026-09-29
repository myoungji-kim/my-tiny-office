"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import type { Outcome } from "../app/action-context";
import { finishProjectAction, holdProjectAction, removeProjectAction, reopenProjectAction, resumeProjectAction, startProjectAction } from "../app/project-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { Icon } from "./icons";
import { ProjectDialog } from "./project-dialog";
import { RowMenu, type MenuItem } from "./row-menu";
import { StepDialog } from "./step-dialog";
import { TaskDialog } from "./task-dialog";

type Open = "edit" | "hold" | "finish" | "task" | undefined;

// What the project's own menu offers follows from where the project is.
export function ProjectControls({
  locale,
  companyId,
  project,
  projects,
  tasks,
  employees,
  areas,
  memories,
  ready,
  editFirst,
  atlassianMissing,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly project: ProjectView;
  readonly projects: readonly ProjectView[];
  readonly tasks: readonly TaskView[];
  readonly employees: readonly EmployeeView[];
  readonly areas: readonly AreaView[];
  readonly memories: readonly MemoryView[];
  readonly ready: boolean;
  // the notice's 폴더 고르기 arrives with the dialog open
  readonly editFirst: boolean;
  readonly atlassianMissing: boolean;
}) {
  const t = getDictionary(locale);
  const w = t.projects;
  const a = w.actions;
  const [open, setOpen] = useState<Open>(editFirst ? "edit" : undefined);
  const [, start] = useTransition();
  const router = useRouter();
  const close = useCallback(() => {
    setOpen(undefined);
    if (editFirst) router.replace(`/projects/${project.id}`, { scroll: false });
  }, [editFirst, router, project.id]);
  const [error, setError] = useState<string | undefined>(undefined);
  const act = (action: () => Promise<Outcome>) =>
    start(async () => {
      const result = await action();
      setError(result.error === undefined ? undefined : (t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown));
    });

  const mine = tasks.filter((x) => x.projectId === project.id);
  const running = mine.filter((x) => x.status === "working").length;
  const unsettled = mine.filter((x) => x.status === "working" || x.status === "approval").length;
  const unfinished = mine.filter((x) => x.status !== "done").length;
  const stopped = ready ? undefined : t.claude.cannotStart;
  const edit: MenuItem = { label: a.editProject, icon: Icon.pen, run: () => setOpen("edit") };

  const items: MenuItem[] =
    project.status === "planned"
      ? [
          {
            label: a.startProject,
            key: true,
            off: project.folder === undefined ? w.needsFolder : !project.folderConfirmed ? w.folderToChoose : stopped,
            run: () => act(() => startProjectAction(companyId, project.id)),
          },
          edit,
        ]
      : project.status === "active"
        ? [
            edit,
            { label: a.holdProject, icon: Icon.sun, run: () => setOpen("hold") },
            { label: a.finishProject, off: unsettled > 0 ? w.cannotFinish(unsettled) : undefined, run: () => setOpen("finish") },
          ]
        : project.status === "held"
          ? [{ label: a.resumeProject, key: true, off: stopped, run: () => act(() => resumeProjectAction(companyId, project.id)) }, edit]
          : [{ label: a.reopenProject, run: () => act(() => reopenProjectAction(companyId, project.id)) }];
  const removal: MenuItem = {
    label: a.removeProject,
    icon: Icon.trash,
    bad: true,
    confirm: project.status === "done" ? w.removeProjectDone : mine.length === 0 ? w.removeProjectEmpty : w.removeProjectWhy(mine.length),
    run: () =>
      start(async () => {
        const result = await removeProjectAction(companyId, project.id);
        if (result.error !== undefined) return setError(t.errors[result.error as keyof typeof t.errors] ?? t.errors.unknown);
        router.push("/projects");
      }),
  };

  return (
    <>
      {error !== undefined && (
        <span className="hint" role="alert" style={{ margin: 0 }}>
          {error}
        </span>
      )}
      <RowMenu className="ibtn" label={w.projectActions} keep={t.people.keep} items={[...items, removal]} />
      {project.takesWork && (
        <button className="btn btn-primary btn-lg" type="button" onClick={() => setOpen("task")}>
          {Icon.plus}
          <span>{w.newTask}</span>
        </button>
      )}

      {open === "edit" && <ProjectDialog locale={locale} companyId={companyId} edit={project} atlassianMissing={atlassianMissing} onClose={close} />}
      {open === "hold" && (
        <StepDialog
          heading={w.holdTitle}
          why={w.holdWhy(running)}
          yes={w.holdYes}
          cancel={w.cancel}
          field={{ label: w.holdReason, placeholder: w.holdPlaceholder }}
          errors={t.errors}
          onYes={(reason) => holdProjectAction(companyId, project.id, reason)}
          onClose={close}
        />
      )}
      {open === "finish" && (
        <StepDialog
          heading={w.finishTitle}
          why={w.finishWhy(unfinished)}
          yes={w.finishYes}
          cancel={w.cancel}
          errors={t.errors}
          onYes={() => finishProjectAction(companyId, project.id)}
          onClose={close}
        />
      )}
      {open === "task" && (
        <TaskDialog
          locale={locale}
          companyId={companyId}
          projects={projects}
          projectId={project.id}
          areas={areas}
          employees={employees}
          memories={memories}
          onClose={close}
        />
      )}
    </>
  );
}
