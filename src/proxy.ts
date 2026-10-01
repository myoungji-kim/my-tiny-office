import { NextResponse, type NextRequest } from "next/server";

import { getDictionary, resolveLocale } from "./i18n";
import { launchToken, sameToken, TOKEN_PARAM, tokenCookie } from "./server/access-token";
import { refuse } from "./server/request-guard";

// A browser without the token is told where the address with it is, in its own language.
function noToken(acceptLanguage: string | null): NextResponse {
  const w = getDictionary(resolveLocale(acceptLanguage)).access;
  const page = `<!doctype html><meta charset="utf-8"><title>My Tiny Office</title><body style="font:15px system-ui,sans-serif;max-width:520px;margin:15vh auto;padding:0 16px;color:#3a3a40"><p><b>${w.title}</b><br>${w.body}</p>`;
  return new NextResponse(page, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Runs before every route, static files included: nothing is served to a
// request that is not addressed to this machine, or that lacks this launch's token.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const refusal = refuse({
    method: request.method,
    host,
    forwardedHost: request.headers.get("x-forwarded-host"),
    origin: request.headers.get("origin"),
    fetchSite: request.headers.get("sec-fetch-site"),
  });
  if (refusal !== undefined) {
    return new NextResponse(null, { status: refusal === "foreignHost" ? 421 : 403 });
  }

  const token = launchToken();
  if (token === undefined || host === null) return NextResponse.next();
  const cookie = tokenCookie(host);
  if (sameToken(request.cookies.get(cookie)?.value, token)) return NextResponse.next();

  // the printed address carries the token once; it becomes a cookie and leaves the address
  const given = request.nextUrl.searchParams.get(TOKEN_PARAM) ?? undefined;
  if (request.method === "GET" && sameToken(given, token)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete(TOKEN_PARAM);
    // on the host the request named, which the cookie is set for; Next's own
    // URL would name 127.0.0.1 localhost, a host the cookie is not sent to
    const back = new URL(clean.pathname + clean.search, "http://" + host).href;
    const response = new NextResponse(null, { status: 307, headers: { Location: back } });
    response.cookies.set({ name: cookie, value: token, httpOnly: true, sameSite: "strict", path: "/" });
    return response;
  }
  return noToken(request.headers.get("accept-language"));
}
