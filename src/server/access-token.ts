import { timingSafeEqual } from "node:crypto";

// Only what holds this launch's token reaches the server: the desktop window,
// which is handed it as a cookie, and a browser opened from the address the
// launch printed. Another program or user on this computer can reach the
// port, but not the token (SECURITY.md §6). The token comes from the process
// that started the server; without one the check is off, as for tests.
export const TOKEN_ENV = "MY_TINY_OFFICE_TOKEN";
export const TOKEN_PARAM = "token";
const MIN_TOKEN = 32;

// Cookies are shared by every port on a host, so each server keeps its own.
export const tokenCookie = (host: string): string => "mto-token-" + (host.split(":").at(-1) ?? "").replace(/[^0-9]/g, "");

export function launchToken(env: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  const token = env[TOKEN_ENV];
  return token !== undefined && token.length >= MIN_TOKEN ? token : undefined;
}

export function sameToken(given: string | undefined, token: string): boolean {
  if (given === undefined) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
