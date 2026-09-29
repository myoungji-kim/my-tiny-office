import Link from "next/link";
import { redirect } from "next/navigation";

import { dayText, daysSpanned } from "../../components/dates";
import { Head } from "../../components/head";
import { NewProjectButton } from "../../components/new-project-button";
import { Prio, ProjectMark } from "../../components/project-marks";
import { Shell } from "../../components/shell";
import { PRIORITY_RANK, type ProjectStatus } from "../../domain/project";
import { getDictionary } from "../../i18n";
import { atlassianMissing, companyScreen, param, type SearchParams } from "../screen-data";

export const dynamic = "force-dynamic";

const FILTERS: readonly ProjectStatus[] = ["planned", "active", "held", "done"];
const COUNTED = ["backlog", "working", "approval", "done"] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.projects;

  // another screen's 업무 상세 and 담당 변경 name only the task
  const taskId = await param(searchParams, "task");
  const task = office.tasks.find((x) => x.id === taskId);
  if (task !== undefined) redirect(`/projects/${task.projectId}/${task.id}${(await param(searchParams, "do")) === "assign" ? "?do=assign" : ""}`);

  const asked = await param(searchParams, "filter");
  const filter = FILTERS.find((f) => f === asked) ?? "active";
  // Whoever is free takes from the highest-ranked project first, so every tab is in that order.
  const rows = office.projects.filter((p) => p.status === filter).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const tasksOf = (id: string) => office.tasks.filter((x) => x.projectId === id);

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={office.employees}
      screen="projects"
      head={
        <Head
          title={w.title}
          sub={w.headSub(office.projects.filter((p) => p.status === "active").length, office.tasks.filter((x) => x.status === "approval").length)}
          right={<NewProjectButton locale={locale} companyId={company.id} label={w.newProject} atlassianMissing={atlassianMissing()} />}
          tabs={FILTERS.map((f) => (
            <Link key={f} className="tab" role="tab" aria-selected={f === filter} href={`/projects?filter=${f}`}>
              <ProjectMark status={f} />
              <span>{w.filters[f]}</span>
              <span className="n">{office.projects.filter((p) => p.status === f).length}</span>
            </Link>
          ))}
        />
      }
    >
      <div className="list" id="projList">
        {rows.length === 0 && <p className="list-empty">{w.listEmpty[filter]}</p>}
        {rows.map((p) => {
          const mine = tasksOf(p.id);
          const done = p.status === "done" && p.finishedAt !== undefined;
          return (
            <Link key={p.id} className="row-item" href={`/projects/${p.id}`}>
              <Prio priority={p.priority} label={t.priority[p.priority]} />
              <span>
                <span className="pr-name">{p.name}</span>
                {p.description !== undefined && <span className="pr-desc">{p.description}</span>}
              </span>
              <span className="pr-folder mono">{p.folder ?? w.noFolder}</span>
              <span className="pr-counts">
                {done
                  ? w.record(mine.filter((x) => x.status === "done").length, daysSpanned(p.startedAt ?? p.finishedAt!, p.finishedAt!))
                  : COUNTED.map((k, i) => {
                      const n = mine.filter((x) => x.status === k).length;
                      return (
                        <span key={k} className={k === "approval" && n > 0 ? "wait" : undefined}>
                          {i > 0 && " · "}
                          {locale === "ko" ? (
                            <>
                              {w.counts[k]} <b>{n}</b>
                            </>
                          ) : (
                            <>
                              <b>{n}</b> {w.counts[k]}
                            </>
                          )}
                        </span>
                      );
                    })}
              </span>
              <span className="pr-since">
                {done ? w.doneOn(dayText(locale, p.finishedAt!)) : p.startedAt !== undefined ? w.since(dayText(locale, p.startedAt)) : w.notStarted}
              </span>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}
