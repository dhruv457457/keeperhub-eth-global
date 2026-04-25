import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/core/index.ts",
      "react/index": "src/react/index.ts",
      "types/index": "src/types/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ["react", "react-dom", "@tanstack/react-query"],
  },
]);
