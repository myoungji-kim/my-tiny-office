import { isReady } from "../application/runtime-status";
import { createWorkSupervisor, type WorkSupervisor } from "../application/work";

import { createAppContext } from "./app-context";
import { getCompanyFiles } from "./persistence/company-files";
import { readSettings } from "./persistence/settings";
import { claudeCodeStatus } from "./runtime/claude-code-status";
import { claudeCodeRuntime } from "./runtime/claude-code-run";
import { gitWorkspace } from "./workspace/git";

const TICK_MS = 5_000;

// One supervisor for the server's life, over every company on this computer.
// Cached on globalThis so a development reload keeps the runs it started.
const cache = globalThis as typeof globalThis & { myTinyOfficeWork?: WorkSupervisor; myTinyOfficeWorkTimer?: NodeJS.Timeout };

export function getWork(): WorkSupervisor {
  cache.myTinyOfficeWork ??= createWorkSupervisor({
    runtime: claudeCodeRuntime,
    workspace: gitWorkspace,
    companies: () => {
      const files = getCompanyFiles();
      return files.ids().map((companyId) => ({ companyId, ctx: createAppContext(files.open(companyId)) }));
    },
    ready: async () => isReady(await claudeCodeStatus()),
    picksUp: () => readSettings(getCompanyFiles().directory).workPaused !== true,
    onError: (error) => console.error("[work]", error),
  });
  return cache.myTinyOfficeWork;
}

export function startWork(): void {
  if (cache.myTinyOfficeWorkTimer !== undefined) return;
  cache.myTinyOfficeWorkTimer = setInterval(() => void getWork().kick(), TICK_MS);
  cache.myTinyOfficeWorkTimer.unref();
  // A run is a child of the server: when the server goes, so do its agents.
  process.once("exit", () => getWork().stopAll());
  void getWork().kick();
}
