"use client";

import { useActionState, type ReactNode } from "react";

import type { ActionState } from "../app/actions";
import type { ErrorMessages } from "../i18n";

interface ActionFormProps {
  readonly action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  readonly errors: ErrorMessages;
  readonly submitLabel: string;
  readonly pendingLabel: string;
  readonly tone?: "primary" | "quiet";
  readonly layout?: "stack" | "inline";
  readonly children?: ReactNode;
}

const toneClasses = {
  primary: "bg-ink text-cream hover:bg-ink/90",
  quiet: "border border-line bg-panel text-ink hover:bg-parchment",
} as const;

export function ActionForm({
  action,
  errors,
  submitLabel,
  pendingLabel,
  tone = "primary",
  layout = "stack",
  children,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const message =
    state.error === undefined
      ? undefined
      : (errors[state.error as keyof ErrorMessages] ?? errors.unknown);

  return (
    <form
      action={formAction}
      className={layout === "inline" ? "flex flex-wrap items-end gap-2" : "flex flex-col gap-3"}
    >
      {children}

      <button
        type="submit"
        disabled={pending}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${toneClasses[tone]}`}
      >
        {pending ? pendingLabel : submitLabel}
      </button>

      {message !== undefined && (
        <p role="alert" className="text-sm text-clay">
          {message}
        </p>
      )}
    </form>
  );
}
