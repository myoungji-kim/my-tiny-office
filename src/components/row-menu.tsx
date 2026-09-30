"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "./icons";
import { useDismiss } from "./use-dismiss";

export interface MenuItem {
  readonly label: string;
  readonly icon?: ReactNode;
  readonly bad?: boolean;
  // the one the user came for
  readonly key?: boolean;
  // why it cannot be done now; the row stays, disabled
  readonly off?: string;
  // asked once more in place, for what cannot be undone
  readonly confirm?: string;
  readonly run: () => void;
}

const EDGE = 12;

// One small menu for anything listed in rows: a memory, a rule, a team, a person.
export function RowMenu({
  label,
  items,
  keep,
  className = "ibtn ibtn-sm",
  icon = Icon.more,
  busy = false,
}: {
  readonly label: string;
  readonly items: readonly MenuItem[];
  readonly keep: string;
  readonly className?: string;
  readonly icon?: ReactNode;
  // what was chosen is still being done
  readonly busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [asking, setAsking] = useState<MenuItem | undefined>(undefined);
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setAsking(undefined);
  }, []);
  useDismiss(open, pop, anchor, close);

  useLayoutEffect(() => {
    const a = anchor.current;
    const p = pop.current;
    if (!open || a === null || p === null) return;
    const r = a.getBoundingClientRect();
    p.style.left = Math.round(Math.min(Math.max(EDGE, r.right - p.offsetWidth), innerWidth - p.offsetWidth - EDGE)) + "px";
    p.style.top = Math.round(Math.min(r.bottom + 6, innerHeight - p.offsetHeight - EDGE)) + "px";
    p.querySelector<HTMLElement>(".mrow:not(:disabled)")?.focus({ preventScroll: true });
    addEventListener("scroll", close, { passive: true });
    return () => removeEventListener("scroll", close);
  }, [open, asking, close]);

  const choose = (item: MenuItem) => {
    if (item.confirm !== undefined && asking !== item) return setAsking(item);
    close();
    item.run();
  };

  const row = (item: MenuItem, onClick: () => void) => (
    <span key={item.label} style={{ display: "contents" }}>
      <button
        className={["mrow", item.bad === true && "mrow-bad", item.key === true && "mrow-key"].filter(Boolean).join(" ")}
        type="button"
        role="menuitem"
        disabled={item.off !== undefined}
        onClick={onClick}
      >
        {item.icon}
        {item.label}
      </button>
      {item.off !== undefined && <p className="p-why">{item.off}</p>}
    </span>
  );

  return (
    <>
      <button
        ref={anchor}
        className={className}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        aria-busy={busy}
        onClick={(e) => {
          e.stopPropagation();
          if (open) close();
          else setOpen(true);
        }}
      >
        {icon}
      </button>
      {open && (
        <div ref={pop} className="pop" role="menu" style={{ width: 232 }} data-open="">
          <div className="p-acts" style={{ padding: 0 }}>
            {asking === undefined ? (
              items.map((item) => row(item, () => choose(item)))
            ) : (
              <>
                <p className="p-why">{asking.confirm}</p>
                {row(asking, () => choose(asking))}
                {row({ label: keep, icon: Icon.x, run: close }, close)}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
