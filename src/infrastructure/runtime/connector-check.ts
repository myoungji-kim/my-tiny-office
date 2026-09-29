import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findExecutable, runProcess } from "../process/run";

// A connector's tools are named mcp__<server>__<tool>; the server is what the check keeps.
export const SERVER_NAME = /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*$/;
const TOOL = /^mcp__([A-Za-z0-9]+(?:_[A-Za-z0-9]+)*)__[A-Za-z0-9_]+$/;

const CHECK_TIMEOUT_MS = 180_000;

// A session that can only look: ToolSearch and nothing else, in an empty
// folder, capped low (SECURITY.md §8).
export const checkArgs = (): string[] => [
  "-p",
  "--output-format",
  "stream-json",
  "--verbose",
  "--permission-mode",
  "dontAsk",
  "--setting-sources",
  "project",
  "--settings",
  JSON.stringify({ autoMemoryEnabled: false, disableAllHooks: true }),
  "--disable-slash-commands",
  "--tools",
  "ToolSearch",
  "--allowedTools",
  "ToolSearch",
  "--max-budget-usd",
  "0.5",
];

// The first search gives the connectors, which join after a turn, time to arrive.
const PROMPT = [
  "Only look; call no tool but ToolSearch.",
  "1. Call ToolSearch with the query `mcp` and max_results 1.",
  "2. Then, for each distinct server among the tools whose names start with mcp__ (the part between mcp__ and the next __), call ToolSearch once with `select:` and one tool of that server.",
  "Reply with one word: done.",
].join("\n");

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null;

// The servers ToolSearch itself answered with, never what the model wrote.
export function serversIn(stdout: string): { readonly servers: readonly string[]; readonly finished: boolean } {
  const servers = new Set<string>();
  let finished = false;
  for (const line of stdout.split("\n")) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject(event)) continue;
    if (event.type === "result") finished = event.subtype === "success" && event.is_error !== true;
    if (event.type !== "user" || !isObject(event.message) || !Array.isArray(event.message.content)) continue;
    for (const block of event.message.content) {
      if (!isObject(block) || block.type !== "tool_result" || !Array.isArray(block.content)) continue;
      for (const ref of block.content) {
        const name = isObject(ref) && ref.type === "tool_reference" && typeof ref.tool_name === "string" ? TOOL.exec(ref.tool_name)?.[1] : undefined;
        if (name !== undefined) servers.add(name);
      }
    }
  }
  return { servers: [...servers].sort(), finished };
}

export async function checkConnectors(): Promise<{ readonly ok: true; readonly servers: readonly string[] } | { readonly ok: false }> {
  const claude = findExecutable("claude");
  if (claude.kind !== "found") return { ok: false };
  const folder = mkdtempSync(join(tmpdir(), "my-tiny-office-check-"));
  try {
    const run = await runProcess(claude.path, checkArgs(), { cwd: folder, input: PROMPT, timeoutMs: CHECK_TIMEOUT_MS });
    const { servers, finished } = serversIn(run.stdout);
    return finished ? { ok: true, servers } : { ok: false };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
