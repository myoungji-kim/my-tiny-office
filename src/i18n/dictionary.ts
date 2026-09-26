import type { en } from "./en";

export type Locale = "en" | "ko";

export type Dictionary = typeof en;
export type ErrorMessages = Dictionary["errors"];

export function resolveLocale(acceptLanguage: string | null): Locale {
  return acceptLanguage?.toLowerCase().startsWith("ko") === true ? "ko" : "en";
}
