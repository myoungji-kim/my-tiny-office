"use client";

import { useCallback, useSyncExternalStore } from "react";

// A choice kept in this browser only. Storage can be missing or refuse, so the
// fallback always stands in.
const CHANGED = "mto-local-choice";

const subscribe = (onChange: () => void) => {
  addEventListener(CHANGED, onChange);
  addEventListener("storage", onChange);
  return () => {
    removeEventListener(CHANGED, onChange);
    removeEventListener("storage", onChange);
  };
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export function useLocalChoice<T>(key: string, parse: (saved: string | null) => T | undefined, fallback: T): readonly [T, (value: T) => void] {
  const saved = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );
  const set = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(key, String(value));
      } catch {}
      dispatchEvent(new Event(CHANGED));
    },
    [key],
  );
  return [parse(saved) ?? fallback, set] as const;
}
