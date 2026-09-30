import { closeSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

// The Claude Code sessions held on this computer, as the plaza lists them
// (SECURITY.md §8b). Only Claude Code's session files are read, never written;
// nothing else under its folder is opened.

export interface Session {
  readonly id: string;
  readonly folder: string;
  readonly firstMessage: string;
  readonly messages: number;
  readonly from: number;
  readonly to: number;
  // written to in the last few minutes: someone is using it in a terminal
  readonly inUse: boolean;
}

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isSessionId = (id: string) => SESSION_ID.test(id);

const MIN_MESSAGES = 6;
const MAX_AGE_MS = 90 * 86_400_000;
const IN_USE_MS = 5 * 60_000;
const HEAD_BYTES = 256 * 1024;
const MAX_FIRST_MESSAGE = 200;
// the app's own runs: a task's worktree, and the folders it runs checks in
const OWN_FOLDER = /[\\/]\.worktrees[\\/][0-9a-f-]{36}([\\/]|$)|[\\/]my-tiny-office-(run|check|read)-[^\\/]*$/i;

export const claudeHome = (env: NodeJS.ProcessEnv = process.env, home: string = homedir()) => env.CLAUDE_CONFIG_DIR || join(home, ".claude");

type Line = Record<string, unknown>;
const parse = (raw: string): Line | undefined => {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null ? (value as Line) : undefined;
  } catch {
    return undefined;
  }
};

// What a person wrote, as opposed to a tool's answer or Claude Code's own notes.
export function spokenText(line: Line): string | undefined {
  if (line.isMeta === true || line.isSidechain === true) return undefined;
  const content = (line.message as Line | undefined)?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .filter((c): c is Line => typeof c === "object" && c !== null && (c as Line).type === "text")
            .map((c) => String(c.text ?? ""))
            .join("\n")
        : "";
  const trimmed = text.trim();
  // slash commands, their output and system reminders arrive as tagged text
  if (trimmed === "" || trimmed.startsWith("<") || trimmed.startsWith("Caveat:")) return undefined;
  return trimmed;
}

function head(path: string): string {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const read = readSync(fd, buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, read).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

const NEWLINE = 0x0a;
const USER = Buffer.from('"type":"user"');
const ASSISTANT = Buffer.from('"type":"assistant"');
const TEXT = Buffer.from('"type":"text"');
const TOOL_RESULT = Buffer.from('"tool_result"');

// What was said, by either side, in order. Decoding and parsing are what
// cost, and tool output is most of a transcript, so lines are looked at as
// bytes and only one that can be something said is decoded and parsed.
export function* said(bytes: Buffer): Generator<{ readonly who: "user" | "assistant"; readonly text: string }> {
  for (let start = 0; start < bytes.length; ) {
    const end = bytes.indexOf(NEWLINE, start);
    const stop = end === -1 ? bytes.length : end;
    const raw = bytes.subarray(start, stop);
    start = stop + 1;
    const maybe = raw.includes(USER) ? !raw.includes(TOOL_RESULT) : raw.includes(ASSISTANT) && raw.includes(TEXT);
    if (!maybe) continue;
    const line = parse(raw.toString("utf8"));
    if (line === undefined || (line.type !== "user" && line.type !== "assistant")) continue;
    const text = spokenText(line);
    if (text !== undefined) yield { who: line.type, text };
  }
}

// the count needs the whole file, so it is kept until the file changes
const counted = new Map<string, { readonly size: number; readonly mtime: number; readonly messages: number }>();
function messagesIn(path: string, size: number, mtime: number): number {
  const known = counted.get(path);
  if (known !== undefined && known.size === size && known.mtime === mtime) return known.messages;
  let messages = 0;
  for (const _said of said(readFileSync(path))) messages += 1;
  counted.set(path, { size, mtime, messages });
  return messages;
}

function read(path: string, now: number): Session | undefined {
  const id = basename(path, ".jsonl");
  if (!isSessionId(id)) return undefined;
  const { size, mtimeMs } = statSync(path);
  if (now - mtimeMs > MAX_AGE_MS) return undefined;

  let folder: string | undefined;
  let from: number | undefined;
  let firstMessage: string | undefined;
  // the last line of the head may be cut, and is simply not read
  for (const raw of head(path).split("\n").slice(0, -1)) {
    const line = parse(raw);
    if (line === undefined) continue;
    // run by a program (claude -p), not by a person: this app's own agents among them
    if (typeof line.entrypoint === "string" && line.entrypoint.startsWith("sdk")) return undefined;
    if (folder === undefined && typeof line.cwd === "string") folder = line.cwd;
    if (from === undefined && typeof line.timestamp === "string") from = Date.parse(line.timestamp) || undefined;
    if (firstMessage === undefined && line.type === "user") firstMessage = spokenText(line);
    if (folder !== undefined && from !== undefined && firstMessage !== undefined) break;
  }
  if (folder === undefined || firstMessage === undefined || OWN_FOLDER.test(folder)) return undefined;

  const messages = messagesIn(path, size, mtimeMs);
  if (messages < MIN_MESSAGES) return undefined;
  return {
    id,
    folder,
    firstMessage: firstMessage.length > MAX_FIRST_MESSAGE ? firstMessage.slice(0, MAX_FIRST_MESSAGE - 1) + "…" : firstMessage,
    messages,
    from: from ?? mtimeMs,
    to: mtimeMs,
    inUse: now - mtimeMs < IN_USE_MS,
  };
}

// Most recently written first. A file that cannot be read is left out.
export function listSessions(root: string = join(claudeHome(), "projects"), now: number = Date.now()): Session[] {
  let dirs: string[];
  try {
    dirs = readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(root, d.name));
  } catch {
    return [];
  }
  const sessions: Session[] = [];
  for (const dir of dirs) {
    let files: string[];
    try {
      files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const session = read(join(dir, file), now);
        if (session !== undefined) sessions.push(session);
      } catch {
        // gone or unreadable meanwhile
      }
    }
  }
  return sessions.sort((a, b) => b.to - a.to);
}

export function readSession(id: string, root: string = join(claudeHome(), "projects"), now: number = Date.now()): Session | undefined {
  const path = sessionFile(id, root);
  try {
    return path === undefined ? undefined : read(path, now);
  } catch {
    return undefined;
  }
}

// Where a session's file is, found by its id alone.
export function sessionFile(id: string, root: string = join(claudeHome(), "projects")): string | undefined {
  if (!isSessionId(id)) return undefined;
  try {
    for (const d of readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const path = join(root, d.name, id + ".jsonl");
      try {
        if (statSync(path).isFile()) return path;
      } catch {
        // not in this folder
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}
