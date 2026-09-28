import { Head } from "../../components/head";
import { Shell } from "../../components/shell";
import { getDictionary } from "../../i18n";
import { companyScreen } from "../screen-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { locale, office, status, company } = await companyScreen();
  const t = getDictionary(locale);
  return (
    <Shell locale={locale} status={status} companies={office.companies} company={company} employees={office.employees} screen="settings" head={<Head title={t.nav.settings} />}>
      {null}
    </Shell>
  );
}
