import Link from "next/link";

import { isReady } from "../application/runtime-status";
import { FirstRun } from "../components/first-run";
import { Head } from "../components/head";
import { OfficeFloor } from "../components/office-floor";
import { teamName } from "../components/names";
import { peopleIn, roomsOf, type Room } from "../components/office-rooms";
import { Shell } from "../components/shell";
import { STARTING_ROLES } from "../domain/organisation";
import { getDictionary } from "../i18n";

import { dataDirectory, param, screenData, type SearchParams } from "./screen-data";

export const dynamic = "force-dynamic";

export default async function OfficePage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, office, status } = await screenData();
  const t = getDictionary(locale);
  const { company, companies, employees, teams, roles } = office;
  if (company === undefined) {
    return <FirstRun locale={locale} status={status} roles={STARTING_ROLES} looked={{ directory: dataDirectory(), unreadable: office.unreadable }} />;
  }

  const rooms = roomsOf(employees, teams);
  const asked = await param(searchParams, "room");
  const room = rooms.find((r) => r.key === asked) ?? rooms[0];
  const nameOf = (r: Room) => (r.kind === "team" ? teamName(r.team, t.teams) : t.office.rooms[r.kind]);
  const sub =
    room.kind === "lounge" ? t.office.loungeSub : room.kind === "meeting" ? t.office.meetingSub : t.office.peopleSub(peopleIn(room, employees).length);

  return (
    <Shell
      locale={locale}
      status={status}
      companies={companies}
      company={company}
      employees={employees}
      screen="office"
      head={
        <Head
          title={t.office.title}
          sub={sub}
          tabs={rooms.map((r) => (
            <Link key={r.key} className="tab" role="tab" aria-selected={r.key === room.key} href={r.kind === "all" ? "/" : `/?room=${encodeURIComponent(r.key)}`}>
              <span>{nameOf(r)}</span>
              <span className="n">{peopleIn(r, employees).length}</span>
            </Link>
          ))}
        />
      }
    >
      <OfficeFloor
        locale={locale}
        companyId={company.id}
        room={room}
        employees={employees}
        teams={teams}
        roles={roles.map((r) => ({ id: r.id, label: r.name }))}
        areas={office.areas}
        memories={office.memories}
        ready={isReady(status)}
        now={office.now}
      />
    </Shell>
  );
}
