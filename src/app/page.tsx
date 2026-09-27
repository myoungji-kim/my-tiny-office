import { headers } from "next/headers";

import { CompanyView } from "../components/company-view";
import { OfficeView } from "../components/office-view";
import { Onboarding } from "../components/onboarding";
import { PeopleView } from "../components/people-view";
import { Shell, views, type View } from "../components/shell";
import { WorkView } from "../components/work-view";
import { getDictionary, resolveLocale } from "../i18n";
import { loadOffice } from "../server/view-model";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" ? value : undefined;
}

function resolveView(value: string | undefined): View {
  return views.find((candidate) => candidate === value) ?? "office";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = resolveLocale((await headers()).get("accept-language"));
  const t = getDictionary(locale);

  const office = await loadOffice(single(params, "company"));
  if (office.company === undefined) {
    return <Onboarding t={t} />;
  }

  const { company, companies, employees, projects, tasks } = office;
  const view = resolveView(single(params, "view"));

  return (
    <Shell
      t={t}
      companies={companies}
      companyId={company.id}
      companyName={company.name}
      view={view}
    >
      {view === "office" && (
        <OfficeView t={t} companyId={company.id} employees={employees} tasks={tasks} />
      )}
      {view === "people" && <PeopleView t={t} companyId={company.id} employees={employees} />}
      {view === "work" && (
        <WorkView t={t} companyId={company.id} employees={employees} projects={projects} tasks={tasks} />
      )}
      {view === "company" && (
        <CompanyView
          t={t}
          name={company.name}
          description={company.description}
          founded={new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
            new Date(company.foundedAt),
          )}
          employeeCount={employees.length}
          taskCount={tasks.length}
        />
      )}
    </Shell>
  );
}
