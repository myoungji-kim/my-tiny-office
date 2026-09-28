import Link from "next/link";
import { notFound } from "next/navigation";

import { isReady } from "../../../application/runtime-status";
import { dateText, sinceText } from "../../../components/dates";
import { Icon } from "../../../components/icons";
import { MemoryCard } from "../../../components/memory-card";
import { areaName } from "../../../components/names";
import { PersonActions } from "../../../components/person-actions";
import { MemoryPanel, StylePanel } from "../../../components/person-memory";
import { statusClass } from "../../../components/presence";
import { Shell } from "../../../components/shell";
import { Sprite } from "../../../components/sprite";
import { getDictionary } from "../../../i18n";
import { companyScreen, param, type SearchParams } from "../../screen-data";
import { peopleData } from "../people-data";

export const dynamic = "force-dynamic";

const TABS = ["overview", "memory", "style"] as const;

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.people;
  const { id } = await params;
  const person = office.employees.find((e) => e.id === id);
  if (person === undefined) notFound();

  const asked = await param(searchParams, "tab");
  const tab = TABS.find((x) => x === asked) ?? "overview";
  const data = peopleData(office, t);
  const memories = data.memoriesOf(person);
  const expertise = memories.filter((m) => m.kind === "expertise");
  const known = data.areasOf(person);
  const filterAsked = await param(searchParams, "area");
  const filter = known.some((a) => a.id === filterAsked) ? filterAsked : undefined;
  const href = (next: (typeof TABS)[number]) => (next === "overview" ? `/people/${person.id}` : `/people/${person.id}?tab=${next}`);
  const cls = statusClass(person.status);

  const now =
    person.task !== undefined ? (
      <>
        <span className="k">{w.currentTask}</span>
        <span className="now-task">{person.task.title}</span>
      </>
    ) : person.review !== undefined ? (
      <>
        <span className="k">{w.reviewingNow}</span>
        <span className="now-task">{person.review.title}</span>
      </>
    ) : person.status === "onLeave" ? (
      <>
        <span className="k">{w.onLeave}</span>
        <span className="now-task">{sinceText(locale, t, person.leaveSince ?? office.now, office.now)}</span>
      </>
    ) : (
      <>
        <span className="k">{w.nothingAssigned}</span>
        <span className="now-note">{person.lastFinished === undefined ? w.justJoined : w.lastFinished + " · " + person.lastFinished}</span>
      </>
    );

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={office.employees}
      screen="people"
      current={person.id}
      head={
        <div className="head">
          <Link className="crumb" href="/people">
            {Icon.back}
            <span>{w.backToList}</span>
          </Link>
          <div className="head-row person-hd">
            <span className="d-av">
              <Sprite species={person.species} size={56} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span className="person-name">
                <h1>{person.name}</h1>
                <span className={`chip ${cls}`}>
                  <span className={`dot ${cls}`} />
                  {t.employeeStatus[person.status]}
                </span>
              </span>
              <span className="sub">{data.roleLine(person)}</span>
            </span>
            <div className="head-right">
              <PersonActions
                locale={locale}
                companyId={company.id}
                person={person}
                roleLine={data.roleLine(person)}
                memories={memories}
                areas={office.areas}
                backlog={data.backlog}
                projects={data.openProjects}
                roles={data.roles}
                teams={data.teams}
                ready={isReady(status)}
                assignFirst={(await param(searchParams, "do")) === "assign"}
              />
            </div>
          </div>
          <div className="tabs" role="tablist">
            {TABS.map((x) => (
              <Link key={x} className="tab" role="tab" aria-selected={x === tab} href={href(x)}>
                <span>{w.ptabs[x]}</span>
                {x !== "overview" && <span className="n">{x === "memory" ? expertise.length : memories.length - expertise.length}</span>}
              </Link>
            ))}
          </div>
        </div>
      }
    >
      {tab === "overview" && (
        <div className="p-grid">
          <div className="p-col">
            <div className="panel">
              <div className="panel-hd">
                <h2>{w.now}</h2>
              </div>
              <div className="panel-bd">{now}</div>
            </div>
            <div className="panel">
              <div className="panel-hd">
                <h2>{w.record}</h2>
              </div>
              <div className="panel-bd">
                <div className="kv">
                  <span>{w.joined}</span>
                  <b>{dateText(locale, person.hiredAt)}</b>
                </div>
                <div className="kv">
                  <span>{w.doneAndReviews}</span>
                  <b>{w.counts(person.finished, person.reviewed)}</b>
                </div>
              </div>
            </div>
          </div>
          <div className="p-col">
            <div className="panel">
              <div className="panel-hd with-link">
                <h2>{w.latest}</h2>
                <Link className="link" href={href("memory")}>
                  {w.allMemory}
                </Link>
              </div>
              <div className="panel-bd">
                {expertise.length === 0 ? (
                  <p className="empty-line">{w.noMemory}</p>
                ) : (
                  [...expertise]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, 3)
                    .map((m) => <MemoryCard key={m.id} memory={m} words={w} />)
                )}
              </div>
            </div>
            <div className="panel">
              <div className="panel-hd">
                <h2>{w.expertise}</h2>
              </div>
              <div className="panel-bd">
                {known.length > 0 ? (
                  <>
                    <span className="areas">
                      {known.map((a) => (
                        <span key={a.id} className="area-chip">
                          {areaName(a, t.areas)}
                        </span>
                      ))}
                    </span>
                    <p className="why">{w.expertiseWhy}</p>
                  </>
                ) : (
                  <p className="why" style={{ margin: 0 }}>
                    {w.noExpertise}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "memory" && (
        <div className="mem-layout">
          <nav className="rail" aria-label={w.areaFilter}>
            <Link className="rail-item" href={href("memory")} aria-current={filter === undefined}>
              <span>{w.allAreas}</span>
              <span className="n">{expertise.length}</span>
            </Link>
            {known.map((a) => (
              <Link key={a.id} className="rail-item" href={`${href("memory")}&area=${a.id}`} aria-current={filter === a.id}>
                <span>{areaName(a, t.areas)}</span>
                <span className="n">{expertise.filter((m) => m.areaId === a.id).length}</span>
              </Link>
            ))}
          </nav>
          <MemoryPanel locale={locale} companyId={company.id} person={person} memories={memories} areas={office.areas} filter={filter} />
        </div>
      )}

      {tab === "style" && <StylePanel locale={locale} companyId={company.id} person={person} memories={memories} />}
    </Shell>
  );
}
