# api-gateway

Node.js / Express / TypeScript — main backend for Anatomy AI.

## Responsibility
- Receives all queries from the mobile app
- Sanitizes and validates input (prompt injection guard)
- Forwards to `ai-service` (Python RAG)
- Forwards AI output to `instruction-engine`
- Returns unified `{ answer, sources, visualCommand, scenePlan? }` to frontend

## Routes
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /ask | Full AI query pipeline |
| POST | /visual-command | Direct visual mode/region switch |

## Setup
```bash
cp ../../.env.example .env
npm install
npm run dev
```

## Environment Variables
See `.env.example` at project root.
