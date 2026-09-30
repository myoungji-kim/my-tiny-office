"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { Outcome } from "../app/action-context";

import { useLatest } from "./use-latest";

// A step that says what it does before it is taken; `field` asks for a line
// of text, such as why, before the step can be taken.
export function StepDialog({
  heading,
  why,
  yes,
  cancel,
  field,
  errors,
  onYes,
  onClose,
}: {
  readonly heading: string;
  readonly why: string;
  readonly yes: string;
  readonly cancel: string;
  readonly field?: { readonly label: string; readonly placeholder: string };
  readonly errors: Readonly<Record<string, string>>;
  readonly onYes: (text: string) => Promise<Outcome>;
  readonly onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [pending, start] = useTransition();
  const first = useRef<HTMLInputElement & HTMLButtonElement>(null);

  const latestClose = useLatest(onClose);
  useEffect(() => {
    first.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latestClose.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestClose]);

  const go = () =>
    start(async () => {
      const result = await onYes(text.trim());
      if (result.error !== undefined) setError(errors[result.error] ?? errors.unknown);
      else onClose();
    });

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t">{heading}</span>
          </span>
        </div>
        <div className="m-sec">
          <span className="m-s">{why}</span>
          {field !== undefined && (
            <div className="field">
              <label className="label" htmlFor="step-text">
                {field.label}
              </label>
              <input ref={first} className="input" id="step-text" placeholder={field.placeholder} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
          )}
          {error !== undefined && (
            <p className="hint" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="m-foot">
          <button className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {cancel}
          </button>
          <button
            ref={field === undefined ? first : undefined}
            className="btn btn-primary btn-md"
            type="button"
            disabled={pending || (field !== undefined && text.trim() === "")}
            onClick={go}
          >
            {yes}
          </button>
        </div>
      </div>
    </div>
  );
}
