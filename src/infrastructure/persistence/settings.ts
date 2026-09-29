import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { SERVER_NAME } from "../runtime/connector-check";

import { isCompanyId } from "./company-files";

// What belongs to this computer rather than to a company.
export interface AppSettings {
  readonly lastCompanyId?: string;
  // the language chosen here; without it, the browser's
  readonly locale?: "ko" | "en";
  // nobody free takes new work while this is set; work in progress carries on
  readonly workPaused?: boolean;
  // the connectors this computer's Claude account had when last checked
  readonly connectors?: { readonly checkedAt: number; readonly servers: readonly string[] };
}

const FILE = "settings.json";

// A missing or hand-edited file is not an error: whatever is unreadable is
// treated as unset.
export function readSettings(directory: string): AppSettings {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(directory, FILE), "utf8"));
  } catch {
    return {};
  }
  if (typeof raw !== "object" || raw === null) {
    return {};
  }

  const { lastCompanyId, locale, workPaused, connectors } = raw as Record<string, unknown>;
  return {
    ...(typeof lastCompanyId === "string" && isCompanyId(lastCompanyId) ? { lastCompanyId } : {}),
    ...(locale === "ko" || locale === "en" ? { locale } : {}),
    ...(workPaused === true ? { workPaused } : {}),
    ...connectorsOf(connectors),
  };
}

function connectorsOf(raw: unknown): Pick<AppSettings, "connectors"> {
  if (typeof raw !== "object" || raw === null) return {};
  const { checkedAt, servers } = raw as Record<string, unknown>;
  if (typeof checkedAt !== "number" || !Array.isArray(servers)) return {};
  return { connectors: { checkedAt, servers: servers.filter((s): s is string => typeof s === "string" && SERVER_NAME.test(s)) } };
}

// Written beside the target and renamed over it, so a crash never leaves half a file.
export function writeSettings(directory: string, settings: AppSettings): void {
  mkdirSync(directory, { recursive: true });
  const target = join(directory, FILE);
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, JSON.stringify(settings, null, 2));
  renameSync(temporary, target);
}
