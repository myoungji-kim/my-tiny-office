import { describe, expect, it } from "vitest";

import { githubRepository, newPullRequestUrl } from "./github";

describe("githubRepository", () => {
  it("reads a GitHub remote however it is written, a company's own GitHub included", () => {
    expect(githubRepository("https://github.com/myoungji-kim/my-tiny-office.git")).toEqual({ host: "github.com", owner: "myoungji-kim", name: "my-tiny-office" });
    expect(githubRepository("git@github.com:myoungji-kim/my-tiny-office.git")).toEqual({ host: "github.com", owner: "myoungji-kim", name: "my-tiny-office" });
    expect(githubRepository("ssh://git@github.com/o/r")).toEqual({ host: "github.com", owner: "o", name: "r" });
    expect(githubRepository("https://user@github.example.com/o/r/")).toEqual({ host: "github.example.com", owner: "o", name: "r" });
  });

  it("is nothing for another host or anything that does not read as a repository", () => {
    expect(githubRepository("https://gitlab.com/o/r.git")).toBeUndefined();
    expect(githubRepository("/srv/git/r.git")).toBeUndefined();
    expect(githubRepository("https://github.com/o/r?x=<script>")).toBeUndefined();
    expect(githubRepository("https://github.com/o/r/extra/path")).toBeUndefined();
  });
});

describe("newPullRequestUrl", () => {
  const repo = { host: "github.com", owner: "o", name: "r" };

  it("is GitHub's page for a new pull request from the branch into the base, filled in", () => {
    const url = new URL(newPullRequestUrl(repo, "develop", "mto/b477a1ec-4706-4cc4-b017-a887aedc242e", "결제 내역 페이지네이션", "한 페이지에 20개씩."));
    expect(url.origin + url.pathname).toBe("https://github.com/o/r/compare/develop...mto/b477a1ec-4706-4cc4-b017-a887aedc242e");
    expect(url.searchParams.get("title")).toBe("결제 내역 페이지네이션");
    expect(url.searchParams.get("body")).toBe("한 페이지에 20개씩.");
  });

  it("cuts a long body so the address stays usable", () => {
    const url = newPullRequestUrl(repo, "main", "mto/x", "t", "가".repeat(20_000));
    expect(url.length).toBeLessThan(6_300);
    expect(new URL(url).searchParams.get("body")).toMatch(/…$/);
  });
});
