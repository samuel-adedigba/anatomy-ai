import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing, TouchTarget } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { ANATOMY_SYSTEMS } from "../../constants/anatomy";
import { ViewMode } from "../../types/viewer";

type Props = {
  currentMode: ViewMode;
  onSelect:    (mode: ViewMode) => void;
  disabled?:   boolean;
};

export const SystemSelector = ({ currentMode, onSelect, disabled = false }: Props) => (
  <View style={styles.wrapper}>
    <Text style={styles.sectionLabel} accessibilityRole="header">
      Body Systems
    </Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel="Body system selector"
      accessibilityRole="tablist"
    >
      {ANATOMY_SYSTEMS.map((system) => {
        const isActive = currentMode === system.key;
        return (
          <Pressable
            key={system.key}
            onPress={() => onSelect(system.key)}
            disabled={disabled}
            accessible
            accessibilityRole="tab"
            accessibilityLabel={`Show ${system.label}`}
            accessibilityState={{ selected: isActive, disabled }}
            style={({ pressed }) => [
              styles.item,
              isActive && styles.itemActive,
              pressed && !disabled && styles.itemPressed,
              disabled && styles.itemDisabled,
            ]}
          >
            <Text style={styles.icon} aria-hidden>
              {system.icon}
            </Text>
            <Text
              style={[
                styles.label,
                isActive && { color: Colors.cyan },
              ]}
              numberOfLines={1}
            >
              {system.shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize:    FontSize.xs,
    fontWeight:  FontWeight.medium,
    color:       Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.base,
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap:               Spacing.sm,
  },
  item: {
    minWidth:        64,
    minHeight:       TouchTarget,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             4,
  },
  itemActive: {
    backgroundColor: Colors.cyanDim,
    borderColor:     Colors.cyanGlow,
  },
  itemPressed:  { opacity: 0.65 },
  itemDisabled: { opacity: 0.4 },
  icon: { fontSize: 18 },
  label: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
    color:      Colors.textSecond,
  },
});
