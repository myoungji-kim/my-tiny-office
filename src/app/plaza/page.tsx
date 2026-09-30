import { redirect } from "next/navigation";

import { isReady } from "../../application/runtime-status";
import { Head } from "../../components/head";
import { PlazaView } from "../../components/plaza-view";
import { Shell } from "../../components/shell";
import { getDictionary } from "../../i18n";
import { loadCandidates, plazaShown } from "../../server/plaza";
import { peopleData } from "../people/people-data";
import { companyScreen } from "../screen-data";

export const dynamic = "force-dynamic";

export default async function PlazaPage() {
  // hidden in settings, the plaza reads nothing and is not there to open
  if (!plazaShown()) redirect("/");
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  const w = t.plaza;
  const candidates = await loadCandidates(company.id);
  const { roles, teams } = peopleData(office, t);
  const waiting = candidates.filter((c) => !c.hidden).length;

  return (
    <Shell
      locale={locale}
      status={status}
      companies={office.companies}
      company={company}
      employees={office.employees}
      screen="plaza"
      head={<Head title={w.title} sub={w.sub} right={<span className="ghost-note">{w.count(waiting)}</span>} />}
    >
      <PlazaView
        locale={locale}
        companyId={company.id}
        candidates={candidates}
        roles={roles}
        teams={teams}
        areas={office.areas}
        ready={isReady(status)}
        now={office.now}
      />
    </Shell>
  );
}
