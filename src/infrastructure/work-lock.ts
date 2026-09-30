import { mkdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "work.pid";
// the holder touches the file every tick (five seconds); one untouched this long is left behind
const STALE_MS = 30_000;

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

function ownerOf(file: string, now: number): { readonly pid: number; readonly age: number } | undefined {
  try {
    const age = now - statSync(file).mtimeMs;
    return { pid: Number(readFileSync(file, "utf8").trim()), age };
  } catch (error) {
    if (code(error) === "ENOENT") return undefined;
    throw error;
  }
}

// One server works a data directory at a time: a second one would take the
// first one's runs for lost ones and start them again. The file names the
// process that works and is touched while it does; a pid alone cannot say,
// since a server stopped by force leaves it behind and pids are reused.
export function holdsWork(directory: string, pid: number = process.pid, now: number = Date.now()): boolean {
  const file = join(directory, FILE);
  const owner = ownerOf(file, now);
  if (owner?.pid === pid) {
    utimesSync(file, now / 1000, now / 1000);
    return true;
  }
  if (owner !== undefined && owner.age < STALE_MS) return false;
  mkdirSync(directory, { recursive: true });
  // written whole and moved into place, so two taking over never mix; the last one wins
  const temporary = `${file}.${pid}`;
  writeFileSync(temporary, String(pid));
  renameSync(temporary, file);
  return ownerOf(file, now)?.pid === pid;
}

export function releaseWork(directory: string, pid: number = process.pid): void {
  const file = join(directory, FILE);
  if (ownerOf(file, Date.now())?.pid === pid) rmSync(file, { force: true });
}
