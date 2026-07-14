import { defineConfig } from "vite";
import path from "path";

/**
 * vite.config.ts
 *
 * publicDir is set to ../../engines/anatomy-assets so that GLB files at
 * engines/anatomy-assets/models/*.glb are served at /models/*.glb when
 * running from the monorepo root.
 *
 * If you are running the web-viewer standalone (not from the monorepo),
 * copy the models directory into apps/web-viewer/public/models/ and
 * change publicDir to "public".
 *
 * See apps/web-viewer/README.md for full setup instructions.
 */
export default defineConfig({
  publicDir: "../../engines/anatomy-assets",
  build: {
    outDir:      "dist",
    emptyOutDir: true,
    sourcemap:   true,
  },
  server: {
    port: 5173,
    host: true, // expose to local network for device testing
  },
});
