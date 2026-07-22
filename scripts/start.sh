#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/logs"
mkdir -p "$LOG_DIR"
PIDS=()
INSTRUCTION_PORT="${INSTRUCTION_ENGINE_PORT:-3002}"
AI_PORT="${AI_SERVICE_PORT:-8001}"
GATEWAY_PORT="${API_GATEWAY_PORT:-3001}"
VIEWER_PORT="${WEB_VIEWER_PORT:-5173}"
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://localhost:$AI_PORT}"
export INSTRUCTION_ENGINE_URL="${INSTRUCTION_ENGINE_URL:-http://localhost:$INSTRUCTION_PORT}"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${CYAN}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    fail "Required command not found: $1"
    echo "Install it from: $2"
    exit 1
  }
}

wait_for_service() {
  local name="$1" url="$2" max_wait="${3:-30}" elapsed=0
  echo -n "Waiting for $name"
  until curl -fsS "$url" >/dev/null 2>&1; do
    (( elapsed >= max_wait )) && { echo; fail "$name did not become healthy within ${max_wait}s"; return 1; }
    echo -n "."
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo " ready"
}

ensure_node_dependencies() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    (cd "$dir" && pnpm install --frozen-lockfile)
  fi
}

require_command node "https://nodejs.org"
require_command pnpm "https://pnpm.io/installation"
require_command python3 "https://python.org"
require_command curl "https://curl.se/download.html"
require_command ollama "https://ollama.com/download"

shutdown() {
  trap - INT TERM EXIT
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  rm -f "$LOG_DIR/pids"
}
trap shutdown INT TERM EXIT

log "Checking Ollama"
if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
  ollama serve >"$LOG_DIR/ollama.log" 2>&1 &
  PIDS+=("$!")
  wait_for_service "Ollama" "http://localhost:11434/api/tags" 30
fi

models="$(curl -fsS http://localhost:11434/api/tags | python3 -c 'import json, sys; print(" ".join(m.get("name", "") for m in json.load(sys.stdin).get("models", [])))')"
grep -q 'llama3.2:3b' <<<"$models" || ollama pull llama3.2:3b
grep -q 'nomic-embed-text' <<<"$models" || ollama pull nomic-embed-text
ok "Ollama is ready"

ensure_node_dependencies "$REPO_ROOT/services/instruction-engine"
log "Starting instruction engine"
(cd "$REPO_ROOT/services/instruction-engine" && pnpm dev >"$LOG_DIR/instruction-engine.log" 2>&1) & IE_PID=$!
PIDS+=("$IE_PID")
wait_for_service "instruction-engine" "http://localhost:$INSTRUCTION_PORT/health"

AI_DIR="$REPO_ROOT/services/ai-service"
if [ ! -d "$AI_DIR/.venv" ]; then python3 -m venv "$AI_DIR/.venv"; fi
source "$AI_DIR/.venv/bin/activate"
REQUIREMENTS_FILE="$AI_DIR/requirements.txt"
REQUIREMENTS_MARKER="$AI_DIR/.venv/.requirements.sha256"
REQUIREMENTS_HASH="$(python3 -c 'import hashlib, pathlib, sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())' "$REQUIREMENTS_FILE")"
if [ "$(cat "$REQUIREMENTS_MARKER" 2>/dev/null || true)" != "$REQUIREMENTS_HASH" ] || \
   ! python -c 'import fastapi, lancedb, llama_index.core' >/dev/null 2>&1; then
  python -m pip install -r "$REQUIREMENTS_FILE"
  printf '%s\n' "$REQUIREMENTS_HASH" >"$REQUIREMENTS_MARKER"
fi
log "Starting AI service"
(cd "$AI_DIR" && uvicorn main:app --host 0.0.0.0 --port "$AI_PORT" --reload >"$LOG_DIR/ai-service.log" 2>&1) & AI_PID=$!
PIDS+=("$AI_PID")
wait_for_service "ai-service" "http://localhost:$AI_PORT/health/" 60

AI_HEALTH="$(curl -fsS "http://localhost:$AI_PORT/health/")"
if python3 -c 'import json, sys; sys.exit(0 if json.load(sys.stdin).get("knowledge_base_ready") else 1)' <<<"$AI_HEALTH"; then
  ok "Knowledge base already indexed"
else
  log "Knowledge base is empty; indexing data/raw-docs"
  curl -fsS -X POST "http://localhost:$AI_PORT/ingest/" \
    -H 'Content-Type: application/json' -d '{}' >/"$LOG_DIR/ingest-result.json"
  ok "Knowledge base indexed"
fi

ensure_node_dependencies "$REPO_ROOT/services/api-gateway"
log "Starting API gateway"
(cd "$REPO_ROOT/services/api-gateway" && pnpm dev >"$LOG_DIR/api-gateway.log" 2>&1) & GW_PID=$!
PIDS+=("$GW_PID")
wait_for_service "api-gateway" "http://localhost:$GATEWAY_PORT/health"

ensure_node_dependencies "$REPO_ROOT/apps/web-viewer"
log "Starting web viewer"
(cd "$REPO_ROOT/apps/web-viewer" && pnpm dev -- --port "$VIEWER_PORT" >"$LOG_DIR/web-viewer.log" 2>&1) & WV_PID=$!
PIDS+=("$WV_PID")
wait_for_service "web-viewer" "http://localhost:$VIEWER_PORT" 30

printf '%s\n' "${PIDS[*]}" >"$LOG_DIR/pids"
echo
ok "All backend and viewer services are running"
echo "Instruction engine: http://localhost:$INSTRUCTION_PORT/health"
echo "AI service:         http://localhost:$AI_PORT/health/"
echo "API gateway:        http://localhost:$GATEWAY_PORT/health"
echo "Web viewer:         http://localhost:$VIEWER_PORT"
echo "Logs:               $LOG_DIR"
echo
echo "Start the mobile app separately: cd apps/mobile-app && pnpm start"

shutdown() {
  trap - INT TERM EXIT
  [ -f "$LOG_DIR/pids" ] || exit 0
  read -r -a pids <"$LOG_DIR/pids"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  rm -f "$LOG_DIR/pids"
}
wait
