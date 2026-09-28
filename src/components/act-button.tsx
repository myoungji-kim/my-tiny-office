"use client";

import { useState, useTransition } from "react";

import type { Outcome } from "../app/action-context";

// One button, one server action already bound to what it acts on.
export function ActButton({
  action,
  label,
  disabled = false,
  errors,
  className = "btn btn-secondary btn-sm",
}: {
  readonly action: () => Promise<Outcome>;
  readonly label: string;
  readonly disabled?: boolean;
  readonly errors: Readonly<Record<string, string>>;
  readonly className?: string;
}) {
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        className={className}
        type="button"
        disabled={disabled || pending}
        onClick={() =>
          start(async () => {
            const result = await action();
            setError(result.error === undefined ? undefined : (errors[result.error] ?? errors.unknown));
          })
        }
      >
        {label}
      </button>
      {error !== undefined && (
        <span className="hint" role="alert" style={{ margin: 0, maxWidth: 280, textAlign: "right" }}>
          {error}
        </span>
      )}
    </span>
  );
}
