import { useEffect, useRef } from "react";

// The newest value, for an effect that must run once: a parent re-rendering
// (the screens refresh every few seconds) hands a dialog a new onClose, and
// re-running its effect would pull focus back to the first control.
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
