/**
 * Design system tokens — single source of truth for all colors, spacing,
 * typography, and radius values throughout Anatomy AI mobile.
 *
 * Design language:
 *   Foundation  — deep midnight navy: models are the hero, UI is supportive
 *   Accent      — medical cyan #00D4FF: precise, clinical without being cold
 *   Secondary   — deep violet #7C5CFC: hierarchy accent, used sparingly
 */

export const Colors = {
  // ── Foundation ──────────────────────────────────────────────────────────────
  bg:           "#080C14",
  surface:      "#0F1724",
  surfaceHigh:  "#141D2E",
  border:       "#1E2D44",
  borderActive: "rgba(0,212,255,0.2)",

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:  "#E8EDF4",
  textSecond:   "#8A97AA",
  textMuted:    "#5A6478",
  textInverse:  "#080C14",

  // ── Accent ──────────────────────────────────────────────────────────────────
  cyan:         "#00D4FF",
  cyanDim:      "rgba(0,212,255,0.10)",
  cyanGlow:     "rgba(0,212,255,0.20)",

  // ── Secondary ───────────────────────────────────────────────────────────────
  violet:       "#7C5CFC",
  violetDim:    "rgba(124,92,252,0.12)",

  // ── Semantic ─────────────────────────────────────────────────────────────────
  success:      "#22C55E",
  successDim:   "rgba(34,197,94,0.12)",
  warning:      "#F59E0B",
  warningDim:   "rgba(245,158,11,0.12)",
  error:        "#F43F5E",
  errorDim:     "rgba(244,63,94,0.12)",

  // ── Status dots ──────────────────────────────────────────────────────────────
  online:       "#22C55E",
  offline:      "#F43F5E",
  degraded:     "#F59E0B",
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  xxl:  28,
  xxxl: 34,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium:  "500" as const,
  semi:    "600" as const,
  bold:    "700" as const,
};

export const Shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

/** Minimum 44pt WCAG touch target */
export const TouchTarget = 44;
