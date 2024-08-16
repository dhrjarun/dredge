import { defineConfig } from "tsup";
import { getTsupConfig } from "../../scripts/get-tsup-config";

export default defineConfig(getTsupConfig({ entry: ["source/index.ts"] }));
