"use client";

import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, useTransition } from "react";

import { switchCompanyAction } from "../app/actions";
import type { CompanyOption } from "../server/view-model";

import { useDismiss } from "./use-dismiss";

const EDGE = 12;

// Every company on this computer is a file of its own. The names are the
// user's, so they are never translated.
export function CompanyMenu({
  companies,
  currentId,
  words,
}: {
  readonly companies: readonly CompanyOption[];
  readonly currentId: string;
  readonly words: { readonly switch: string; readonly create: string; readonly import: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, pop, anchor, close);

  useLayoutEffect(() => {
    const a = anchor.current;
    const p = pop.current;
    if (!open || a === null || p === null) return;
    const r = a.getBoundingClientRect();
    p.style.left = Math.round(Math.min(Math.max(EDGE, r.right - p.offsetWidth), innerWidth - p.offsetWidth - EDGE)) + "px";
    p.style.top = Math.round(Math.min(r.bottom + 6, innerHeight - p.offsetHeight - EDGE)) + "px";
  }, [open]);

  const choose = (id: string) => {
    close();
    if (id !== currentId) start(() => switchCompanyAction(id));
  };

  return (
    <>
      <button
        ref={anchor}
        className="ibtn ibtn-sm side-switch"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={words.switch}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 6.5L8 10l3.5-3.5" />
        </svg>
      </button>
      <div ref={pop} className="pop" role="menu" style={{ width: 232 }} data-open={open ? "" : undefined}>
        <div className="p-acts" style={{ padding: 0 }}>
          {companies.map((c) => (
            <button key={c.id} className="mrow" type="button" role="menuitem" onClick={() => choose(c.id)}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {c.id === currentId && <path d="M3.4 8.4l3 3 6.2-6.6" />}
              </svg>
              {c.name}
            </button>
          ))}
          <button
            className="mrow"
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              router.push("/new");
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M8 3.5v9M3.5 8h9" />
            </svg>
            {words.create}
          </button>
          <button
            className="mrow"
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              router.push("/new?from=import");
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2.5v8M4.6 7.4L8 10.8l3.4-3.4M3 13.5h10" />
            </svg>
            {words.import}
          </button>
        </div>
      </div>
    </>
  );
}
