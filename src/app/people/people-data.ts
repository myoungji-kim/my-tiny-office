import { teamName } from "../../components/names";
import type { Dictionary } from "../../i18n";
import type { EmployeeView, OfficeView, TeamView } from "../../server/view-model";

// What the people screens derive from the office, in one place.
export function peopleData(office: OfficeView, t: Dictionary) {
  const teamOf = (e: EmployeeView): TeamView | undefined => office.teams.find((team) => team.id === e.teamId);
  const team = (e: EmployeeView) => {
    const found = teamOf(e);
    return found === undefined ? "" : teamName(found, t.teams);
  };
  return {
    team,
    roleLine: (e: EmployeeView) => e.role + (team(e) === "" ? "" : " · " + team(e)),
    memoriesOf: (e: EmployeeView) => office.memories.filter((m) => m.employeeId === e.id),
    // areas someone has been taught, in the company's order
    areasOf: (e: EmployeeView) =>
      office.areas.filter((a) => office.memories.some((m) => m.kind === "expertise" && m.employeeId === e.id && m.areaId === a.id)),
    roles: office.roles.map((r) => ({ id: r.id, label: r.name })),
    teams: office.teams.map((x) => ({ id: x.id, label: teamName(x, t.teams) })),
    // work waiting for someone, in a project that still takes it
    backlog: office.tasks.filter(
      (task) => task.status === "backlog" && task.assigneeId === undefined && office.projects.some((p) => p.id === task.projectId && p.takesWork),
    ),
    openProjects: office.projects.filter((p) => p.takesWork),
  };
}
