import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { extname, join, posix, win32 } from "node:path";

// Every outside program — claude, git — is started from a file and an argument
// array, never through a shell, so nothing the user or an agent wrote can be
// read as shell syntax.

export type Executable =
  | { readonly kind: "found"; readonly path: string }
  // A .cmd or .bat can only be run through cmd.exe, which re-parses its
  // arguments, so it is refused rather than run through a shell.
  | { readonly kind: "shim"; readonly path: string }
  | { readonly kind: "missing" };

const NATIVE = new Set([".exe", ".com"]);
const SHIMS = new Set([".cmd", ".bat"]);

function isRunnableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    if (process.platform !== "win32") accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findExecutable(
  name: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = isRunnableFile,
): Executable {
  // A relative PATH entry would resolve against whatever folder the program
  // runs in — a task's worktree, which an agent can write to.
  const { isAbsolute } = platform === "win32" ? win32 : posix;
  const dirs = (env.PATH ?? env.Path ?? "").split(platform === "win32" ? ";" : ":").filter((dir) => dir !== "" && isAbsolute(dir));
  const candidates = isAbsolute(name) ? [""] : dirs;
  const exts = platform === "win32" ? [".exe", ".com", ".cmd", ".bat"] : [""];

  // A native program anywhere on PATH wins over a shim that comes first.
  let shim: string | undefined;
  for (const dir of candidates) {
    for (const ext of exts) {
      const path = dir === "" ? name + ext : join(dir, name + ext);
      if (!exists(path)) continue;
      const kind = extname(path).toLowerCase();
      if (platform !== "win32" || NATIVE.has(kind)) return { kind: "found", path };
      if (SHIMS.has(kind)) shim ??= path;
    }
  }
  return shim === undefined ? { kind: "missing" } : { kind: "shim", path: shim };
}

// Claude Code signs in on its own; an API key in the server's environment
// would silently bill that key instead, so none reaches a child.
const WITHHELD = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"];

export function childEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const copy = { ...env };
  for (const name of WITHHELD) delete copy[name];
  return copy;
}

export const MAX_OUTPUT = 8 * 1024 * 1024;

export interface RunOptions {
  readonly cwd?: string;
  readonly input?: string;
  readonly timeoutMs?: number;
}

export interface RunResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly truncated: boolean;
}

// Stops the program and everything it started.
function killTree(pid: number): void {
  if (process.platform === "win32") {
    spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

export function runProcess(file: string, args: readonly string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((settle, fail) => {
    const child = spawn(file, [...args], {
      cwd: options.cwd,
      env: childEnvironment(),
      shell: false,
      windowsHide: true,
      // its own process group on POSIX, so a timeout can stop its children too
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let truncated = false;
    let timedOut = false;
    let done = false;
    const collect = (into: "out" | "err") => (chunk: string) => {
      const current = into === "out" ? stdout : stderr;
      const room = MAX_OUTPUT - current.length;
      if (room <= 0) return void (truncated = true);
      if (chunk.length > room) truncated = true;
      if (into === "out") stdout += chunk.slice(0, room);
      else stderr += chunk.slice(0, room);
    };
    child.stdout.setEncoding("utf8").on("data", collect("out"));
    child.stderr.setEncoding("utf8").on("data", collect("err"));

    const finish = (code: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      settle({ code, stdout, stderr, timedOut, truncated });
    };

    const timer =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            if (child.pid !== undefined) killTree(child.pid);
          }, options.timeoutMs);

    child.on("error", (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fail(error);
    });
    // After a timeout a grandchild may still hold the pipes open, so the
    // program's own exit is enough to return.
    child.on("exit", (code) => {
      if (!timedOut) return;
      child.stdout.destroy();
      child.stderr.destroy();
      finish(code);
    });
    child.on("close", (code) => finish(code));

    child.stdin.on("error", () => undefined);
    child.stdin.end(options.input ?? "");
  });
}
