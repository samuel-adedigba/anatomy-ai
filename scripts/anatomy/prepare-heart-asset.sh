#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_PATH="${ANATOMY_HEART_SOURCE:-$REPOSITORY_ROOT/engines/anatomy-assets/work/heart-source/heart.educational.v1.blend}"
OUTPUT_PATH="${ANATOMY_HEART_OUTPUT:-$REPOSITORY_ROOT/engines/anatomy-assets/work/heart-source/heart.educational.v1.glb}"
PYTHON_SCRIPT="$REPOSITORY_ROOT/scripts/anatomy/prepare-heart-asset.py"
PREVIEW_SCRIPT="$REPOSITORY_ROOT/scripts/anatomy/preview-heart-asset.py"
RENDER_SCRIPT="$REPOSITORY_ROOT/scripts/anatomy/render-heart-audit.py"

is_compatible_blender() {
  local candidate="$1"
  local version_line
  local major_version

  [[ -x "$candidate" ]] || return 1
  version_line="$("$candidate" --version 2>/dev/null | head -n 1)"
  [[ "$version_line" =~ ^Blender\ ([0-9]+)\. ]] || return 1
  major_version="${BASH_REMATCH[1]}"
  (( major_version >= 5 ))
}

find_blender() {
  local candidate

  if [[ -n "${ANATOMY_BLENDER_BIN:-}" ]] && is_compatible_blender "$ANATOMY_BLENDER_BIN"; then
    printf '%s\n' "$ANATOMY_BLENDER_BIN"
    return
  fi

  while IFS= read -r candidate; do
    if is_compatible_blender "$candidate"; then
      printf '%s\n' "$candidate"
      return
    fi
  done < <(find "$HOME/Downloads" /opt -maxdepth 4 -type f -name blender -perm -111 2>/dev/null | sort -Vr)

  candidate="$(command -v blender 2>/dev/null || true)"
  if [[ -n "$candidate" ]] && is_compatible_blender "$candidate"; then
    printf '%s\n' "$candidate"
    return
  fi

  return 1
}

BLENDER_EXECUTABLE="$(find_blender || true)"
if [[ -z "$BLENDER_EXECUTABLE" ]]; then
  printf '%s\n' "Blender 5.x was not found." >&2
  printf '%s\n' "Extract Blender 5.x under $HOME/Downloads, or set ANATOMY_BLENDER_BIN to its executable." >&2
  exit 1
fi

printf 'Using %s\n' "$("$BLENDER_EXECUTABLE" --version | head -n 1)"

if [[ ! -f "$SOURCE_PATH" ]] && [[ "${1:-}" != "preview" ]] && [[ "${1:-}" != "render-audit" ]]; then
  printf 'Heart source does not exist: %s\n' "$SOURCE_PATH" >&2
  printf '%s\n' "Set ANATOMY_HEART_SOURCE to the Blender 5.x source file described in docs/asset-intake/heart-asset-candidate.md." >&2
  exit 1
fi

if [[ "${1:-}" == "preview" ]]; then
  if [[ ! -f "$OUTPUT_PATH" ]]; then
    printf 'Prepared asset does not exist: %s\n' "$OUTPUT_PATH" >&2
    printf '%s\n' "Run $0 first." >&2
    exit 1
  fi
  printf 'Opening preview for %s\n' "$OUTPUT_PATH"
  exec "$BLENDER_EXECUTABLE" \
    --python "$PREVIEW_SCRIPT" \
    -- \
    --asset "$OUTPUT_PATH"
fi

if [[ "${1:-}" == "render-audit" ]]; then
  if [[ ! -f "$OUTPUT_PATH" ]]; then
    printf 'Prepared asset does not exist: %s\n' "$OUTPUT_PATH" >&2
    printf '%s\n' "Run $0 first." >&2
    exit 1
  fi
  AUDIT_OUTPUT="$REPOSITORY_ROOT/engines/anatomy-assets/work/heart-source/audit-renders"
  printf 'Rendering audit frames to %s\n' "$AUDIT_OUTPUT"
  exec "$BLENDER_EXECUTABLE" \
    --background \
    --python "$RENDER_SCRIPT" \
    -- \
    --asset "$OUTPUT_PATH" \
    --output-dir "$AUDIT_OUTPUT"
fi

if [[ $# -gt 0 ]]; then
  printf 'Usage: %s [preview|render-audit]\n' "$0" >&2
  exit 1
fi

printf 'Preparing %s\n' "$OUTPUT_PATH"

exec "$BLENDER_EXECUTABLE" \
  --background \
  --python "$PYTHON_SCRIPT" \
  -- \
  --source "$SOURCE_PATH" \
  --output "$OUTPUT_PATH" \
  --overwrite
