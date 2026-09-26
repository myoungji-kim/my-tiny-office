import type { ReactNode } from "react";

const controlClasses =
  "w-full rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-ink " +
  "placeholder:text-muted/70 focus:border-blue focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-muted">
        {label}
        {hint !== undefined && <span className="ml-1 font-normal text-muted/70">({hint})</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={controlClasses} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} rows={2} className={controlClasses} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={controlClasses} />;
}
