import type { ClaudeCodeStatus } from "../application/runtime-status";

import type { ClaudeWords } from "./claude-checks";
import { RecheckButton } from "./recheck-button";

// When Claude Code stops for the company, every screen says so first; the
// work and the memory are untouched and nothing new starts.
export function RuntimeNotice({ status, words }: { readonly status: ClaudeCodeStatus; readonly words: ClaudeWords }) {
  if (status.state === "ready") return null;
  const title = status.state === "signedOut" ? words.stoppedTitle : words.unavailableTitle;
  return (
    <div className="notice notice-stop" role="status">
      <span className="n-ic">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2v3.6M10 2v3.6M4.4 5.6h7.2v2.6a3.6 3.6 0 0 1-7.2 0z" />
          <path d="M8 11.8V14" />
        </svg>
      </span>
      <span className="n-tx">
        <b>{title}</b>
        <span>{words.stoppedWhy}</span>
      </span>
      <span className="n-acts">
        <RecheckButton label={words.recheck} busyLabel={words.checking} />
      </span>
    </div>
  );
}
