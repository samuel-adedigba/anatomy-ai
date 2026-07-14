import React from "react";
import { Pressable, PressableProps, StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radius, TouchTarget } from "../../constants/theme";
import { Text } from "./Text";

type Props = PressableProps & {
  icon:         string; // emoji or text character
  label:        string; // accessibility label
  size?:        number;
  variant?:     "ghost" | "filled" | "outlined";
  active?:      boolean;
  style?:       ViewStyle;
};

export const IconButton = ({
  icon,
  label,
  size    = TouchTarget,
  variant = "ghost",
  active  = false,
  disabled,
  style,
  ...props
}: Props) => {
  const bg =
    variant === "filled"   ? Colors.cyan     :
    variant === "outlined" ? "transparent"   :
    active                 ? Colors.cyanDim  : "transparent";

  const border =
    variant === "outlined" ? Colors.border   :
    active                 ? Colors.cyanGlow : "transparent";

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: active }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: bg, borderColor: border },
        variant === "outlined" && styles.outlined,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <Text
        variant="body"
        style={{
          fontSize: size * 0.42,
          color: disabled
            ? Colors.textMuted
            : variant === "filled"
              ? Colors.textInverse
              : active
                ? Colors.cyan
                : Colors.textSecond,
        }}
      >
        {icon}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   Radius.md,
    borderWidth:    1,
    borderColor:    "transparent",
  },
  outlined: { borderWidth: 1 },
  pressed:  { opacity: 0.65 },
  disabled: { opacity: 0.35 },
});
