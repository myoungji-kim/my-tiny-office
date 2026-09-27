// The app is a local server that can start agents on this computer, so a
// request is refused unless it is addressed to this machine and, when it
// changes anything, comes from a page this server served.

export interface RequestFacts {
  readonly method: string;
  readonly host: string | null;
  readonly forwardedHost: string | null;
  readonly origin: string | null;
  readonly fetchSite: string | null;
}

export type Refusal = "foreignHost" | "foreignOrigin";

const LOCAL_NAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hostnameOf(host: string): string {
  const bracket = host.startsWith("[") ? host.indexOf("]") : -1;
  if (bracket !== -1) return host.slice(0, bracket + 1).toLowerCase();
  const colon = host.lastIndexOf(":");
  return (colon === -1 ? host : host.slice(0, colon)).toLowerCase();
}

// A DNS-rebinding page reaches this server under its own name, so the Host a
// browser sends is the thing that gives it away.
const isLocalHost = (host: string): boolean => LOCAL_NAMES.has(hostnameOf(host));

function originHost(origin: string): string | undefined {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return undefined;
  }
}

export function refuse(facts: RequestFacts): Refusal | undefined {
  if (facts.host === null || !isLocalHost(facts.host)) return "foreignHost";
  if (facts.forwardedHost !== null && !isLocalHost(facts.forwardedHost)) return "foreignHost";

  if (SAFE_METHODS.has(facts.method.toUpperCase())) return undefined;

  // Next.js lets a server action without an Origin through; this does not.
  if (facts.fetchSite === "cross-site") return "foreignOrigin";
  if (facts.origin === null || originHost(facts.origin) !== facts.host.toLowerCase()) {
    return "foreignOrigin";
  }
  return undefined;
}
