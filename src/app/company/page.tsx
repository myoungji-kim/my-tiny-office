import Link from "next/link";
import type { ReactNode } from "react";

import { AreasPanel, CompanyMemory, CompanyName, RolesPanel } from "../../components/company-parts";
import { dateText, dayText, daysSpanned } from "../../components/dates";
import { Head } from "../../components/head";
import { MilestoneRow } from "../../components/milestones";
import { Shell } from "../../components/shell";
import { Sprite } from "../../components/sprite";
import { getDictionary } from "../../i18n";
import { companyScreen, param, type SearchParams } from "../screen-data";

export const dynamic = "force-dynamic";

const TABS = ["overview", "history", "lists", "memory"] as const;

const TAB_ICON: Readonly<Record<(typeof TABS)[number], ReactNode>> = {
  overview: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="2.4" y="2.4" width="4.6" height="4.6" rx="1" />
      <rect x="9" y="2.4" width="4.6" height="4.6" rx="1" />
      <rect x="2.4" y="9" width="4.6" height="4.6" rx="1" />
      <rect x="9" y="9" width="4.6" height="4.6" rx="1" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.6" />
      <path d="M8 4.8V8l2.2 1.4" />
    </svg>
  ),
  lists: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8" />
      <circle cx="2.8" cy="4" r=".6" />
      <circle cx="2.8" cy="8" r=".6" />
      <circle cx="2.8" cy="12" r=".6" />
    </svg>
  ),
  memory: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M3 2.6h7.4L13 5.2v8.2H3z" />
      <path d="M5.4 6.4h5.2M5.4 9h5.2M5.4 11.2h3" />
    </svg>
  ),
};

export default async function CompanyPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.company;
  const asked = await param(searchParams, "tab");
  const tab = TABS.find((x) => x === asked) ?? "overview";
  const { employees, milestones, stats, now } = office;
  const age = daysSpanned(company.foundedAt, now);
  // recorded in order, so ties keep it too once the newest come first
  const newest = [...milestones].reverse().sort((a, b) => b.at - a.at);
  const row = (m: (typeof milestones)[number]) => <MilestoneRow key={m.id} m={m} locale={locale} t={t} teams={office.teams} />;

  // a team counts once someone is in it, as its office room does
  const teams = new Set(employees.map((e) => e.teamId).filter((id) => id !== undefined)).size;
  const tiles = [
    { k: w.tiles.people, n: w.tiles.peopleN(employees.length), d: w.tiles.teamsN(teams), up: false },
    { k: w.tiles.done, n: w.tiles.count(stats.tasksDone), d: w.tiles.week(stats.tasksDoneThisWeek), up: stats.tasksDoneThisWeek > 0 },
    { k: w.tiles.reviews, n: w.tiles.count(stats.reviews), d: w.tiles.week(stats.reviewsThisWeek), up: stats.reviewsThisWeek > 0 },
    { k: w.tiles.memories, n: w.tiles.count(stats.memories), d: w.tiles.week(stats.memoriesThisWeek), up: stats.memoriesThisWeek > 0 },
  ];
  const finished = office.projects.filter((p) => p.status === "done" && p.finishedAt !== undefined).sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0));
  const months = new Map<string, typeof newest>();
  for (const m of newest) {
    const key = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(m.at);
    months.set(key, [...(months.get(key) ?? []), m]);
  }

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={employees}
      screen="company"
      head={
        <Head
          title={w.title}
          sub={w.headSub(age, employees.length)}
          tabs={TABS.map((x) => (
            <Link key={x} className="tab" role="tab" aria-selected={x === tab} href={x === "overview" ? "/company" : `/company?tab=${x}`}>
              {TAB_ICON[x]}
              <span>{w.tabs[x]}</span>
              {x === "history" && <span className="n">{milestones.length}</span>}
              {x === "memory" && <span className="n">{office.memories.filter((m) => m.kind === "company").length}</span>}
            </Link>
          ))}
        />
      }
    >
      {tab === "overview" && (
        <div className="flow">
          <div className="panel">
            <div className="panel-bd">
              <CompanyName locale={locale} companyId={company.id} name={company.name} />
              <span className="co-since">{w.since(dateText(locale, company.foundedAt), age)}</span>
            </div>
          </div>

          <div className="tiles">
            {tiles.map((x) => (
              <div key={x.k} className="tile">
                <span className="k">{x.k}</span>
                <span className="tile-n">{x.n}</span>
                <span className={x.up ? "tile-d up" : "tile-d"}>{x.d}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="sec-hd">
              <h2>{w.crewTitle}</h2>
            </div>
            <div className="crew">
              {[...employees]
                .sort((a, b) => a.hiredAt - b.hiredAt)
                .map((e) => (
                  <Link key={e.id} className="mate" href={`/people/${e.id}`}>
                    <span className="mate-av">
                      <Sprite species={e.species} size={44} />
                    </span>
                    <span className="mate-n">{e.name}</span>
                    <span className="mate-d">{w.daysWith(daysSpanned(e.hiredAt, now))}</span>
                  </Link>
                ))}
            </div>
          </div>

          <div>
            <div className="sec-hd">
              <h2>{w.projectsTitle}</h2>
            </div>
            {finished.length === 0 ? (
              <p className="none">{w.noneFinished}</p>
            ) : (
              <div className="proj">
                {finished.map((p) => {
                  const done = office.tasks.filter((x) => x.projectId === p.id && x.status === "done");
                  // the people who did it, those who have left since included
                  const crew = [...employees, ...office.former].filter((e) => done.some((x) => x.assigneeId === e.id));
                  const from = p.startedAt ?? p.finishedAt!;
                  return (
                    <div key={p.id} className="proj-row">
                      <span className="proj-n">{p.name}</span>
                      <span className="proj-m">
                        {dayText(locale, from)} – {dayText(locale, p.finishedAt!)} · {w.span(daysSpanned(from, p.finishedAt!))}
                      </span>
                      <span className="proj-m">{w.tasksN(done.length)}</span>
                      <span className="faces">
                        {crew.map((e) => (
                          <span key={e.id}>
                            <Sprite species={e.species} size={20} />
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="proj-foot">
              {w.ongoing(office.projects.filter((p) => p.status === "active").length)}
              <Link href="/projects">{w.toBoard}</Link>
            </p>
          </div>

          <div>
            <div className="sec-hd">
              <h2>{w.recentTitle}</h2>
              <Link className="more" href="/company?tab=history">
                {w.allHistory}
              </Link>
            </div>
            <div className="panel">
              <div className="panel-bd">{newest.slice(0, 3).map(row)}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="panel">
          <div className="panel-bd">
            {[...months].map(([month, list]) => (
              <div key={month} className="month">
                <h3>{month}</h3>
                {list.map(row)}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "lists" && (
        <div className="flow">
          <AreasPanel locale={locale} companyId={company.id} areas={office.areas} employees={employees} memories={office.memories} />
          <RolesPanel locale={locale} companyId={company.id} roles={office.roles} employees={employees} />
        </div>
      )}

      {tab === "memory" && (
        <div className="flow">
          <CompanyMemory locale={locale} companyId={company.id} memories={office.memories} areas={office.areas} />
        </div>
      )}
    </Shell>
  );
}
