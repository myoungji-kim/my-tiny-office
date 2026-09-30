import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "work.pid";

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // it exists, only not ours to signal
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
};

// One server works a data directory at a time: a second one would take the
// first one's runs for lost ones and start them again. The file names the
// process that works; one left by a process that is gone is taken over.
// ponytail: a pid reused by an unrelated process keeps the lock until it exits.
export function holdsWork(directory: string, pid: number = process.pid): boolean {
  const file = join(directory, FILE);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(directory, { recursive: true });
      writeFileSync(file, String(pid), { flag: "wx" });
      return true;
    } catch {
      let owner: number;
      try {
        owner = Number(readFileSync(file, "utf8").trim());
      } catch {
        continue;
      }
      if (owner === pid) return true;
      if (Number.isInteger(owner) && owner > 0 && alive(owner)) return false;
      rmSync(file, { force: true });
    }
  }
  return false;
}

export function releaseWork(directory: string, pid: number = process.pid): void {
  const file = join(directory, FILE);
  try {
    if (Number(readFileSync(file, "utf8").trim()) === pid) rmSync(file, { force: true });
  } catch {
    // never held
  }
}
