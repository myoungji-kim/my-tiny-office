"use client";

import { useState, useTransition } from "react";

import { diffAction } from "../app/project-actions";
import type { FileChange } from "../infrastructure/workspace/git";

// From the first hunk on: git's header lines say nothing the row above does not.
const hunks = (diff: string) => {
  const lines = diff.trimEnd().split("\n");
  const start = lines.findIndex((l) => l.startsWith("@@"));
  return start < 0 ? lines : lines.slice(start);
};

const lineClass =(line: string) => (line.startsWith("+") && !line.startsWith("+++") ? "d-add" : line.startsWith("-") && !line.startsWith("---") ? "d-del" : undefined);

// Each changed file opens its diff under it; the diff is shown as text, never run.
export function TaskChanges({ companyId, taskId, changes }: { readonly companyId: string; readonly taskId: string; readonly changes: readonly FileChange[] }) {
  const [open, setOpen] = useState<Readonly<Record<string, string>>>({});
  const [, start] = useTransition();
  const toggle = (path: string) => {
    if (open[path] !== undefined) return setOpen(Object.fromEntries(Object.entries(open).filter(([p]) => p !== path)));
    start(async () => {
      const diff = await diffAction(companyId, taskId, path);
      setOpen((now) => ({ ...now, [path]: diff }));
    });
  };
  return changes.map((c) => (
    <div key={c.path}>
      <button className="file" type="button" aria-expanded={open[c.path] !== undefined} onClick={() => toggle(c.path)}>
        <span className="file-path">{c.path}</span>
        <span className="file-add">+{c.added}</span>
        <span className="file-del">−{c.removed}</span>
      </button>
      {open[c.path] !== undefined && open[c.path] !== "" && (
        <pre className="diff">
          {hunks(open[c.path]).map((line, i) => (
            <span key={i} className={lineClass(line)}>
              {line}
              {"\n"}
            </span>
          ))}
        </pre>
      )}
    </div>
  ));
}
