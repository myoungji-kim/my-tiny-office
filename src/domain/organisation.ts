import type { CompanyId, RoleId, TeamId } from "./ids";
import type { Timestamp } from "./time";

// A role is a job title from the company's list, shown as written; nothing
// hangs on it. Technical titles stay English, so the list starts in English.
export const STARTING_ROLES = ["Backend Engineer", "Frontend Engineer", "Product Manager", "DBA", "DevOps Engineer", "QA Engineer"] as const;

export interface Role {
  readonly id: RoleId;
  readonly companyId: CompanyId;
  readonly name: string;
  readonly createdAt: Timestamp;
}

// A team is optional and there is nothing above it. The ones the product
// suggests are named by the dictionary; one the user names is shown as written.
export const SUGGESTED_TEAMS = ["backend", "frontend", "planning", "design"] as const;
export type SuggestedTeam = (typeof SUGGESTED_TEAMS)[number];

export interface Team {
  readonly id: TeamId;
  readonly companyId: CompanyId;
  readonly suggested: SuggestedTeam | undefined;
  readonly name: string | undefined;
  readonly createdAt: Timestamp;
}

export const MAX_NAME = 40;

type Named<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: "nameRequired" | "nameTooLong" };

function checkName(raw: string): { ok: true; name: string } | { ok: false; reason: "nameRequired" | "nameTooLong" } {
  const name = raw.trim();
  if (name === "") return { ok: false, reason: "nameRequired" };
  if (name.length > MAX_NAME) return { ok: false, reason: "nameTooLong" };
  return { ok: true, name };
}

export function startingRoles(companyId: CompanyId, ids: readonly RoleId[], now: Timestamp): Role[] {
  return STARTING_ROLES.map((name, i) => ({ id: ids[i], companyId, name, createdAt: now }));
}

export function createRole(input: { readonly id: RoleId; readonly companyId: CompanyId; readonly name: string }, now: Timestamp): Named<Role> {
  const checked = checkName(input.name);
  if (!checked.ok) return checked;
  return { ok: true, value: { id: input.id, companyId: input.companyId, name: checked.name, createdAt: now } };
}

export function renameRole(role: Role, raw: string): Named<Role> {
  const checked = checkName(raw);
  if (!checked.ok) return checked;
  return { ok: true, value: { ...role, name: checked.name } };
}

// Everyone has a role, so the last one stays, and one that people hold goes
// only once they have another.
export function canRemoveRole(role: Role, roles: readonly Role[], holders: number): "lastRole" | "roleHeld" | undefined {
  if (roles.length <= 1) return "lastRole";
  if (holders > 0) return "roleHeld";
  return undefined;
}

export function createTeam(
  input: { readonly id: TeamId; readonly companyId: CompanyId } & ({ readonly suggested: SuggestedTeam } | { readonly name: string }),
  now: Timestamp,
): Named<Team> {
  if ("suggested" in input) {
    return { ok: true, value: { id: input.id, companyId: input.companyId, suggested: input.suggested, name: undefined, createdAt: now } };
  }
  const checked = checkName(input.name);
  if (!checked.ok) return checked;
  return { ok: true, value: { id: input.id, companyId: input.companyId, suggested: undefined, name: checked.name, createdAt: now } };
}

export function renameTeam(team: Team, raw: string): Named<Team> {
  const checked = checkName(raw);
  if (!checked.ok) return checked;
  return { ok: true, value: { ...team, name: checked.name } };
}
