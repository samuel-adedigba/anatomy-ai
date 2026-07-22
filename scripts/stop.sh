#!/usr/bin/env bash
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/logs"
PIDS_FILE="$LOG_DIR/pids"

kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null || true
}

if [ -f "$PIDS_FILE" ]; then
  read -r -a pids <"$PIDS_FILE"
  for pid in "${pids[@]}"; do kill_tree "$pid"; done
  rm -f "$PIDS_FILE"
else
  for port in "${API_GATEWAY_PORT:-3001}" "${INSTRUCTION_ENGINE_PORT:-3002}" \
    "${AI_SERVICE_PORT:-8001}" "${WEB_VIEWER_PORT:-5173}"; do
    for pid in $(lsof -ti :"$port" 2>/dev/null || true); do kill_tree "$pid"; done
  done
fi

echo "Anatomy AI services stopped."
