/**
 * Design system tokens — single source of truth for all colors, spacing,
 * typography, and radius values throughout Anatomy AI mobile.
 *
 * Design language:
 *   Foundation  — deep blue-black: the anatomy model remains the visual focus
 *   Accent      — calm medical teal: clear, trustworthy, and less neon
 *   Surfaces    — layered slate panels with visible AA-compliant boundaries
 */

export const Colors = {
  // ── Foundation ──────────────────────────────────────────────────────────────
  bg:            "#071018",
  canvas:        "#04090E",
  surface:       "#0D1923",
  surfaceHigh:   "#122330",
  surfaceRaised: "#182C3A",
  border:        "#294150",
  borderStrong:  "#3B5C6D",
  borderActive:  "rgba(78,217,198,0.42)",

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:  "#F3F8FA",
  textSecond:   "#B8C7D0",
  textMuted:    "#8497A3",
  textInverse:  "#04110F",

  // ── Accent ──────────────────────────────────────────────────────────────────
  cyan:         "#4ED9C6",
  cyanDim:      "rgba(78,217,198,0.11)",
  cyanGlow:     "rgba(78,217,198,0.24)",

  // ── Secondary ───────────────────────────────────────────────────────────────
  violet:       "#A99AF8",
  violetDim:    "rgba(169,154,248,0.12)",

  // ── Semantic ─────────────────────────────────────────────────────────────────
  success:      "#65D892",
  successDim:   "rgba(101,216,146,0.12)",
  warning:      "#F7C45F",
  warningDim:   "rgba(247,196,95,0.12)",
  error:        "#FF7D93",
  errorDim:     "rgba(255,125,147,0.12)",
  info:         "#7DC7FF",
  infoDim:      "rgba(125,199,255,0.12)",

  // ── Status dots ──────────────────────────────────────────────────────────────
  online:       "#65D892",
  offline:      "#FF7D93",
  degraded:     "#F7C45F",

  // ── Overlays ─────────────────────────────────────────────────────────────────
  scrim:        "rgba(3,9,14,0.78)",
  glass:        "rgba(10,22,31,0.86)",
  whiteAlpha:   "rgba(255,255,255,0.06)",
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
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const FontSize = {
  xs:   12,
  sm:   14,
  base: 16,
  md:   18,
  lg:   21,
  xl:   25,
  xxl:  30,
  xxxl: 36,
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium:  "500" as const,
  semi:    "600" as const,
  bold:    "700" as const,
};

export const Shadow = {
  card: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius:  12,
    elevation:     4,
  },
  elevated: {
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius:  24,
    elevation:     10,
  },
} as const;

/** Minimum 44pt WCAG touch target */
export const TouchTarget = 44;
