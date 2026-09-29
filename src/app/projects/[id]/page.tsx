import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { isReady } from "../../../application/runtime-status";
import { ActButton } from "../../../components/act-button";
import { dayText } from "../../../components/dates";
import { Icon } from "../../../components/icons";
import { ProjectBoard } from "../../../components/project-board";
import { ProjectControls } from "../../../components/project-controls";
import { CHECK, PAUSE, Prio, PROJECT_CHIP, ProjectMark } from "../../../components/project-marks";
import { Shell } from "../../../components/shell";
import { getDictionary } from "../../../i18n";
import { reopenProjectAction, resumeProjectAction, startProjectAction } from "../../project-actions";
import { atlassianMissing, companyScreen, param, type SearchParams } from "../../screen-data";

export const dynamic = "force-dynamic";

const FLAG = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M4 14V3h8l-1.6 2.6L12 8.2H4" />
  </svg>
);

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.projects;
  const { id } = await params;
  const project = office.projects.find((p) => p.id === id);
  if (project === undefined) notFound();
  const ready = isReady(status);
  const chooseFolder = (await param(searchParams, "do")) === "folder";
  const open = office.projects.filter((p) => p.takesWork);

  // A project with no folder cannot be worked in; a planned one says so in its notice instead.
  const sub: ReactNode[] = [
    <Prio key="prio" priority={project.priority} label={t.priority[project.priority]} />,
    project.description,
    project.folder !== undefined ? (
      <span key="folder" className="mono">
        {project.folder}
      </span>
    ) : project.status === "planned" ? undefined : (
      w.noFolderYet
    ),
  ].filter((x) => x !== undefined);

  const notice = (icon: ReactNode, cls: string, title: string, why: string, button: ReactNode) => (
    <div className={`notice ${cls}`}>
      <span className="n-ic">{icon}</span>
      <span className="n-tx">
        <b>{title}</b>
        <span>{why}</span>
      </span>
      <span className="n-acts">{button}</span>
    </div>
  );

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
          <Link className="crumb" href={`/projects?filter=${project.status}`}>
            {Icon.back}
            <span>{w.backToList}</span>
          </Link>
          <div className="head-row">
            <span style={{ minWidth: 0 }}>
              <span className="proj-title">
                <h1>{project.name}</h1>
                <span className={`chip ${PROJECT_CHIP[project.status]}`}>
                  <ProjectMark status={project.status} />
                  {w.filters[project.status]}
                </span>
              </span>
              <span className="sub">
                {sub.map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && " · "}
                    {part}
                  </Fragment>
                ))}
              </span>
            </span>
            <div className="head-right">
              <ProjectControls
                atlassianMissing={atlassianMissing()}
                key={chooseFolder ? "folder" : "board"}
                locale={locale}
                companyId={company.id}
                project={project}
                projects={open}
                tasks={office.tasks}
                employees={office.employees}
                areas={office.areas}
                memories={office.memories}
                ready={ready}
                editFirst={chooseFolder}
              />
            </div>
          </div>
        </div>
      }
    >
      {project.folder !== undefined &&
        !project.folderConfirmed &&
        notice(
          FLAG,
          "notice-warn",
          w.folderToChoose,
          w.folderToChooseWhy,
          <Link className="btn btn-secondary btn-sm" href={`/projects/${project.id}?do=folder`}>
            {w.chooseFolder}
          </Link>,
        )}
      {project.status === "planned" &&
        notice(
          FLAG,
          "",
          w.plannedNotice,
          project.folder === undefined ? w.needsFolder : w.plannedNoticeWhy,
          <ActButton
            action={startProjectAction.bind(null, company.id, project.id)}
            label={w.actions.startProject}
            disabled={project.folder === undefined || !project.folderConfirmed || !ready}
            errors={t.errors}
          />,
        )}
      {project.status === "held" &&
        notice(
          PAUSE,
          "notice-warn",
          w.heldNotice,
          [project.heldReason, w.heldNoticeHint].filter(Boolean).join(" · "),
          <ActButton action={resumeProjectAction.bind(null, company.id, project.id)} label={w.actions.resumeProject} disabled={!ready} errors={t.errors} />,
        )}
      {project.status === "done" &&
        notice(
          CHECK,
          "",
          w.doneNotice(dayText(locale, project.finishedAt ?? office.now)),
          w.doneNoticeWhy,
          <ActButton action={reopenProjectAction.bind(null, company.id, project.id)} label={w.actions.reopenProject} errors={t.errors} />,
        )}
      <ProjectBoard
        locale={locale}
        companyId={company.id}
        project={project}
        projects={open}
        tasks={office.tasks}
        employees={office.employees}
        areas={office.areas}
        memories={office.memories}
        ready={ready}
      />
    </Shell>
  );
}
