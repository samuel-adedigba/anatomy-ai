# Anatomy AI — Complete System

Local-first, evidence-grounded 3D anatomy learning system.

## Product direction

The source of truth for the intended interactive, video-like 3D anatomy experience, the
cardiovascular first proof, milestone gates, testing requirements, and external asset setup is
[Anatomy AI Product Goals and Development Plan](docs/PRODUCT_GOALS_AND_DEVELOPMENT_PLAN.md).

The first visual-contract milestone is available without AI:

```bash
node scripts/anatomy/inspect-assets.mjs --markdown --check-ledger
node scripts/visual-scene/generate-contract-types.mjs --check
cd services/instruction-engine && pnpm test
cd ../../apps/web-viewer && pnpm test && pnpm dev
```

The standalone viewer validates and lists the deterministic cardiovascular steps. It does not
play realistic heartbeat or flow motion yet because the current GLBs have no semantic chamber
nodes, reviewed animation clip, morph targets, or flow paths.

---

## Architecture

```
Mobile App (Expo React Native)
  │
  │  POST /ask · POST /visual-command · GET /health
  ▼
API Gateway (Node.js · port 3001)
  │
  ├─── POST /query ──────────────────────────────────────────▶ AI Service (Python · port 8001)
  │                                                               LlamaIndex + Ollama + LanceDB
  │    ◀── { answer, sources, raw_context } ──────────────────
  │
  └─── POST /parse ─────────────────────────────────────────▶ Instruction Engine (TypeScript · port 3002)
       POST /direct (for manual system selection)               Deterministic VisualCommand builder
       ◀── { command: VisualCommand } ─────────────────────────
  │
  ▼
  { answer, sources, visualCommand }
  │
  ▼
Mobile App → WebView → Three.js Visual Engine (port 5173)
                          Loads GLB model · Highlights meshes · Animates · Camera
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | Use the package manager included with your Node.js setup, or install from https://pnpm.io/installation |
| Python | 3.11+ | https://python.org |
| Ollama | latest | https://ollama.ai |
| Expo | latest project dependency | Run the app with the local Expo package via `pnpm start` |

---

## First-time setup

### 1. Install Ollama models

```bash
ollama serve          # start the Ollama daemon (runs in background)
ollama pull llama3.2:3b       # LLM for answering questions (~2 GB)
ollama pull nomic-embed-text  # embedding model (~270 MB)
```

### 2. Set up environment files

Each service reads its own `.env` file. Copy the matching examples when setting up a fresh clone:

```bash
cp services/api-gateway/.env.example services/api-gateway/.env
cp services/ai-service/.env.example services/ai-service/.env
cp services/instruction-engine/.env.example services/instruction-engine/.env
```

For the mobile app:
```bash
cd apps/mobile-app
cp .env.example .env
# Edit .env — choose the right URL for your device type (see table below)
```

| Running on | `EXPO_PUBLIC_API_URL` | `EXPO_PUBLIC_VIEWER_URL` |
|---|---|---|
| iOS Simulator | `http://localhost:3001` | `http://localhost:5173` |
| Android Emulator | `http://10.0.2.2:3001` | `http://10.0.2.2:5173` |
| Physical device | `http://192.168.x.x:3001` | `http://192.168.x.x:5173` |

### 3. Seed the knowledge base

The RAG pipeline needs documents to query. Seed documents are already in `data/raw-docs/anatomy/`.

```bash
chmod +x scripts/ingest.sh
./scripts/ingest.sh
```

Startup indexes the seed documents only when the knowledge table is empty. When you add or edit documents later, run `./scripts/ingest.sh` explicitly. Ingestion rebuilds the table from the current source files, so re-running it does not accumulate duplicate chunks.

---

## Starting the system

### Option A — Services and viewer at once (recommended)

```bash
chmod +x scripts/start.sh scripts/stop.sh
./scripts/start.sh
```

This starts the instruction engine, AI service, API gateway, and web viewer in dependency order, waits for each to be healthy, indexes the knowledge base if it is empty, and prints the URLs. Start the mobile app separately because Expo owns its interactive development session.

### Option B — Manually in separate terminals

```bash
# Terminal 1 — Instruction Engine (no dependencies)
cd services/instruction-engine && pnpm install && pnpm dev

# Terminal 2 — AI Service (requires Ollama running)
cd services/ai-service
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — API Gateway (requires #1 and #2)
cd services/api-gateway && pnpm install && pnpm dev

# Terminal 4 — Web Viewer
cd apps/web-viewer && pnpm install && pnpm dev

# Terminal 5 — Mobile App
cd apps/mobile-app && pnpm install && pnpm start
```

### Stopping

```bash
./scripts/stop.sh
# or press Ctrl+C in the terminal running start.sh
```

---

## Quick smoke test

Once services are running:

```bash
chmod +x scripts/test-integration.sh
./scripts/test-integration.sh
```

Or manually:

```bash
# Health check
curl http://localhost:3001/health

# Manual body system selection (no AI needed — fast)
curl -X POST http://localhost:3001/visual-command \
  -H "Content-Type: application/json" \
  -d '{"region": "brain", "mode": "brain"}'

# Full AI query (requires Ollama + indexed data — slow on first run)
curl -X POST http://localhost:3001/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What does the heart do?"}'
```

---

## Service reference

