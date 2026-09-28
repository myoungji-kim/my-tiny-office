import { Icon } from "./icons";

// The mark for an employee whose agent stopped; `inline` puts it in a line of text.
export function AgentMark({ label, inline = false }: { readonly label: string; readonly inline?: boolean }) {
  return (
    <span className={inline ? "agent-mark inline" : "agent-mark"} role="img" aria-label={label} title={label}>
      {Icon.plug}
    </span>
  );
}
