import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isCompanyId } from "./company-files";

export type Language = "ko" | "en";

// What belongs to this computer rather than to a company.
export interface AppSettings {
  readonly language?: Language;
  readonly lastCompanyId?: string;
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

  const { language, lastCompanyId } = raw as Record<string, unknown>;
  return {
    ...(language === "ko" || language === "en" ? { language } : {}),
    ...(typeof lastCompanyId === "string" && isCompanyId(lastCompanyId) ? { lastCompanyId } : {}),
  };
}

// Written beside the target and renamed over it, so a crash never leaves half a file.
export function writeSettings(directory: string, settings: AppSettings): void {
  mkdirSync(directory, { recursive: true });
  const target = join(directory, FILE);
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, JSON.stringify(settings, null, 2));
  renameSync(temporary, target);
}
