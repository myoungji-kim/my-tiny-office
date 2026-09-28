"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { bringBackAction, sendOnLeaveAction } from "../app/people-actions";
import { getDictionary, type Locale } from "../i18n";
import type { AreaView, EmployeeView, MemoryView, ProjectView, TaskView } from "../server/view-model";

import { AssignDialog } from "./assign-dialog";
import { HireDialog, type Choice } from "./hire-dialog";
import { Icon } from "./icons";
import { RowMenu } from "./row-menu";
import { TeachDialog } from "./teach-dialog";

type Open = "teach" | "assign" | "edit" | undefined;

// Leave, or Claude Code stopping, forbids new work; the button stays,
// disabled, with the reason beside it.
export function PersonActions({
  locale,
  companyId,
  person,
  roleLine,
  memories,
  areas,
  backlog,
  projects,
  roles,
  teams,
  ready,
  assignFirst,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly person: EmployeeView;
  readonly roleLine: string;
  readonly memories: readonly MemoryView[];
  readonly areas: readonly AreaView[];
  readonly backlog: readonly TaskView[];
  readonly projects: readonly ProjectView[];
  readonly roles: readonly Choice[];
  readonly teams: readonly Choice[];
  readonly ready: boolean;
  // another screen's 업무 맡기기 arrives with the dialog open
  readonly assignFirst: boolean;
}) {
  const t = getDictionary(locale);
  const w = t.people;
  const router = useRouter();
  const away = person.status === "onLeave";
  const why = away ? w.cannotAssign : ready ? undefined : t.claude.cannotStart;
  const [open, setOpen] = useState<Open>(assignFirst && why === undefined ? "assign" : undefined);
  const [, start] = useTransition();
  const close = useCallback(() => {
    setOpen(undefined);
    if (assignFirst) router.replace(`/people/${person.id}`, { scroll: false });
  }, [assignFirst, router, person.id]);

  return (
    <>
      <button className="btn btn-secondary btn-lg" type="button" onClick={() => setOpen("teach")}>
        <span>{w.teach}</span>
      </button>
      {why !== undefined && (
        <span className="ghost-note" id="assign-why">
          {why}
        </span>
      )}
      <button className="btn btn-primary btn-lg" type="button" disabled={why !== undefined} aria-describedby={why === undefined ? undefined : "assign-why"} onClick={() => setOpen("assign")}>
        <span>{w.giveWork}</span>
      </button>
      <RowMenu
        className="ibtn"
        label={w.personMenu}
        keep={w.keep}
        items={[
          { label: w.editInfo, icon: Icon.pen, run: () => setOpen("edit") },
          away
            ? { label: w.comeBack, icon: Icon.undo, run: () => start(async () => void (await bringBackAction(companyId, person.id))) }
            : {
                label: w.sendOnLeave,
                icon: Icon.sun,
                confirm: person.task === undefined ? undefined : w.leaveWhy(person.task.title),
                run: () => start(async () => void (await sendOnLeaveAction(companyId, person.id))),
              },
        ]}
      />

      {open === "teach" && <TeachDialog locale={locale} companyId={companyId} person={person} memories={memories} areas={areas} onClose={close} />}
      {open === "assign" && (
        <AssignDialog
          locale={locale}
          companyId={companyId}
          person={person}
          roleLine={roleLine}
          memories={memories}
          areas={areas}
          backlog={backlog}
          projects={projects}
          onClose={close}
        />
      )}
      {open === "edit" && (
        <HireDialog
          locale={locale}
          companyId={companyId}
          roles={roles}
          teams={teams}
          edit={{ id: person.id, name: person.name, species: person.species, roleId: person.roleId, teamId: person.teamId }}
          onClose={close}
        />
      )}
    </>
  );
}
