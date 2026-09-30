import Link from "next/link";

import { AgentMark } from "../../components/agent-mark";
import { Head } from "../../components/head";
import { HireButton } from "../../components/hire-button";
import { areaName } from "../../components/names";
import { OrgChart } from "../../components/org-chart";
import { statusColor } from "../../components/presence";
import { Shell } from "../../components/shell";
import { Sprite } from "../../components/sprite";
import { isReady } from "../../application/runtime-status";
import { getDictionary } from "../../i18n";
import { plazaShown } from "../../server/plaza";
import { companyScreen, param, type SearchParams } from "../screen-data";

import { peopleData } from "./people-data";

export const dynamic = "force-dynamic";

export default async function PeoplePage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.people;
  const view = (await param(searchParams, "view")) === "org" ? "org" : "list";
  const data = peopleData(office, t);
  const { employees } = office;
  const career = plazaShown() ? { areas: office.areas, ready: isReady(status) } : undefined;

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={employees}
      screen="people"
      head={
        <Head
          title={w.title}
          sub={w.headSub(employees.length, office.teams.length)}
          right={<HireButton locale={locale} companyId={company.id} roles={data.roles} teams={data.teams} label={w.hire} career={career} />}
          tabs={
            <>
              <Link className="tab" role="tab" aria-selected={view === "list"} href="/people">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
                </svg>
                <span>{w.tabs.list}</span>
                <span className="n">{employees.length}</span>
              </Link>
              <Link className="tab" role="tab" aria-selected={view === "org"} href="/people?view=org">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                  <rect x="5.5" y="1.8" width="5" height="3.6" rx=".8" />
                  <rect x="1.6" y="10.6" width="5" height="3.6" rx=".8" />
                  <rect x="9.4" y="10.6" width="5" height="3.6" rx=".8" />
                  <path d="M8 5.4v2.6M4.1 10.6V8h7.8v2.6" />
                </svg>
                <span>{w.tabs.org}</span>
              </Link>
            </>
          }
        />
      }
    >
      {view === "list" ? (
        <div className="list" id="roster">
          {employees.map((e) => (
            <Link key={e.id} className="row-item" href={`/people/${e.id}`}>
              <span className="r-av">
                <Sprite species={e.species} size={40} />
                <span className="r-live" style={{ background: statusColor[e.status] }} />
                {e.agentLost && <AgentMark label={t.projects.agentLost} />}
              </span>
              <span>
                <span className="r-name">{e.name}</span>
                <span className="r-role">{e.role}</span>
              </span>
              <span className="r-team">{data.team(e) || w.noTeam}</span>
              <span className="areas">
                {data.areasOf(e).map((a) => (
                  <span key={a.id} className="area-chip">
                    {areaName(a, t.areas)}
                  </span>
                ))}
              </span>
              <span className="r-mem">{w.memCount(data.memoriesOf(e).length)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <OrgChart locale={locale} companyId={company.id} employees={employees} teams={office.teams} roles={data.roles} career={career} />
      )}
    </Shell>
  );
}
