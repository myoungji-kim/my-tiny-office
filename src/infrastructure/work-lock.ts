import { mkdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "work.pid";
// the holder touches the file every tick (five seconds); one untouched this long is left behind
const STALE_MS = 30_000;

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // it exists, only not ours to signal
    return code(error) === "EPERM";
  }
};

// held while its process lives and it is touched; a pid reused by another
// program still goes stale, since nothing touches the file any more
const held = (owner: { readonly pid: number; readonly age: number }) => owner.age < STALE_MS && owner.pid > 0 && alive(owner.pid);

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
// process that works and is touched while it does. One left by a process
// that is gone is taken over at once.
export function holdsWork(directory: string, pid: number = process.pid, now: number = Date.now()): boolean {
  const file = join(directory, FILE);
  const owner = ownerOf(file, now);
  if (owner?.pid === pid) {
    utimesSync(file, now / 1000, now / 1000);
    return true;
  }
  if (owner !== undefined && held(owner)) return false;
  mkdirSync(directory, { recursive: true });
  // written whole and moved into place, so two taking over never mix; the last one wins
  const temporary = `${file}.${pid}`;
  writeFileSync(temporary, String(pid));
  renameSync(temporary, file);
  return ownerOf(file, now)?.pid === pid;
}

// Whether another live server holds the work, looked at without taking it.
export function workingElsewhere(directory: string, pid: number = process.pid, now: number = Date.now()): boolean {
  const owner = ownerOf(join(directory, FILE), now);
  return owner !== undefined && owner.pid !== pid && held(owner);
}

export function releaseWork(directory: string, pid: number = process.pid): void {
  const file = join(directory, FILE);
  if (ownerOf(file, Date.now())?.pid === pid) rmSync(file, { force: true });
}
