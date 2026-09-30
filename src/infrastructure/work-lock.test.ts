import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { holdsWork, releaseWork, workingElsewhere } from "./work-lock";

let directory: string;
beforeEach(() => void (directory = mkdtempSync(join(tmpdir(), "mto-lock-"))));
afterEach(() => rmSync(directory, { recursive: true, force: true }));

// a live process that is not this one
const OTHER = process.ppid;

describe("holdsWork", () => {
  it("lets one server work a data directory, and the next once the first lets go", () => {
    expect(holdsWork(directory)).toBe(true);
    expect(holdsWork(directory)).toBe(true);
    expect(holdsWork(directory, OTHER)).toBe(false);

    releaseWork(directory);
    expect(holdsWork(directory, OTHER)).toBe(true);
  });

  it("takes over a lock nobody has touched for a while, whoever its pid now is", () => {
    writeFileSync(join(directory, "work.pid"), String(process.ppid));
    const minuteAgo = (Date.now() - 60_000) / 1000;
    utimesSync(join(directory, "work.pid"), minuteAgo, minuteAgo);

    expect(holdsWork(directory)).toBe(true);
    expect(readFileSync(join(directory, "work.pid"), "utf8")).toBe(String(process.pid));
  });

  it("tells another server that the work runs elsewhere, and never takes it by looking", () => {
    expect(workingElsewhere(directory, OTHER)).toBe(false);
    expect(holdsWork(directory)).toBe(true);
    expect(workingElsewhere(directory)).toBe(false);
    expect(workingElsewhere(directory, OTHER)).toBe(true);
    expect(readFileSync(join(directory, "work.pid"), "utf8")).toBe(String(process.pid));
  });

  it("takes over at once from a process that is gone", () => {
    writeFileSync(join(directory, "work.pid"), "999999999");
    expect(holdsWork(directory)).toBe(true);
  });

  it("creates the data directory it is given", () => {
    expect(holdsWork(join(directory, "new"))).toBe(true);
  });
});
