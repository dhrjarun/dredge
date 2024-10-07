import type { Options } from "tsup";

export function getTsupConfig(opts: { entry: Options["entry"] }) {
  const config: Options = {
    entry: opts.entry,
    splitting: false,
    sourcemap: true,
    dts: true,
    clean: true,
    outDir: "dist",
    format: ["esm", "cjs"],
    outExtension({ format }) {
      return {
        js: `.${format === "cjs" ? "js" : "mjs"}`,
      };
    },
  };

  return config;
}
