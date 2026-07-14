import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { Colors, Radius, FontSize, FontWeight, TouchTarget } from "../../constants/theme";
import { Text } from "./Text";

type Props = {
  label:     string;
  onPress:   () => void;
  active?:   boolean;
  disabled?: boolean;
  style?:    ViewStyle;
  accessibilityLabel?: string;
};

export const Chip = ({
  label,
  onPress,
  active   = false,
  disabled = false,
  style,
  accessibilityLabel,
}: Props) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessible
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected: active, disabled }}
    style={({ pressed }) => [
      styles.chip,
      active   && styles.active,
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
      style,
    ]}
  >
    <Text
      style={{
        fontSize:   FontSize.sm,
        fontWeight: FontWeight.medium,
        color: active ? Colors.cyan : Colors.textSecond,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    minHeight:       TouchTarget * 0.75,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius:    Radius.full,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      "center",
    justifyContent:  "center",
  },
  active: {
    backgroundColor: Colors.cyanDim,
    borderColor:     Colors.cyanGlow,
  },
  disabled: { opacity: 0.4 },
  pressed:  { opacity: 0.6 },
});
