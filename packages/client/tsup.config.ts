import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["source/index.ts"],
  splitting: false,
  sourcemap: true,
  dts: true,
  clean: true,
  outDir: "dist",
  format: ["esm", "cjs"],
  noExternal: ["@dredge/common"],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
