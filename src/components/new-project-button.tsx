"use client";

import { useCallback, useState } from "react";

import type { Locale } from "../i18n";

import { Icon } from "./icons";
import { ProjectDialog } from "./project-dialog";

export function NewProjectButton({ locale, companyId, label, atlassianMissing }: { readonly locale: Locale; readonly companyId: string; readonly label: string; readonly atlassianMissing: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className="btn btn-secondary btn-lg" type="button" onClick={() => setOpen(true)}>
        {Icon.plus}
        <span>{label}</span>
      </button>
      {open && <ProjectDialog locale={locale} companyId={companyId} atlassianMissing={atlassianMissing} onClose={close} />}
    </>
  );
}
