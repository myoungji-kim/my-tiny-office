"use client";

import { useEffect, type RefObject } from "react";

// A popover closes on a press outside it and its anchor, and on Escape, which
// hands focus back to the anchor.
export function useDismiss(
  open: boolean,
  pop: RefObject<HTMLElement | null>,
  anchor: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (pop.current?.contains(target) || anchor.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      anchor.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pop, anchor, close]);
}
