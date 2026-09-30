import type { Dictionary, Locale } from "../i18n";

const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

// Leave keeps since when, never until when.
export function sinceText(locale: Locale, t: Dictionary, at: number, now: number): string {
  if (sameDay(at, now)) return t.office.sinceToday;
  return t.office.since(dayText(locale, at));
}

export const dateText = (locale: Locale, at: number): string => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(at);

export const dayText = (locale: Locale, at: number): string =>
  new Intl.DateTimeFormat(locale, { month: locale === "ko" ? "long" : "short", day: "numeric" }).format(at);

// both days count, as the company screen counts them
export const daysSpanned = (from: number, to: number): number =>
  Math.round((new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0)) / 86_400_000) + 1;

// how long ago, in the largest unit that fits: 방금, 3분 전, 2일 전
export function agoText(locale: Locale, at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (minutes < 60) return format.format(-minutes, "minute");
  if (minutes < 24 * 60) return format.format(-Math.round(minutes / 60), "hour");
  if (minutes < 14 * 24 * 60) return format.format(-Math.round(minutes / 1440), "day");
  return format.format(-Math.round(minutes / 10_080), "week");
}

// the days a session ran, one date when it was one day
export function spanOf(locale: Locale, s: { readonly from: number; readonly to: number }): string {
  const from = dateText(locale, s.from);
  const to = dateText(locale, s.to);
  return from === to ? from : from + " – " + to;
}
