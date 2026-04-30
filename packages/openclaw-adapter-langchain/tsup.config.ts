import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  // Bundle ALL dependencies into one file — OpenClaw security scan
  // can't resolve workspace symlinks, so we ship self-contained
  noExternal: [/.*/],
  platform: "node",
  target: "node18",
});
