import { FirstRun } from "../../components/first-run";
import { STARTING_ROLES } from "../../domain/organisation";
import { param, screenData, type SearchParams } from "../screen-data";

export const dynamic = "force-dynamic";

// Another company starts the way the first did, past the welcome.
export default async function NewCompanyPage({ searchParams }: { searchParams: SearchParams }) {
  const { locale, status } = await screenData();
  const entry = (await param(searchParams, "from")) === "import" ? "import" : "new";
  return <FirstRun locale={locale} status={status} roles={STARTING_ROLES} entry={entry} />;
}
