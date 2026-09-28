import { FirstRun } from "../../components/first-run";
import { STARTING_ROLES } from "../../domain/organisation";
import { getDictionary } from "../../i18n";
import { screenData } from "../screen-data";

export const dynamic = "force-dynamic";

// Another company starts the way the first did, past the welcome.
export default async function NewCompanyPage() {
  const { locale, status } = await screenData();
  const t = getDictionary(locale);
  return <FirstRun locale={locale} status={status} roles={STARTING_ROLES} words={t.firstRun} claude={t.claude} errors={t.errors} another />;
}