### API Gateway — port 3001

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Returns `{ status: "online", service, uptime }` |
| `/ask` | POST | Full RAG query → answer + sources + visualCommand |
| `/visual-command` | POST | Direct system selection → visualCommand (no AI) |

**POST /ask request:**
```json
{ "query": "What does the heart do?", "sessionId": "optional" }
```

**POST /ask response:**
```json
{
  "status": true,
  "message": "Query processed",
  "data": {
    "answer": "The heart is a muscular organ...",
    "sources": [{ "title": "...", "url": "...", "snippet": "...", "score": 0.92 }],
    "visualCommand": {
      "focus_region": "heart",
      "view_mode": "heart",
      "highlight": ["Heart_Mesh", "Left_Ventricle", "Right_Ventricle"],
      "animation": "pulse",
      "confidence": 0.6
    }
  }
}
```

**POST /visual-command request:**
```json
{ "region": "brain", "mode": "brain" }
```

**POST /visual-command response:**
```json
{
  "status": true,
  "message": "Visual command generated",
  "data": {
    "focus_region": "brain",
    "view_mode": "brain",
    "highlight": ["Brain_Mesh", "Cerebrum", "Cerebellum", "BrainStem"],
    "animation": "none",
    "confidence": 1.0
  }
}
```

### AI Service — port 8001

| Route | Method | Purpose |
|---|---|---|
| `/health/` | GET | Returns service + Ollama status |
| `/query/` | POST | RAG query → answer + sources + raw_context |
| `/ingest/` | POST | Re-index documents from data/raw-docs/ |

### Instruction Engine — port 3002

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Returns `{ status: true, service }` |
| `/parse` | POST | AI answer → deterministic VisualCommand |
| `/direct` | POST | Region/mode → deterministic VisualCommand |
| `/scene-plan/validate` | POST | Validate ScenePlan v1 against registered capabilities |
| `/scene-plan/from-legacy` | POST | Compile a legacy direct request to a safe static ScenePlan |
| `/asset-manifest/validate` | POST | Validate AssetManifest v1 and reviewer requirements |

### Web Viewer — port 5173

Three.js 3D viewer. Accepts VisualCommand via `postMessage`. See `apps/web-viewer/README.md`.

---

## Adding anatomy knowledge

Place `.md`, `.txt`, or `.pdf` files in `data/raw-docs/` and re-run ingestion:

```bash
./scripts/ingest.sh
# or, while the ai-service is running:
curl -X POST http://localhost:8001/ingest/
```

The ingestion endpoint appends to LanceDB. Keep track of which files have already been indexed until deduplication is added.

Recommended sources for free anatomy content:
- MedlinePlus: https://medlineplus.gov (plain-language, public domain)
- OpenStax Anatomy & Physiology: https://openstax.org/details/books/anatomy-and-physiology-2e (CC BY)
- Wikipedia anatomy articles (CC BY-SA)

---

## Extending the region map

When you add new anatomy terms to the knowledge base, also update the instruction engine's region map so visual commands are generated correctly:

`services/instruction-engine/src/types/regionMap.ts`

```ts
// Add new keyword → view_mode mappings:
export const REGION_TO_VIEW_MODE = {
  kidney: "full_body",    // add when kidney model exists
  thyroid: "full_body",
  // ...
};

// Add new keyword → mesh highlight mappings:
export const REGION_TO_MESHES = {
  kidney: ["Left_Kidney", "Right_Kidney"],
  // ...
};
```

---

### 6a. 3D Anatomy Assets (BodyParts3D)

Raw BodyParts3D OBJ archives are large and are not stored in Git. Download them
from the [BodyParts3D download page](http://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html).

Use these archives when rebuilding or extending the anatomy asset library:

- `isa_BP3D_4.0_obj_99.zip`
- `partof_BP3D_4.0_obj_99.zip`

Extract the required assets into `engines/anatomy-assets/models/`, then convert
or optimize them for the web viewer as needed.

## Adding 3D models

1. Place `.glb` file in `engines/anatomy-assets/models/`
2. Add entry to `engines/anatomy-assets/manifests/asset-registry.md`
3. Add `ViewMode` key to `apps/web-viewer/src/types.ts`
4. Add matching entry to `services/instruction-engine/src/types/regionMap.ts`
5. Add entry to `apps/mobile-app/constants/anatomy.ts`

Keep each `.glb` under 20 MB for mobile WebView performance. Use `gltf-transform optimize` for large files.

The repository currently includes `skeleton.glb` and `spine.glb` alongside the
other tracked GLB assets.

---

## Logs

Service logs are written to `logs/` when using `scripts/start.sh`:

```
logs/instruction-engine.log
logs/ai-service.log
logs/api-gateway.log
logs/web-viewer.log
logs/ollama.log
```

---

## Performance notes

The system targets CPU-only hardware with 16 GB RAM.

- **Model size:** `llama3.2:3b` is the recommended LLM. Do not exceed 7B on 16 GB RAM.
- **First query:** The first query after startup is slow (~15–30 s) as Ollama loads the model into memory. Subsequent queries are faster.
- **Chunk size:** Set to 512 tokens in `rag/pipeline.py` — reduces per-request memory usage.
- **top_k:** Set to 5 retrieved chunks by default — increase for richer answers, decrease for speed.

---

## Disclaimer

Anatomy AI is for educational purposes only. It does not provide medical diagnosis, treatment recommendations, or clinical advice. Always consult a qualified healthcare professional for personal medical concerns.
