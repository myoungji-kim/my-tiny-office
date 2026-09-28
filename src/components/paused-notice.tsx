"use client";

import { useTransition } from "react";

import { setWorkPausedAction } from "../app/actions";

import { Icon } from "./icons";

// While starting work is paused, every screen says so, so an empty desk is never a mystery.
export function PausedNotice({ title, why, resume }: { readonly title: string; readonly why: string; readonly resume: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="notice notice-warn" role="status">
      <span className="n-ic">{Icon.ask}</span>
      <span className="n-tx">
        <b>{title}</b>
        <span>{why}</span>
      </span>
      <span className="n-acts">
        <button className="btn btn-secondary btn-sm" type="button" disabled={pending} onClick={() => start(() => setWorkPausedAction(false))}>
          {resume}
        </button>
      </span>
    </div>
  );
}
