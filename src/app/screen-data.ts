import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveLocale, type Locale } from "../i18n";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings } from "../infrastructure/persistence/settings";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";
import { loadOffice } from "../server/view-model";

// The language chosen in settings, or else the browser's.
export async function currentLocale(): Promise<Locale> {
  return readSettings(getCompanyFiles().directory).locale ?? resolveLocale((await headers()).get("accept-language"));
}

export async function screenData() {
  const locale = await currentLocale();
  const [office, status] = await Promise.all([loadOffice(), claudeCodeStatus()]);
  return { locale, office, status };
}

// Every screen but the first needs a company; without one, first run is where to go.
export async function companyScreen() {
  const data = await screenData();
  const company = data.office.company;
  if (company === undefined) redirect("/");
  return { ...data, company };
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function param(params: SearchParams, key: string): Promise<string | undefined> {
  const value = (await params)[key];
  return typeof value === "string" ? value : undefined;
}
