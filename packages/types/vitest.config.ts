import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["setupVitest.ts"],
    typecheck: {
      ignoreSourceErrors: true,
    },
  },
});
