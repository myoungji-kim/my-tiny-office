import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "../proxy";

import { launchToken, sameToken, tokenCookie, TOKEN_ENV } from "./access-token";

const token = "a".repeat(64);
const at = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers: { host: "127.0.0.1:4317", ...headers } });

afterEach(() => {
  delete process.env[TOKEN_ENV];
});

describe("the launch token", () => {
  it("is only a long one, compared whole", () => {
    expect(launchToken({ [TOKEN_ENV]: "short" })).toBeUndefined();
    expect(launchToken({ [TOKEN_ENV]: token })).toBe(token);
    expect(sameToken(token, token)).toBe(true);
    expect(sameToken(token.slice(1), token)).toBe(false);
    expect(sameToken(undefined, token)).toBe(false);
  });

  it("keeps a cookie per port, since cookies are shared by a host's ports", () => {
    expect(tokenCookie("127.0.0.1:4317")).toBe("mto-token-4317");
    expect(tokenCookie("localhost:3000")).toBe("mto-token-3000");
  });
});

describe("a request to the server", () => {
  it("is let through with the token's cookie, and refused without it", () => {
    process.env[TOKEN_ENV] = token;

    expect(proxy(at("http://127.0.0.1:4317/", { cookie: `mto-token-4317=${token}` })).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(at("http://127.0.0.1:4317/")).status).toBe(401);
    // another server's cookie on the same host is not this one's
    expect(proxy(at("http://127.0.0.1:4317/", { cookie: `mto-token-3000=${token}` })).status).toBe(401);
  });

  it("turns the printed address into the cookie, and takes the token off the address", () => {
    process.env[TOKEN_ENV] = token;
    const answer = proxy(at(`http://127.0.0.1:4317/projects?token=${token}`));

    expect(answer.status).toBe(307);
    expect(answer.headers.get("location")).toBe("http://127.0.0.1:4317/projects");
    expect(answer.cookies.get("mto-token-4317")).toMatchObject({ value: token, httpOnly: true, sameSite: "strict" });
    expect(proxy(at("http://127.0.0.1:4317/?token=wrong")).status).toBe(401);
  });

  it("is let through without a token when the server was started without one", () => {
    expect(proxy(at("http://127.0.0.1:4317/")).headers.get("x-middleware-next")).toBe("1");
  });
});
