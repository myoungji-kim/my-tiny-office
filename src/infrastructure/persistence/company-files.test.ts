import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import { toCompanyId } from "../../domain/ids";
import { createAppContext } from "../app-context";

import { createCompanyFiles, type CompanyFiles } from "./company-files";
import { resolveDataDirectory } from "./data-directory";
import { readSettings, writeSettings } from "./settings";

let directory: string;
let files: CompanyFiles;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "my-tiny-office-"));
  files = createCompanyFiles(directory);
});

afterEach(() => {
  files.close();
  rmSync(directory, { recursive: true, force: true });
});

describe("company files", () => {
  it("lists only files named by a company id", () => {
    const id = toCompanyId(randomUUID());
    files.create(id);
    mkdirSync(join(directory, "companies"), { recursive: true });
    writeFileSync(join(directory, "companies", "notes.db"), "");

    expect(files.ids()).toEqual([id]);
  });

  it("refuses an id that could name a path", () => {
    for (const id of ["../outside", "a/b", "..\\x", "", "C:\\evil"]) {
      expect(files.has(id)).toBe(false);
      expect(() => files.create(toCompanyId(id))).toThrow();
    }
  });

  it("opens only a company that already has a file", () => {
    const id = toCompanyId(randomUUID());

    expect(() => files.open(id)).toThrow();
    files.create(id);
    expect(() => files.open(id)).not.toThrow();
    expect(() => files.create(id)).toThrow();
  });
});

describe("a company's file", () => {
  it("is copied whole while open, and removed with nothing left behind", async () => {
    const id = toCompanyId(randomUUID());
    const handle = files.create(id);
    await createCompany(createAppContext(handle), { id, name: "TinySoft" });
    const copy = join(directory, "copy.db");

    handle.copyTo(copy);
    files.remove(id);

    expect(files.has(id)).toBe(false);
    expect(readdirSync(join(directory, "companies"))).toEqual([]);
    expect(existsSync(copy)).toBe(true);
  });
});

describe("settings", () => {
  it("reads nothing from a missing or broken file", () => {
    expect(readSettings(directory)).toEqual({});
    writeFileSync(join(directory, "settings.json"), "{not json");
    expect(readSettings(directory)).toEqual({});
  });

  it("keeps only values it understands", () => {
    writeFileSync(join(directory, "settings.json"), JSON.stringify({ locale: "fr", lastCompanyId: "../x", extra: 1 }));
    expect(readSettings(directory)).toEqual({});
  });

  it("keeps what the connector check found, and only names a connector could have", () => {
    writeFileSync(join(directory, "settings.json"), JSON.stringify({ connectors: { checkedAt: 5, servers: ["claude_ai_Atlassian_Rovo", "bad name", "a__b", 3] } }));
    expect(readSettings(directory)).toEqual({ connectors: { checkedAt: 5, servers: ["claude_ai_Atlassian_Rovo"] } });
    writeFileSync(join(directory, "settings.json"), JSON.stringify({ connectors: { servers: [] } }));
    expect(readSettings(directory)).toEqual({});
  });

  it("round-trips what it writes", () => {
    const lastCompanyId = randomUUID();
    writeSettings(directory, { lastCompanyId, locale: "en" });
    expect(readSettings(directory)).toEqual({ lastCompanyId, locale: "en" });
  });
});

describe("data directory", () => {
  it("honours the override, relative or absolute", () => {
    expect(resolveDataDirectory({ MY_TINY_OFFICE_DATA_DIR: "/data/mto" }, "linux", "/home/u")).toBe("/data/mto");
  });

  it("ignores an empty or relative system path, which would land in the project folder", () => {
    expect(resolveDataDirectory({ LOCALAPPDATA: "" }, "win32", "C:/Users/u")).toBe(join("C:/Users/u", "AppData", "Local", "my-tiny-office"));
    expect(resolveDataDirectory({ XDG_DATA_HOME: "data" }, "linux", "/home/u")).toBe(join("/home/u", ".local", "share", "my-tiny-office"));
  });

  it("uses the platform's per-user data directory", () => {
    expect(resolveDataDirectory({ LOCALAPPDATA: "C:/Users/u/AppData/Local" }, "win32", "C:/Users/u")).toBe(join("C:/Users/u/AppData/Local", "my-tiny-office"));
    expect(resolveDataDirectory({}, "darwin", "/Users/u")).toBe(join("/Users/u", "Library", "Application Support", "my-tiny-office"));
    expect(resolveDataDirectory({}, "linux", "/home/u")).toBe(join("/home/u", ".local", "share", "my-tiny-office"));
  });
});
