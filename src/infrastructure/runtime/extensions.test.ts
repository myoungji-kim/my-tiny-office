import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { installedExtensions, pluginDirs, projectExtensions } from "./extensions";

let home: string;
let run: string;
let project: string;

const write = (path: string, text: string) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
};

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "mto-home-"));
  run = mkdtempSync(join(tmpdir(), "mto-run-"));
  project = mkdtempSync(join(tmpdir(), "mto-project-"));
  const plugins = join(home, ".claude", "plugins");
  const ponytail = join(plugins, "cache", "ponytail", "4.10.0");
  const outside = mkdtempSync(join(tmpdir(), "mto-outside-"));
  write(join(ponytail, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "ponytail", description: "Lazy senior developer." }));
  write(
    join(plugins, "installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: {
        "ponytail@ponytail": [{ scope: "user", installPath: ponytail }],
        "elsewhere@x": [{ scope: "user", installPath: outside }],
        "project-only@x": [{ scope: "project", installPath: ponytail }],
        "payments-kit@tinysoft": [{ scope: "user", installPath: outside }, { scope: "local", installPath: ponytail, projectPath: project }],
      },
    }),
  );
  write(join(home, ".claude", "skills", "minimalist-ui", "SKILL.md"), "---\nname: minimalist-ui\ndescription: Clean editorial interfaces.\n---\n\n# Protocol");
  write(join(home, ".claude", "skills", "minimalist-ui", "notes.md"), "more");
  mkdirSync(join(home, ".claude", "skills", "not-a-skill"));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(run, { recursive: true, force: true });
  rmSync(project, { recursive: true, force: true });
});

describe("the user's plugins and skills", () => {
  it("are what Claude Code installed for the user, where it keeps them, and folders with a SKILL.md", () => {
    const found = installedExtensions(home);

    expect(found.plugins).toEqual([{ id: "ponytail@ponytail", name: "ponytail", about: "Lazy senior developer.", path: join(home, ".claude", "plugins", "cache", "ponytail", "4.10.0") }]);
    expect(found.skills).toEqual([{ id: "minimalist-ui", name: "minimalist-ui", about: "Clean editorial interfaces.", path: join(home, ".claude", "skills", "minimalist-ui") }]);
  });

  it("is nothing on a computer without Claude Code's folders", () => {
    expect(installedExtensions(join(home, "nobody"))).toEqual({ plugins: [], skills: [] });
  });

  it("gives a run each chosen plugin, and the chosen skills in one plugin of the app's own", () => {
    const dirs = pluginDirs({ plugins: ["ponytail@ponytail", "elsewhere@x"], skills: ["minimalist-ui"] }, undefined, run, { plugins: true }, home);

    expect(dirs).toEqual([join(home, ".claude", "plugins", "cache", "ponytail", "4.10.0"), join(run, "my-tiny-office-skills")]);
    expect(JSON.parse(readFileSync(join(run, "my-tiny-office-skills", ".claude-plugin", "plugin.json"), "utf8"))).toMatchObject({ name: "my-tiny-office-skills" });
    expect(existsSync(join(run, "my-tiny-office-skills", "skills", "minimalist-ui", "notes.md"))).toBe(true);
    expect(pluginDirs(undefined, undefined, run, { plugins: true }, home)).toEqual([]);
    // a connector project would start a plugin's MCP servers, so it gets the skills alone
    expect(pluginDirs({ plugins: ["ponytail@ponytail"], skills: ["minimalist-ui"] }, undefined, run, { plugins: false }, home)).toEqual([join(run, "my-tiny-office-skills")]);
  });
});

describe("a project's own plugins and skills", () => {
  beforeEach(() => {
    write(join(project, ".claude", "skills", "release-notes", "SKILL.md"), "---\nname: release-notes\ndescription: Our release notes.\n---\n");
    write(join(project, ".claude", "skills", "minimalist-ui", "SKILL.md"), "---\nname: minimalist-ui\n---\nthe project's own");
  });

  it("are the skills in its folder and the plugins installed for that folder alone", () => {
    const found = projectExtensions(project, home);

    expect(found.plugins.map((p) => p.id)).toEqual(["payments-kit@tinysoft"]);
    expect(found.skills.map((s) => s.id)).toEqual(["minimalist-ui", "release-notes"]);
  });

  it("gives its skills unless turned off, from its folder, and its plugins only once turned on", () => {
    const own = { folder: project, skillsOff: ["release-notes"], pluginsOn: [] };
    const skill = (id: string) => join(run, "my-tiny-office-skills", "skills", id, "SKILL.md");

    expect(pluginDirs({ plugins: [], skills: ["minimalist-ui"] }, own, run, { plugins: true }, home)).toEqual([join(run, "my-tiny-office-skills")]);
    expect(existsSync(skill("release-notes"))).toBe(false);
    // the project's own stands in for the user's skill of the same name
    expect(readFileSync(skill("minimalist-ui"), "utf8")).toContain("the project's own");

    const withPlugin = pluginDirs(undefined, { ...own, pluginsOn: ["payments-kit@tinysoft"] }, run, { plugins: true }, home);
    expect(withPlugin[0]).toBe(join(home, ".claude", "plugins", "cache", "ponytail", "4.10.0"));
  });
});
