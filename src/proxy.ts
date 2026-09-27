import { NextResponse, type NextRequest } from "next/server";

import { refuse } from "./server/request-guard";

// Runs before every route, static files included: nothing is served to a
// request that is not addressed to this machine.
export function proxy(request: NextRequest) {
  const refusal = refuse({
    method: request.method,
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    origin: request.headers.get("origin"),
    fetchSite: request.headers.get("sec-fetch-site"),
  });
  if (refusal !== undefined) {
    return new NextResponse(null, { status: refusal === "foreignHost" ? 421 : 403 });
  }
  return NextResponse.next();
}
