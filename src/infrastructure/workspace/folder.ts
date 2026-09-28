import { readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { isAllowableCommand, MAX_COMMANDS } from "../../domain/project";

export type FolderCheck =
  | { readonly ok: true; readonly folder: string; readonly scripts: readonly string[] }
  | { readonly ok: false; readonly reason: "folderNotAbsolute" | "folderNotFound" };

// A folder the user typed is only ever used as the canonical absolute path it
// resolves to, and only if it is a folder on this computer.
export function checkFolder(raw: string): FolderCheck {
  const typed = raw.trim();
  if (!isAbsolute(typed)) return { ok: false, reason: "folderNotAbsolute" };
  let folder: string;
  try {
    folder = realpathSync.native(typed);
    if (!statSync(folder).isDirectory()) return { ok: false, reason: "folderNotFound" };
  } catch {
    return { ok: false, reason: "folderNotFound" };
  }
  return { ok: true, folder, scripts: scriptsIn(folder) };
}

// The package.json scripts the project's allowed commands start from; anything
// that could not be one plain command is left for the user to add by hand.
function scriptsIn(folder: string): string[] {
  let scripts: unknown;
  try {
    scripts = (JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { scripts?: unknown }).scripts;
  } catch {
    return [];
  }
  if (typeof scripts !== "object" || scripts === null) return [];
  return Object.keys(scripts)
    .map((name) => (name === "test" ? "npm test" : `npm run ${name}`))
    .filter(isAllowableCommand)
    .slice(0, MAX_COMMANDS);
}
