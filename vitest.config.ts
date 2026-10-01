import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Some tests run real git and copy SQLite files, which a busy computer
    // slows past the 5 s default; a test that hangs still fails.
    testTimeout: 20_000,
  },
});
