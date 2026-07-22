#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AI_URL="http://localhost:${AI_SERVICE_PORT:-8001}"
RAW_DOCS="$REPO_ROOT/data/raw-docs"

[ -d "$RAW_DOCS" ] || { echo "Missing data directory: $RAW_DOCS" >&2; exit 1; }
count="$(find "$RAW_DOCS" -type f \( -name '*.md' -o -name '*.txt' -o -name '*.pdf' \) | wc -l | tr -d ' ')"
[ "$count" -gt 0 ] || { echo "No supported documents found in $RAW_DOCS" >&2; exit 1; }

if curl -fsS "$AI_URL/health/" >/dev/null 2>&1; then
  echo "Indexing $count document(s) through the AI service..."
  curl -fsS -X POST "$AI_URL/ingest/" -H 'Content-Type: application/json' -d '{}'
  echo
else
  AI_DIR="$REPO_ROOT/services/ai-service"
  [ -d "$AI_DIR/.venv" ] || python3 -m venv "$AI_DIR/.venv"
  source "$AI_DIR/.venv/bin/activate"
  python -m pip install -r "$AI_DIR/requirements.txt"
  (cd "$AI_DIR" && python "$REPO_ROOT/scripts/ingestion/ingest.py")
fi
