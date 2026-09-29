import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, isAbsolute } from "node:path";

// What the user's Claude Code has installed in user scope, found on this
// computer, and what of it the user chose for employees (SECURITY.md §8).
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

// Plugins installed for the user, only where Claude Code keeps them.
function plugins(home: string): Extension[] {
  const root = resolve(home, ".claude", "plugins");
  const installed = json(join(root, "installed_plugins.json"));
  const entries = typeof installed === "object" && installed !== null ? (installed as { plugins?: unknown }).plugins : undefined;
  if (typeof entries !== "object" || entries === null) return [];
  return Object.entries(entries).flatMap(([id, installs]) => {
    const user = Array.isArray(installs) ? installs.find((i) => typeof i === "object" && i !== null && i.scope === "user") : undefined;
    const path = typeof user?.installPath === "string" ? resolve(user.installPath) : undefined;
    if (!EXTENSION_ID.test(id) || path === undefined || !within(root, path) || !isDirectory(path)) return [];
    const manifest = json(join(path, ".claude-plugin", "plugin.json")) as { description?: unknown } | undefined;
    return [{ id, name: id.split("@")[0], about: about(manifest?.description), path }];
  });
}

// The user's own skills: each a folder with a SKILL.md.
function skills(home: string): Extension[] {
  const root = resolve(home, ".claude", "skills");
  let names: string[];
  try {
    names = readdirSync(root);
  } catch {
    return [];
  }
  return names.flatMap((id) => {
    const path = join(root, id);
    if (!EXTENSION_ID.test(id) || !isDirectory(path) || !existsSync(join(path, "SKILL.md"))) return [];
    const { name, description } = frontmatter(join(path, "SKILL.md"));
    return [{ id, name: name ?? id, about: about(description), path }];
  });
}

export function installedExtensions(home: string = homedir()): { readonly plugins: readonly Extension[]; readonly skills: readonly Extension[] } {
  const byName = (a: Extension, b: Extension) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  return { plugins: plugins(home).sort(byName), skills: skills(home).sort(byName) };
}

const WRAPPER = "my-tiny-office-skills";

// The plugin folders a run is given: each chosen plugin as installed, and the
// chosen skills carried in one plugin of the app's own, made in the run's folder.
export function pluginDirs(chosen: Chosen | undefined, runFolder: string, home: string = homedir()): string[] {
  if (chosen === undefined) return [];
  const found = installedExtensions(home);
  const dirs = found.plugins.filter((p) => chosen.plugins.includes(p.id)).map((p) => p.path);
  const carried = found.skills.filter((s) => chosen.skills.includes(s.id));
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
