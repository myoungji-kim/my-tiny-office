"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { recheckClaudeCodeAction } from "../app/actions";
import type { ClaudeCodeStatus } from "../application/runtime-status";

// 다시 확인 asks Claude Code again and re-renders with the answer.
export function RecheckButton({
  label,
  busyLabel,
  size = "sm",
  onChecked,
}: {
  readonly label: string;
  readonly busyLabel: string;
  readonly size?: "sm";
  readonly onChecked?: (status: ClaudeCodeStatus) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className={`btn btn-secondary btn-${size}`}
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const status = await recheckClaudeCodeAction();
          onChecked?.(status);
          router.refresh();
        })
      }
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.2 7A5.2 5.2 0 1 0 12 11.2" />
        <path d="M13.4 3.4v3.8h-3.8" />
      </svg>
      <span>{pending ? busyLabel : label}</span>
    </button>
  );
}
