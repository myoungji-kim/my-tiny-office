// Whatever the user names — a person, an area, a role, a team — is trimmed,
// required, and kept to a length the screens can hold.
export type NameFailure = "nameRequired" | "nameTooLong";

export function checkName(raw: string, max: number): { readonly ok: true; readonly name: string } | { readonly ok: false; readonly reason: NameFailure } {
  const name = raw.trim();
  if (name === "") return { ok: false, reason: "nameRequired" };
  if (name.length > max) return { ok: false, reason: "nameTooLong" };
  return { ok: true, name };
}
