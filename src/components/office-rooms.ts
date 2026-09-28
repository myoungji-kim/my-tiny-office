import type { EmployeeView, TeamView } from "../server/view-model";

// A tab is a room, and every room follows from the company: the whole floor,
// a room for each team that has people, the meeting room where reviewers sit,
// and the lounge where anyone without work ends up.
export type Room =
  | { readonly key: "all"; readonly kind: "all" }
  | { readonly key: string; readonly kind: "team"; readonly team: TeamView }
  | { readonly key: "meeting"; readonly kind: "meeting" }
  | { readonly key: "lounge"; readonly kind: "lounge" };

export function roomsOf(employees: readonly EmployeeView[], teams: readonly TeamView[]): Room[] {
  const staffed = teams.filter((team) => employees.some((e) => e.teamId === team.id));
  return [
    { key: "all", kind: "all" },
    ...staffed.map((team) => ({ key: team.id, kind: "team" as const, team })),
    { key: "meeting", kind: "meeting" },
    { key: "lounge", kind: "lounge" },
  ];
}

export function peopleIn(room: Room, employees: readonly EmployeeView[]): EmployeeView[] {
  switch (room.kind) {
    case "all":
      return [...employees];
    case "team":
      return employees.filter((e) => e.teamId === room.team.id);
    case "meeting":
      return employees.filter((e) => e.status === "reviewing");
    case "lounge":
      return employees.filter((e) => e.status === "available");
  }
}

