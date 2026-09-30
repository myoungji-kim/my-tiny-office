import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { holdsWork, releaseWork } from "./work-lock";

let directory: string;
beforeEach(() => void (directory = mkdtempSync(join(tmpdir(), "mto-lock-"))));
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("holdsWork", () => {
  it("lets one server work a data directory, and the next once the first is gone", () => {
    expect(holdsWork(directory)).toBe(true);
    expect(holdsWork(directory)).toBe(true);
    // the test runner's parent is alive and is not us
    expect(holdsWork(directory, process.ppid)).toBe(false);

    releaseWork(directory);
    expect(holdsWork(directory, process.ppid)).toBe(true);
  });

  it("takes over from a process that is gone", () => {
    writeFileSync(join(directory, "work.pid"), "999999999");
    expect(holdsWork(directory)).toBe(true);
    expect(readFileSync(join(directory, "work.pid"), "utf8")).toBe(String(process.pid));
  });
});
