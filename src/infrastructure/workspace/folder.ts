import { accessSync, constants, existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

import { isAllowableCommand, MAX_COMMANDS } from "../../domain/project";

export type FolderCheck =
  | {
      readonly ok: true;
      readonly folder: string;
      readonly scripts: readonly string[];
      // each task works in a git worktree, so the folder has to be a repository to start
      readonly repository: boolean;
    }
  | { readonly ok: false; readonly reason: "folderNotAbsolute" | "folderNotFound" | "folderIsFile" | "folderNotReadable" };

// A folder the user typed is only ever used as the canonical absolute path it
// resolves to, and only if it is a folder on this computer.
export function checkFolder(raw: string, home = homedir()): FolderCheck {
  const trimmed = raw.trim();
  // ~ is the one shorthand a person types for a path
  const typed = trimmed === "~" || /^~[\\/]/.test(trimmed) ? join(home, trimmed.slice(1)) : trimmed;
  if (!isAbsolute(typed)) return { ok: false, reason: "folderNotAbsolute" };
  let folder: string;
  try {
    folder = realpathSync.native(typed);
  } catch {
    return { ok: false, reason: "folderNotFound" };
  }
  try {
    if (!statSync(folder).isDirectory()) return { ok: false, reason: "folderIsFile" };
    accessSync(folder, constants.R_OK | constants.W_OK);
  } catch {
    return { ok: false, reason: "folderNotReadable" };
  }
  return { ok: true, folder, scripts: scriptsIn(folder), repository: existsSync(join(folder, ".git")) };
}

// The package.json scripts the project's allowed commands start from; anything
// that could not be one plain command is left for the user to add by hand.
function scriptsIn(folder: string): string[] {
  let scripts: unknown;
  try {
    scripts = (JSON.parse(readFileSync(join(folder, "package.json"), "utf8").replace(/^\uFEFF/, "")) as { scripts?: unknown }).scripts;
  } catch {
    return [];
  }
  if (typeof scripts !== "object" || scripts === null) return [];
  return Object.keys(scripts)
    .map((name) => (name === "test" ? "npm test" : `npm run ${name}`))
    .filter(isAllowableCommand)
    .slice(0, MAX_COMMANDS);
}
