import type { Dictionary, Locale } from "../i18n";

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

// Leave keeps since when, never until when.
export function sinceText(locale: Locale, t: Dictionary, at: number, now: number): string {
  if (sameDay(at, now)) return t.office.sinceToday;
  return t.office.since(new Intl.DateTimeFormat(locale, { month: locale === "ko" ? "long" : "short", day: "numeric" }).format(at));
}

export const dateText = (locale: Locale, at: number): string => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(at);
