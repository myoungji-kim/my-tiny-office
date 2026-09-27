import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase, type DatabaseHandle } from "./database";

export interface TestDatabase {
  readonly handle: DatabaseHandle;
  reopen: () => DatabaseHandle;
  cleanup: () => void;
}

export function createTestDatabase(): TestDatabase {
  const directory = mkdtempSync(join(tmpdir(), "my-tiny-office-"));
  const filePath = join(directory, "test.db");
  let handle = openDatabase(filePath);

  return {
    get handle() {
      return handle;
    },
    reopen() {
      handle.close();
      handle = openDatabase(filePath);
      return handle;
    },
    cleanup() {
      handle.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
