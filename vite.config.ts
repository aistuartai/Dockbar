import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

// Plain Rollup entry rather than lib mode, because lib mode won't fully minify ES output.
export default defineConfig({
  define: {
    __DOCKBAR_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: "es2021",
    // Bundled into the integration, which serves it to the frontend.
    outDir: "custom_components/dockbar/frontend",
    emptyOutDir: true,
    modulePreload: false,
    copyPublicDir: false,
    rollupOptions: {
      input: "src/dockbar.ts",
      preserveEntrySignatures: "strict",
      output: {
        format: "es",
        entryFileNames: "dockbar.js",
        codeSplitting: false,
      },
    },
  },
});
