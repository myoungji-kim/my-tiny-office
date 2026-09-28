"use client";

import { useCallback, useState } from "react";

import type { Locale } from "../i18n";

import { HireDialog, type Choice } from "./hire-dialog";
import { Icon } from "./icons";

export function HireButton({
  locale,
  companyId,
  roles,
  teams,
  label,
}: {
  readonly locale: Locale;
  readonly companyId: string;
  readonly roles: readonly Choice[];
  readonly teams: readonly Choice[];
  readonly label: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className="btn btn-primary btn-lg" type="button" onClick={() => setOpen(true)}>
        {Icon.plus}
        <span>{label}</span>
      </button>
      {open && <HireDialog locale={locale} companyId={companyId} roles={roles} teams={teams} onClose={close} />}
    </>
  );
}
