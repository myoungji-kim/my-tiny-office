import type { Dictionary, Locale } from "./dictionary";
import { en } from "./en";
import { ko } from "./ko";

export type { Dictionary, ErrorMessages, Locale } from "./dictionary";
export { resolveLocale } from "./dictionary";

export function getDictionary(locale: Locale): Dictionary {
  return locale === "ko" ? ko : en;
}
