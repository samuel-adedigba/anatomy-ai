import React from "react";
import { Text as RNText, TextProps, TextStyle } from "react-native";
import { Colors, FontSize, FontWeight } from "../../constants/theme";

type Variant = "h1" | "h2" | "h3" | "body" | "bodySmall" | "caption" | "label" | "mono";
type Color   = keyof typeof Colors;

type Props = TextProps & {
  variant?: Variant;
  color?:   Color;
  bold?:    boolean;
  center?:  boolean;
};

const variantStyles: Record<Variant, TextStyle> = {
  h1:        { fontSize: FontSize.xxl,  fontWeight: FontWeight.bold,    letterSpacing: -0.5 },
  h2:        { fontSize: FontSize.xl,   fontWeight: FontWeight.semi,    letterSpacing: -0.3 },
  h3:        { fontSize: FontSize.lg,   fontWeight: FontWeight.semi,    letterSpacing: -0.2 },
  body:      { fontSize: FontSize.base, fontWeight: FontWeight.regular, lineHeight: 22 },
  bodySmall: { fontSize: FontSize.sm,   fontWeight: FontWeight.regular, lineHeight: 20 },
  caption:   { fontSize: FontSize.xs,   fontWeight: FontWeight.regular, letterSpacing: 0.2 },
  label:     { fontSize: FontSize.xs,   fontWeight: FontWeight.medium,  letterSpacing: 0.6, textTransform: "uppercase" },
  mono:      { fontSize: FontSize.sm,   fontFamily: "monospace" },
};

export const Text = ({
  variant = "body",
  color   = "textPrimary",
  bold,
  center,
  style,
  ...props
}: Props) => (
  <RNText
    style={[
      { color: Colors[color] },
      variantStyles[variant],
      bold   && { fontWeight: FontWeight.bold },
      center && { textAlign: "center" },
      style,
    ]}
    {...props}
  />
);
