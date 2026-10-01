import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveLocale, type Locale } from "../i18n";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { workingElsewhere } from "../infrastructure/work-lock";
import { readSettings } from "../infrastructure/persistence/settings";
import { isAtlassianServer } from "../infrastructure/runtime/connectors";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";
import { loadOffice } from "../server/view-model";

// The language chosen in settings, or else the browser's.
export async function currentLocale(): Promise<Locale> {
  return readSettings(getCompanyFiles().directory).locale ?? resolveLocale((await headers()).get("accept-language"));
}

// where this computer keeps its companies
export const dataDirectory = (): string => getCompanyFiles().directory;

// another server on this computer is doing the work for this data
export const workElsewhere = (): boolean => workingElsewhere(getCompanyFiles().directory);

export const workPaused = (): boolean => readSettings(getCompanyFiles().directory).workPaused === true;
export const notifies = (): boolean => readSettings(getCompanyFiles().directory).notifyOff !== true;

// The user's plugins and skills employees are given on this computer.
export const chosenExtensions = () => readSettings(getCompanyFiles().directory).extensions;

// What the last connector check found here, if one has run.
export const checkedConnectors = () => readSettings(getCompanyFiles().directory).connectors;

// A project can turn Atlassian on either way; this says the account was checked and has none.
export const atlassianMissing = (): boolean => {
  const checked = checkedConnectors();
  return checked !== undefined && !checked.servers.some(isAtlassianServer);
};

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
