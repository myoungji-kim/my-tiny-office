import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, isAbsolute } from "node:path";

import type { OwnExtensions } from "../../domain/project";

// What the user's Claude Code has installed, for the user or for one project's
// folder, and what of it the user chose for employees (SECURITY.md §8).
export interface Extension {
  readonly id: string;
  readonly name: string;
  readonly about: string | undefined;
  readonly path: string;
}

export interface Chosen {
  readonly plugins: readonly string[];
  readonly skills: readonly string[];
}

export const EXTENSION_ID = /^[A-Za-z0-9._@-]+$/;
const MAX_ABOUT = 300;

const within = (root: string, path: string) => {
  const from = relative(root, path);
  return from !== "" && !from.startsWith("..") && !isAbsolute(from);
};

const json = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
};

const isDirectory = (path: string) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

const about = (text: unknown) => (typeof text === "string" && text.trim() !== "" ? text.trim().slice(0, MAX_ABOUT) : undefined);

// A skill says its name and what it is for in the frontmatter of its SKILL.md.
function frontmatter(path: string): { readonly name?: string; readonly description?: string } {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const field = (key: string) => new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1].trim().replace(/^["']|["']$/g, "");
  return { name: field("name"), description: field("description") };
}

type Install = { readonly scope?: unknown; readonly installPath?: unknown; readonly projectPath?: unknown };

const sameFolder = (a: string, b: string) =>
  process.platform === "win32" || process.platform === "darwin" ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b);
const forUser = (i: Install) => i.scope === "user";
const forFolder = (folder: string) => (i: Install) => (i.scope === "project" || i.scope === "local") && typeof i.projectPath === "string" && sameFolder(i.projectPath, folder);

// Plugins installed where the install matches, only where Claude Code keeps them.
function plugins(home: string, matches: (install: Install) => boolean): Extension[] {
  const root = resolve(home, ".claude", "plugins");
  const installed = json(join(root, "installed_plugins.json"));
  const entries = typeof installed === "object" && installed !== null ? (installed as { plugins?: unknown }).plugins : undefined;
  if (typeof entries !== "object" || entries === null) return [];
  return Object.entries(entries).flatMap(([id, installs]) => {
    const install: Install | undefined = Array.isArray(installs) ? installs.find((i) => typeof i === "object" && i !== null && matches(i)) : undefined;
    const path = typeof install?.installPath === "string" ? resolve(install.installPath) : undefined;
    if (!EXTENSION_ID.test(id) || path === undefined || !within(root, path) || !isDirectory(path)) return [];
    const manifest = json(join(path, ".claude-plugin", "plugin.json")) as { description?: unknown } | undefined;
    return [{ id, name: id.split("@")[0], about: about(manifest?.description), path }];
  });
}

// Skills in a .claude/skills folder: each a folder with a SKILL.md, never a link out of it.
function skillsIn(base: string): Extension[] {
  const root = resolve(base, ".claude", "skills");
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  return names.flatMap((id) => {
    const path = join(root, id);
    if (!EXTENSION_ID.test(id) || lstatSync(path).isSymbolicLink() || !isDirectory(path) || !existsSync(join(path, "SKILL.md"))) return [];
    const { name, description } = frontmatter(join(path, "SKILL.md"));
    return [{ id, name: name ?? id, about: about(description), path }];
  });
}

type Installed = { readonly plugins: readonly Extension[]; readonly skills: readonly Extension[] };

// What changes only when the user installs something, kept a minute.
const FRESH_MS = 60_000;
let last: { readonly home: string; readonly at: number; readonly found: Installed } | undefined;

export function installedExtensions(home: string = homedir()): Installed {
  if (last !== undefined && last.home === home && Date.now() - last.at < FRESH_MS) return last.found;
  last = { home, at: Date.now(), found: scan(home) };
  return last.found;
}

const byName = (a: Extension, b: Extension) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

function scan(home: string): Installed {
  return { plugins: plugins(home, forUser).sort(byName), skills: skillsIn(home).sort(byName) };
}

// What a project's own folder carries: its skills, and plugins installed for it alone.
export function projectExtensions(folder: string, home: string = homedir()): Installed {
  return { plugins: plugins(home, forFolder(folder)).sort(byName), skills: skillsIn(folder).sort(byName) };
}

// The skills Claude Code itself finds in a folder's .claude/skills.
export function skillNamesIn(folder: string): string[] {
  return skillsIn(folder).map((s) => s.id);
}

const WRAPPER = "my-tiny-office-skills";

// The plugin folders a run is given: each chosen plugin as installed, and the
// chosen skills carried in one plugin of the app's own, made in the run's folder.
// A project's own skills are copied from its folder, never the task's worktree.
export function pluginDirs(
  chosen: Chosen | undefined,
  own: (OwnExtensions & { readonly folder: string }) | undefined,
  runFolder: string,
  give: { readonly plugins: boolean },
  home: string = homedir(),
): string[] {
  const found = installedExtensions(home);
  const project = own === undefined ? { plugins: [], skills: [] } : projectExtensions(own.folder, home);
  const ownSkills = project.skills.filter((s) => !own?.skillsOff.includes(s.id));
  const given = [...found.plugins.filter((p) => chosen?.plugins.includes(p.id)), ...project.plugins.filter((p) => own?.pluginsOn.includes(p.id))];
  const dirs = give.plugins ? [...new Set(given.map((p) => p.path))] : [];
  // the project's own skill stands in for the user's of the same name
  const carried = [...found.skills.filter((s) => chosen?.skills.includes(s.id) && !ownSkills.some((o) => o.id === s.id)), ...ownSkills];
  if (carried.length > 0) {
    const wrapper = join(runFolder, WRAPPER);
    mkdirSync(join(wrapper, ".claude-plugin"), { recursive: true });
    writeFileSync(join(wrapper, ".claude-plugin", "plugin.json"), JSON.stringify({ name: WRAPPER, version: "0.0.0", description: "The skills chosen in My Tiny Office" }));
    // ponytail: copies each skill whole per run; a size cap if skills grow large
    for (const skill of carried) cpSync(skill.path, join(wrapper, "skills", skill.id), { recursive: true });
    dirs.push(wrapper);
  }
  return dirs;
}
