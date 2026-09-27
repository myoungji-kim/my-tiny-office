import { describe, expect, it } from "vitest";

import { refuse, type RequestFacts } from "./request-guard";

const local: RequestFacts = {
  method: "GET",
  host: "127.0.0.1:3000",
  forwardedHost: null,
  origin: null,
  fetchSite: null,
};

const post = (overrides: Partial<RequestFacts> = {}): RequestFacts => ({
  ...local,
  method: "POST",
  origin: "http://127.0.0.1:3000",
  fetchSite: "same-origin",
  ...overrides,
});

describe("refuse", () => {
  it("lets this machine read and write", () => {
    expect(refuse(local)).toBeUndefined();
    expect(refuse({ ...local, host: "localhost:3000" })).toBeUndefined();
    expect(refuse({ ...local, host: "[::1]:3000" })).toBeUndefined();
    expect(refuse(post())).toBeUndefined();
  });

  it("refuses a request addressed to another name, as a rebinding page's is", () => {
    expect(refuse({ ...local, host: "evil.example:3000" })).toBe("foreignHost");
    expect(refuse({ ...local, host: "127.0.0.1.evil.example" })).toBe("foreignHost");
    expect(refuse({ ...local, host: null })).toBe("foreignHost");
  });

  it("refuses a forwarded host that is not this machine", () => {
    expect(refuse({ ...local, forwardedHost: "evil.example" })).toBe("foreignHost");
  });

  it("refuses a change without an origin, which Next.js would let through", () => {
    expect(refuse(post({ origin: null }))).toBe("foreignOrigin");
  });

  it("refuses a change from another origin or another port", () => {
    expect(refuse(post({ origin: "https://evil.example" }))).toBe("foreignOrigin");
    expect(refuse(post({ origin: "http://127.0.0.1:4000" }))).toBe("foreignOrigin");
    expect(refuse(post({ origin: "null" }))).toBe("foreignOrigin");
    expect(refuse(post({ fetchSite: "cross-site" }))).toBe("foreignOrigin");
  });
});
