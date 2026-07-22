#!/usr/bin/env bash
set -Eeuo pipefail

GATEWAY_URL="http://localhost:${API_GATEWAY_PORT:-3001}"
AI_URL="http://localhost:${AI_SERVICE_PORT:-8001}"
INSTRUCTION_URL="http://localhost:${INSTRUCTION_ENGINE_PORT:-3002}"
VIEWER_URL="http://localhost:${WEB_VIEWER_PORT:-5173}"

pass=0; fail=0
check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "✓ $name"; pass=$((pass + 1)); else echo "✗ $name"; fail=$((fail + 1)); fi
}

check "API gateway health" curl -fsS "$GATEWAY_URL/health"
check "AI service health" curl -fsS "$AI_URL/health/"
check "Instruction engine health" curl -fsS "$INSTRUCTION_URL/health"
check "Web viewer" curl -fsS "$VIEWER_URL"

check "Direct visual command" curl -fsS -X POST "$GATEWAY_URL/visual-command" \
  -H 'Content-Type: application/json' -d '{"region":"brain","mode":"brain"}'
check "Instruction engine direct command" curl -fsS -X POST "$INSTRUCTION_URL/direct" \
  -H 'Content-Type: application/json' -d '{"region":"spine","mode":"spine"}'
check "AI-backed ask" curl -fsS --max-time 130 -X POST "$GATEWAY_URL/ask" \
  -H 'Content-Type: application/json' -d '{"query":"What does the heart do?"}'

echo "Passed: $pass  Failed: $fail"
[ "$fail" -eq 0 ]
