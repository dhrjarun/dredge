import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["source/index.ts"],
  noExternal: ["@dredge/common"],
  splitting: false,
  sourcemap: true,
  dts: {
    resolve: true,
  },
  clean: true,
  outDir: "dist",
  format: ["esm", "cjs"],
  outExtension({ format }) {
    return {
      js: `.${format}.js`,
    };
  },
});
