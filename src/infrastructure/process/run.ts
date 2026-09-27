import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";

// Every outside program — claude, git — is started from a file and an argument
// array, never through a shell, so nothing the user or an agent wrote can be
// read as shell syntax.

export type Executable =
  | { readonly kind: "found"; readonly path: string }
  // A .cmd or .bat can only be run through cmd.exe, which re-parses its
  // arguments, so it is refused rather than run through a shell.
  | { readonly kind: "shim"; readonly path: string }
  | { readonly kind: "missing" };

const SHIMS = new Set([".cmd", ".bat"]);

export function findExecutable(
  name: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
  platform: NodeJS.Platform = process.platform,
  exists: (path: string) => boolean = existsSync,
): Executable {
  const pathVar = env.PATH ?? env.Path ?? "";
  const dirs = pathVar.split(platform === "win32" ? ";" : ":").filter(Boolean);
  const exts =
    platform === "win32"
      ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean).map((e) => e.toLowerCase())
      : [""];
  const candidates = isAbsolute(name) ? [""] : dirs;

  // A native program anywhere on PATH wins over a shim that comes first.
  let shim: string | undefined;
  for (const dir of candidates) {
    for (const ext of exts) {
      const path = dir === "" ? name + ext : join(dir, name + ext);
      if (!exists(path)) continue;
      if (!SHIMS.has(extname(path).toLowerCase())) return { kind: "found", path };
      shim ??= path;
    }
  }
  return shim === undefined ? { kind: "missing" } : { kind: "shim", path: shim };
}

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
}

export function runProcess(file: string, args: readonly string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((settle, fail) => {
    const child = spawn(file, [...args], {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });

    const timer =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            child.kill();
          }, options.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      fail(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      settle({ code, stdout, stderr, timedOut });
    });

    child.stdin.on("error", () => undefined);
    child.stdin.end(options.input ?? "");
  });
}
