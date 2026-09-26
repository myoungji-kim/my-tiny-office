"use client";

import { useRouter } from "next/navigation";

import type { CompanyOption } from "../server/view-model";

export function CompanySwitcher({
  companies,
  currentId,
  label,
}: {
  readonly companies: readonly CompanyOption[];
  readonly currentId: string;
  readonly label: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={currentId}
        onChange={(event) => router.push(`/?company=${encodeURIComponent(event.target.value)}`)}
        className="rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink focus:border-blue focus:outline-none"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </label>
  );
}
