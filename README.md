# 🧠 Anatomy AI

**Local-first, evidence-grounded, multimodal anatomy intelligence system.**

---

## Architecture Overview

```
anatomy-ai/
├── apps/
│   ├── mobile-app/          React Native (Expo) — drop your template here
│   └── web-viewer/          Three.js visual engine
│
├── services/
│   ├── api-gateway/         Node.js — main backend, routes all traffic
│   ├── ai-service/          Python — RAG pipeline + local LLM
│   └── instruction-engine/  TypeScript — AI response → visual commands
│
├── engines/
│   └── anatomy-assets/      GLTF/GLB 3D models + manifest
│
├── data/
│   ├── raw-docs/            Drop medical PDFs + markdown here
│   ├── processed/           Auto-generated intermediate data
│   └── vector-db/           LanceDB (auto-created on first ingest)
│
├── configs/
│   ├── models/              Ollama model config
│   └── prompts/             System prompt templates
│
└── scripts/
    ├── ingestion/           Standalone ingestion runner
    └── embedding/           Embedding smoke tests
```

---

## Request Flow

```
User query (mobile-app)
  → POST /ask (api-gateway :3001)
    → POST /query (ai-service :8000)     ← RAG + LLM
    → POST /parse (instruction-engine :3002)  ← AI → VisualCommand
  ← { answer, sources, visualCommand }
  → postMessage to WebView (web-viewer)
    → Three.js executes VisualCommand
```

---

## Quick Start

### 1. Prerequisites
```bash
# Install Ollama
brew install ollama   # macOS
# or: https://ollama.com/download

# Pull local models
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### 2. Environment
```bash
cp .env.example .env
```

### 3. AI Service (Python)
```bash
cd services/ai-service
pip install -r requirements.txt
python main.py
```

### 4. API Gateway (Node.js)
```bash
cd services/api-gateway
npm install
npm run dev
```

### 5. Instruction Engine (Node.js)
```bash
cd services/instruction-engine
npm install
npm run dev
```

### 6. Web Viewer (Three.js)
```bash
cd apps/web-viewer
npm install
npm run dev
```

### 6a. 3D Anatomy Assets (BodyParts3D)
Raw OBJ archives are large and are not stored in git. Download them from:
- http://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

Use these archives:
- isa_BP3D_4.0_obj_99.zip
- partof_BP3D_4.0_obj_99.zip

### 7. Mobile App
```bash
cd apps/mobile-app
# Copy your Expo template here first, then:
npm install
npx expo start
```

### 8. Ingest your first documents
```bash
# Drop PDFs into data/raw-docs/, then:
curl -X POST http://localhost:8000/ingest
# or run the standalone script:
python scripts/ingestion/ingest.py
```

---

## Service Ports

| Service | Port |
|---------|------|
| api-gateway | 3001 |
| ai-service | 8000 |
| instruction-engine | 3002 |
| web-viewer | 5173 |

---

## Key Design Decisions

- **Local-first** — Ollama + LanceDB, zero cloud dependency
- **CPU target** — 3B model, 512-token chunks, fits in 16GB RAM
- **Instruction Layer** — AI text → deterministic JSON → Three.js (no hallucinated visuals)
- **Educational scope** — not a diagnostic tool; escalation notes built into prompts
- **Independent services** — each folder runs standalone, developed and tested in isolation

---

## ⚠️ Disclaimer
Anatomy AI is for educational purposes only.
It does not provide medical diagnosis or treatment advice.
Always consult a qualified healthcare professional for personal medical decisions.
