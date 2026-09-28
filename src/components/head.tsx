import type { ReactNode } from "react";

export function Head({
  title,
  sub,
  right,
  tabs,
}: {
  readonly title: string;
  readonly sub?: string;
  readonly right?: ReactNode;
  readonly tabs?: ReactNode;
}) {
  return (
    <div className="head">
      <div className="head-row">
        <span>
          <h1>{title}</h1>
          {sub !== undefined && <span className="sub">{sub}</span>}
        </span>
        {right !== undefined && <div className="head-right">{right}</div>}
      </div>
      {tabs !== undefined && (
        <div className="tabs" role="tablist">
          {tabs}
        </div>
      )}
    </div>
  );
}
