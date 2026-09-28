import type { EmployeeStatus } from "../domain/review";

// The design system names the on-leave status "leave".
export const statusClass = (status: EmployeeStatus): string => (status === "onLeave" ? "leave" : status);

export const statusColor: Readonly<Record<EmployeeStatus, string>> = {
  working: "var(--warn)",
  reviewing: "var(--info)",
  available: "var(--ok)",
  onLeave: "var(--faint)",
};
