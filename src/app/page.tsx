import { headers } from "next/headers";

import { CompanyView } from "../components/company-view";
import { OfficeView } from "../components/office-view";
import { FirstRun } from "../components/first-run";
import { PeopleView } from "../components/people-view";
import { Shell, views, type View } from "../components/shell";
import { WorkView } from "../components/work-view";
import { STARTING_ROLES } from "../domain/organisation";
import { getDictionary, resolveLocale } from "../i18n";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";
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

  const [office, status] = await Promise.all([loadOffice(single(params, "company")), claudeCodeStatus()]);
  if (office.company === undefined) {
    return (
      <FirstRun locale={locale} status={status} roles={STARTING_ROLES} words={t.firstRun} claude={t.claude} errors={t.errors} />
    );
  }

  const { company, companies, employees, roles, projects, tasks } = office;
  const view = resolveView(single(params, "view"));

  return (
    <Shell
      t={t}
      status={status}
      companies={companies}
      companyId={company.id}
      companyName={company.name}
      view={view}
    >
      {view === "office" && (
        <OfficeView t={t} companyId={company.id} employees={employees} tasks={tasks} />
      )}
      {view === "people" && <PeopleView t={t} companyId={company.id} employees={employees} roles={roles} />}
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
