"use client";

import { useEffect, useRef, useState } from "react";

import type { Choice } from "./hire-dialog";
import { Icon } from "./icons";
import { useLatest } from "./use-latest";

// Deleting a row that still holds something asks where it goes first; `none`
// is the choice of nowhere, where there is one.
export function MoveDialog({
  title,
  sub,
  label,
  options,
  none,
  cancel,
  confirm,
  onConfirm,
  onClose,
}: {
  readonly title: string;
  readonly sub: string;
  readonly label: string;
  readonly options: readonly Choice[];
  readonly none?: string;
  readonly cancel: string;
  readonly confirm: string;
  readonly onConfirm: (into: string | undefined) => void;
  readonly onClose: () => void;
}) {
  const [into, setInto] = useState(none === undefined ? (options[0]?.id ?? "") : "");
  const back = useRef<HTMLButtonElement>(null);
  const latestClose = useLatest(onClose);
  useEffect(() => {
    back.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && latestClose.current();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [latestClose]);

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="move-title">
        <div className="m-hd">
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="m-t" id="move-title">
              {title}
            </span>
            <span className="m-s">{sub}</span>
          </span>
        </div>
        <div className="m-sec">
          <label className="label" htmlFor="move-to">
            {label}
          </label>
          <span className="select-wrap">
            <select className="select" id="move-to" value={into} onChange={(e) => setInto(e.target.value)}>
              {none !== undefined && <option value="">{none}</option>}
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            {Icon.chevron}
          </span>
        </div>
        <div className="m-foot">
          <button ref={back} className="btn btn-secondary btn-md" type="button" onClick={onClose}>
            {cancel}
          </button>
          <button className="btn btn-danger btn-md" type="button" onClick={() => onConfirm(into || undefined)}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
