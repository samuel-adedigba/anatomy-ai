import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, Plugin } from "vite";

const VIEWER_ROOT = fileURLToPath(new URL(".", import.meta.url));
const MODELS_DIR = fileURLToPath(
  new URL("../../engines/anatomy-assets/models/", import.meta.url)
);
const VISUAL_SCENE_DIR = fileURLToPath(
  new URL("../../configs/visual-scene/", import.meta.url)
);
const MODEL_FILES = [
  "full_body.glb",
  "skeleton.glb",
  "muscular.glb",
  "nervous_system.glb",
  "circulatory.glb",
  "respiratory.glb",
  "digestive.glb",
  "brain.glb",
  "heart.glb",
  "spine.glb",
] as const;
const MODEL_FILE_SET = new Set<string>(MODEL_FILES);
const VISUAL_SCENE_FILES = [
  "fixtures/cardiovascular.normal-circulation.v1.json",
] as const;
const VISUAL_SCENE_FILE_SET = new Set<string>(VISUAL_SCENE_FILES);

function anatomyModels(): Plugin {
  return {
    name: "anatomy-models",
    configureServer(server) {
      server.middlewares.use("/models", (req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        const fileName = path.basename(decodeURIComponent(pathname));
        if (!MODEL_FILE_SET.has(fileName)) {
          next();
          return;
        }

        const modelPath = path.join(MODELS_DIR, fileName);
        if (!fs.existsSync(modelPath)) {
          res.statusCode = 404;
          res.end("Model not found");
          return;
        }

        res.setHeader("Content-Type", "model/gltf-binary");
        fs.createReadStream(modelPath).pipe(res);
      });
      server.middlewares.use("/visual-scene", (req, res, next) => {
        const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
        const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
        if (!VISUAL_SCENE_FILE_SET.has(relativePath)) {
          next();
          return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        fs.createReadStream(path.join(VISUAL_SCENE_DIR, relativePath)).pipe(res);
      });
    },
    writeBundle(options) {
      if (!options.dir) return;

      const outputModelsDir = path.resolve(VIEWER_ROOT, options.dir, "models");
      fs.mkdirSync(outputModelsDir, { recursive: true });
      for (const fileName of MODEL_FILES) {
        const source = path.join(MODELS_DIR, fileName);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, path.join(outputModelsDir, fileName));
        }
      }

      const outputVisualSceneDir = path.resolve(
        VIEWER_ROOT,
        options.dir,
        "visual-scene"
      );
      for (const relativePath of VISUAL_SCENE_FILES) {
        const destination = path.join(outputVisualSceneDir, relativePath);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(
          path.join(VISUAL_SCENE_DIR, relativePath),
          destination
        );
      }
    },
  };
}

/**
 * vite.config.ts
 *
 * Only runtime GLB files are served/copied. The asset workspace also contains
 * optional raw OBJ symlinks whose source archives are intentionally untracked;
 * treating the whole workspace as Vite's publicDir makes clean builds fail.
 */
export default defineConfig({
  publicDir: false,
  plugins: [anatomyModels()],
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
