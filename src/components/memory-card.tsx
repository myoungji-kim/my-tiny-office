import type { ReactNode } from "react";

import type { Dictionary } from "../i18n";
import type { MemoryView } from "../server/view-model";

import { Icon } from "./icons";

export function MemoryCard({
  memory,
  words,
  menu,
}: {
  readonly memory: MemoryView;
  readonly words: Dictionary["people"];
  readonly menu?: ReactNode;
}) {
  return (
    <div className="mem">
      {menu}
      <span className="mem-t">{memory.text}</span>
      <span className="mem-m">
        {memory.source === undefined ? Icon.hand : Icon.task}
        <span className="src">{memory.source === undefined ? words.toldDirectly : words.fromWhere(memory.source)}</span>
      </span>
    </div>
  );
}
