import { VisualCommand, ViewMode, AnimationType } from "../types";
import {
  REGION_TO_VIEW_MODE,
  REGION_TO_MESHES,
  DEFAULT_COMMAND,
} from "../types/regionMap";

// ─── Animation keyword map ─────────────────────────────────────
const ANIMATION_KEYWORDS: Record<string, AnimationType> = {
  pulse: "pulse",
  pulses: "pulse",
  beat: "pulse",
  beats: "pulse",
  flow: "flow",
  flows: "flow",
  wave: "wave",
  waves: "wave",
  spread: "wave",
  spreads: "wave",
  expand: "expand",
  expands: "expand",
  expanding: "expand",
  contract: "contract",
  contracts: "contract",
  contracting: "contract",
  flash: "highlight_flash",
  flashes: "highlight_flash",
  highlight: "highlight_flash",
  highlights: "highlight_flash",
};

/**
 * Parses AI answer text and raw context to produce a deterministic VisualCommand.
 *
 * Strategy:
 * 1. Tokenise the answer into lowercase words
 * 2. Match against region map to determine focus_region and view_mode
 * 3. Resolve mesh highlight targets from matched region
 * 4. Detect animation keyword from answer
 * 5. Compute confidence based on match quality — low confidence → engine shows default
 */
export const parseAnswerToCommand = (
  answer: string,
  rawContext: string
): VisualCommand => {
  const combined = `${answer} ${rawContext}`.toLowerCase();
  const words = combined.match(/\b[a-z_]+\b/g) ?? [];

  // ─── Match region ──────────────────────────────────────────────
  let matchedRegion: string | null = null;
  let matchedViewMode: ViewMode = "full_body";
  let matchCount = 0;

  for (const word of words) {
    if (REGION_TO_VIEW_MODE[word]) {
      matchedRegion = word;
      matchedViewMode = REGION_TO_VIEW_MODE[word];
      matchCount++;
      // Take the first strong match — the most prominent anatomy term
      break;
    }
  }

  // ─── Resolve mesh targets ──────────────────────────────────────
  const highlight: string[] = matchedRegion
    ? (REGION_TO_MESHES[matchedRegion] ?? [])
    : [];

  // ─── Detect legacy animation ───────────────────────────────────
  // Heart motion is controlled only by an explicitly validated scene plan.
  // Answer prose and retrieved context are evidence, not playback commands.
  let animation: AnimationType = "none";
  if (matchedViewMode !== "heart") {
    for (const word of words) {
      if (ANIMATION_KEYWORDS[word]) {
        animation = ANIMATION_KEYWORDS[word];
        break;
      }
    }
  }

  // ─── Confidence score ──────────────────────────────────────────
  // Simple heuristic: region found + meshes resolved = high confidence
  const confidence =
    matchedRegion && highlight.length > 0
      ? Math.min(0.5 + matchCount * 0.1, 1.0)
      : matchedRegion
      ? 0.4
      : 0.0;

  // ─── Fallback if no region detected ───────────────────────────
  if (confidence === 0) {
    return { ...DEFAULT_COMMAND };
  }

  return {
    focus_region: matchedRegion!,
    view_mode: matchedViewMode,
    highlight,
    animation,
    confidence: parseFloat(confidence.toFixed(2)),
  };
};
