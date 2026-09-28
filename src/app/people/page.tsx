import { Head } from "../../components/head";
import { PeopleView } from "../../components/people-view";
import { Shell } from "../../components/shell";
import { getDictionary } from "../../i18n";
import { companyScreen } from "../screen-data";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  return (
    <Shell locale={locale} status={status} companies={office.companies} company={company} employees={office.employees} screen="people" head={<Head title={t.nav.people} />}>
      <PeopleView t={t} companyId={company.id} employees={office.employees} roles={office.roles} />
    </Shell>
  );
}
