import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkFolder } from "./folder";

let root: string;

beforeEach(() => {
  root = realpathSync.native(mkdtempSync(join(tmpdir(), "mto-folder-")));
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("checkFolder", () => {
  it("takes only an absolute path to a folder that exists", () => {
    writeFileSync(join(root, "file.txt"), "x");

    expect(checkFolder("relative/path")).toEqual({ ok: false, reason: "folderNotAbsolute" });
    expect(checkFolder(join(root, "missing"))).toEqual({ ok: false, reason: "folderNotFound" });
    expect(checkFolder(join(root, "file.txt"))).toEqual({ ok: false, reason: "folderNotFound" });
  });

  it("resolves the path it will use", () => {
    mkdirSync(join(root, "app"));

    expect(checkFolder(`  ${join(root, "app", "..", "app")}  `)).toEqual({ ok: true, folder: join(root, "app"), scripts: [] });
  });

  it("reads ~ as the home folder, and only at the start", () => {
    mkdirSync(join(root, "code"));

    expect(checkFolder("~/code", root)).toMatchObject({ ok: true, folder: join(root, "code") });
    expect(checkFolder("~other", root)).toEqual({ ok: false, reason: "folderNotAbsolute" });
  });

  it("starts the commands from package.json, leaving out any that could not be one plain command", () => {
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { test: "vitest", lint: "eslint .", "a;b": "x", "e2e*": "y" } }));

    expect(checkFolder(root)).toMatchObject({ ok: true, scripts: ["npm test", "npm run lint"] });
  });

  it("offers nothing from a package.json it cannot read", () => {
    writeFileSync(join(root, "package.json"), "{ not json");

    expect(checkFolder(root)).toMatchObject({ ok: true, scripts: [] });
  });
});
