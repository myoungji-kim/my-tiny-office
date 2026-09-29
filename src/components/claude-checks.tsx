"use client";

import { useState } from "react";

import type { ClaudeCodeStatus } from "../application/runtime-status";

export interface ClaudeWords {
  readonly installed: string;
  readonly signedIn: string;
  readonly signedOut: string;
  readonly signedOutWhy: string;
  readonly missing: string;
  readonly missingWhy: string;
  readonly shim: string;
  readonly shimWhy: string;
  readonly broken: string;
  readonly brokenWhy: string;
  readonly signInStep: string;
  readonly afterAbove: string;
  readonly recheck: string;
  readonly checking: string;
  readonly checkedNow: string;
  readonly copy: string;
  readonly copied: string;
  readonly stoppedTitle: string;
  readonly unavailableTitle: string;
  readonly stoppedWhy: string;
}

export interface Row {
  readonly icon: "ok" | "bad" | "wait";
  readonly title: string;
  readonly detail?: string;
  readonly value?: string;
  // what the user runs in a terminal; the app never runs it for them
  readonly command?: string;
}

export function rowsFor(status: ClaudeCodeStatus, w: ClaudeWords): Row[] {
  const waiting: Row = { icon: "wait", title: w.signInStep, detail: w.afterAbove };
  switch (status.state) {
    case "notInstalled":
      return [{ icon: "bad", title: w.missing, detail: w.missingWhy }, waiting];
    case "shimOnly":
      return [{ icon: "bad", title: w.shim, detail: w.shimWhy, command: "claude install" }, waiting];
    case "broken":
      return [{ icon: "bad", title: w.broken, detail: w.brokenWhy }, waiting];
    case "signedOut":
      return [
        { icon: "ok", title: w.installed, value: status.version },
        { icon: "bad", title: w.signedOut, detail: w.signedOutWhy, command: "claude auth login" },
      ];
    case "ready":
      return [
        { icon: "ok", title: w.installed, value: status.version },
        { icon: "ok", title: w.signedIn, value: status.plan },
      ];
  }
}

const ICON = {
  ok: <path d="M3.2 8.4l3.2 3.2L12.8 4.8" />,
  bad: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />,
  wait: <path d="M4 8h8" />,
};

function Command({ command, w }: { readonly command: string; readonly w: ClaudeWords }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cmd">
      <pre>
        <span className="p">$</span> {command}
      </pre>
      <button
        className="copy"
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(command).then(() => setCopied(true));
        }}
      >
        {copied ? w.copied : w.copy}
      </button>
    </div>
  );
}

export function ClaudeChecks({ status, words }: { readonly status: ClaudeCodeStatus; readonly words: ClaudeWords }) {
  return <CheckRows rows={rowsFor(status, words)} words={words} />;
}

export function CheckRows({ rows, words }: { readonly rows: readonly Row[]; readonly words: ClaudeWords }) {
  return (
    <div>
      {rows.map((row) => (
        <div key={row.title}>
          <div className="check">
            <span className={`c-ic ${row.icon}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                {ICON[row.icon]}
              </svg>
            </span>
            <span className="c-tx">
              <b>{row.title}</b>
              {row.detail !== undefined && <span>{row.detail}</span>}
            </span>
            {row.value !== undefined && <span className="c-val">{row.value}</span>}
          </div>
          {row.command !== undefined && <Command command={row.command} w={words} />}
        </div>
      ))}
    </div>
  );
}
