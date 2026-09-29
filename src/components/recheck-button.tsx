"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { checkConnectorsAction, recheckClaudeCodeAction } from "../app/actions";
import type { ClaudeCodeStatus } from "../application/runtime-status";

const REFRESH = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.2 7A5.2 5.2 0 1 0 12 11.2" />
    <path d="M13.4 3.4v3.8h-3.8" />
  </svg>
);

// Asks again rather than trusting the last answer, and re-renders with it.
function RefreshButton({ label, busyLabel, doneLabel, disabled = false, act }: { readonly label: string; readonly busyLabel: string; readonly doneLabel: string; readonly disabled?: boolean; readonly act: () => Promise<void> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // it says it looked, so a check that found nothing new still reads as done
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-secondary btn-sm"
      type="button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          await act();
          setDone(true);
          router.refresh();
        })
      }
    >
      {REFRESH}
      <span>{pending ? busyLabel : done ? doneLabel : label}</span>
    </button>
  );
}

// 다시 확인 asks Claude Code again.
export function RecheckButton({ label, busyLabel, doneLabel, onChecked }: { readonly label: string; readonly busyLabel: string; readonly doneLabel: string; readonly onChecked?: (status: ClaudeCodeStatus) => void }) {
  return <RefreshButton label={label} busyLabel={busyLabel} doneLabel={doneLabel} act={async () => onChecked?.(await recheckClaudeCodeAction())} />;
}

// Asks the account which connectors it has; it takes a short Claude session.
export function ConnectorCheckButton({ label, busyLabel, doneLabel, failed, disabled }: { readonly label: string; readonly busyLabel: string; readonly doneLabel: string; readonly failed: string; readonly disabled: boolean }) {
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <>
      <RefreshButton label={label} busyLabel={busyLabel} doneLabel={doneLabel} disabled={disabled} act={async () => setError((await checkConnectorsAction()).ok ? undefined : failed)} />
      {error !== undefined && (
        <span className="hint" role="alert" style={{ margin: 0 }}>
          {error}
        </span>
      )}
    </>
  );
}
