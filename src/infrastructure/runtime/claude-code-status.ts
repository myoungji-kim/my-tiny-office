import { findExecutable, runProcess, type Executable, type RunResult } from "../process/run";

// Whether the company can work at all: Claude Code is found, runs, and is
// signed in on its own. The app only looks; signing in happens in a terminal.
export type ClaudeCodeStatus =
  | { readonly state: "notInstalled" }
  // installed through npm as a .cmd, which cannot be run without a shell
  | { readonly state: "shimOnly"; readonly path: string }
  // found but would not run
  | { readonly state: "broken"; readonly path: string }
  | { readonly state: "signedOut"; readonly version: string }
  | { readonly state: "ready"; readonly version: string; readonly plan: string | undefined };

export interface StatusDeps {
  readonly find: () => Executable;
  readonly run: (file: string, args: readonly string[]) => Promise<RunResult>;
}

const TIMEOUT_MS = 15_000;

const realDeps: StatusDeps = {
  find: () => findExecutable("claude"),
  run: (file, args) => runProcess(file, args, { timeoutMs: TIMEOUT_MS }),
};

// Only whether it is signed in, how, and on what plan; the email and
// organisation it also prints are never read.
function readAuth(stdout: string): { loggedIn: boolean; plan: string | undefined } {
  try {
    const raw: unknown = JSON.parse(stdout);
    if (typeof raw !== "object" || raw === null) return { loggedIn: false, plan: undefined };
    const { loggedIn, subscriptionType } = raw as Record<string, unknown>;
    return {
      loggedIn: loggedIn === true,
      plan: typeof subscriptionType === "string" && /^[\w-]{1,32}$/.test(subscriptionType) ? subscriptionType : undefined,
    };
  } catch {
    return { loggedIn: false, plan: undefined };
  }
}

export async function checkClaudeCode(deps: StatusDeps = realDeps): Promise<ClaudeCodeStatus> {
  const found = deps.find();
  if (found.kind === "missing") return { state: "notInstalled" };
  if (found.kind === "shim") return { state: "shimOnly", path: found.path };

  let version: string | undefined;
  try {
    const result = await deps.run(found.path, ["--version"]);
    version = result.code === 0 ? /\d+\.\d+\.\d+/.exec(result.stdout)?.[0] : undefined;
  } catch {
    version = undefined;
  }
  if (version === undefined) return { state: "broken", path: found.path };

  try {
    const auth = readAuth((await deps.run(found.path, ["auth", "status", "--json"])).stdout);
    return auth.loggedIn ? { state: "ready", version, plan: auth.plan } : { state: "signedOut", version };
  } catch {
    return { state: "signedOut", version };
  }
}

export const isReady = (status: ClaudeCodeStatus): boolean => status.state === "ready";

// Checking runs two processes, so a page load reuses a recent answer; 다시 확인
// asks again.
const FRESH_FOR_MS = 30_000;
const cache = globalThis as typeof globalThis & { myTinyOfficeClaude?: { at: number; status: Promise<ClaudeCodeStatus> } };

export function claudeCodeStatus({ refresh = false, now = Date.now() } = {}): Promise<ClaudeCodeStatus> {
  const cached = cache.myTinyOfficeClaude;
  if (!refresh && cached !== undefined && now - cached.at < FRESH_FOR_MS) return cached.status;
  const status = checkClaudeCode();
  cache.myTinyOfficeClaude = { at: now, status };
  return status;
}
