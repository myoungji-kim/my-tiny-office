import { CompanyView } from "../../components/company-view";
import { Head } from "../../components/head";
import { Shell } from "../../components/shell";
import { getDictionary } from "../../i18n";
import { companyScreen } from "../screen-data";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  return (
    <Shell locale={locale} status={status} companies={office.companies} company={company} employees={office.employees} screen="company" head={<Head title={t.nav.company} />}>
      <CompanyView
        t={t}
        name={company.name}
        description={company.description}
        founded={new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(company.foundedAt))}
        employeeCount={office.employees.length}
        taskCount={office.tasks.length}
      />
    </Shell>
  );
}
