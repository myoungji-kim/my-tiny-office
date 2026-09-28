import { Head } from "../../components/head";
import { Shell } from "../../components/shell";
import { WorkView } from "../../components/work-view";
import { getDictionary } from "../../i18n";
import { companyScreen } from "../screen-data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  return (
    <Shell locale={locale} status={status} companies={office.companies} company={company} employees={office.employees} screen="projects" head={<Head title={t.nav.projects} />}>
      <WorkView t={t} companyId={company.id} employees={office.employees} projects={office.projects} tasks={office.tasks} />
    </Shell>
  );
}
