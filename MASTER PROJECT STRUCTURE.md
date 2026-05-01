anatomy-ai/
│
├── apps/
│   ├── mobile-app/              # React Native (Expo)
│   ├── web-viewer/             # Three.js Web App (optional but powerful)
│
├── services/
│   ├── api-gateway/            # Node.js (main backend)
│   ├── ai-service/             # Python (LLM + RAG)
│   ├── instruction-engine/     # Converts AI → Visual Commands
│
├── engines/
│   ├── visual-engine/          # Three.js core rendering logic
│   ├── anatomy-assets/         # 3D models (skeleton, muscles, etc.)
│
├── data/
│   ├── raw-docs/               # PDFs, research, medical docs
│   ├── processed/              # chunked + embedded data
│   ├── vector-db/              # LanceDB storage
│
├── configs/
│   ├── models/                 # model configs (Ollama / llama.cpp)
│   ├── prompts/                # system prompts + templates
│
├── scripts/
│   ├── ingestion/              # data ingestion scripts
│   ├── embedding/              # embedding pipelines
│
├── docs/
│   ├── architecture.md
│   ├── api-spec.md
│
├── docker/                     # (optional future scaling)
│
├── .env
├── README.md
