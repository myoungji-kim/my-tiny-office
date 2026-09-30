import { describe, expect, it } from "vitest";

import type { EmployeeView } from "../server/view-model";

import { peopleIn, roomsOf } from "./office-rooms";

const person = (id: string, status: EmployeeView["status"], teamId?: string): EmployeeView => ({
  id,
  name: id,
  species: "cat",
  role: "DBA",
  roleId: "r",
  teamId,
  hiredAt: 0,
  finished: 0,
  reviewed: 0,
  worked: false,
  justBack: false,
  status,
  agentLost: false,
  task: undefined,
  review: undefined,
  lastFinished: undefined,
  leaveSince: undefined,
  career: undefined,
});

describe("office rooms", () => {
  const teams = [
    { id: "t1", suggested: "backend", name: undefined },
    { id: "t2", suggested: "design", name: undefined },
  ];
  const people = [person("a", "working", "t1"), person("b", "reviewing"), person("c", "available", "t1"), person("d", "onLeave")];

  it("opens a room only for a team that has people", () => {
    expect(roomsOf(people, teams).map((r) => r.key)).toEqual(["all", "t1", "meeting", "lounge"]);
  });

  it("seats reviewers in the meeting room and whoever is free in the lounge", () => {
    const [all, team, meeting, lounge] = roomsOf(people, teams);
    expect(peopleIn(all, people)).toHaveLength(4);
    expect(peopleIn(team, people).map((p) => p.id)).toEqual(["a", "c"]);
    expect(peopleIn(meeting, people).map((p) => p.id)).toEqual(["b"]);
    expect(peopleIn(lounge, people).map((p) => p.id)).toEqual(["c"]);
  });
});
