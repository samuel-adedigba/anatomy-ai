import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing, TouchTarget } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AnatomyIcon } from "../atoms/AppIcon";
import { ANATOMY_SYSTEMS } from "../../constants/anatomy";
import { ViewMode } from "../../types/viewer";

type Props = {
  currentMode: ViewMode;
  onSelect:    (mode: ViewMode) => void;
  disabled?:   boolean;
  compact?:    boolean;
};

export const SystemSelector = ({
  currentMode,
  onSelect,
  disabled = false,
  compact = false,
}: Props) => (
  <View style={styles.wrapper}>
    <View style={styles.headingRow}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        Explore systems
      </Text>
      {!compact && (
        <Text style={styles.sectionHint}>Choose what appears in the 3D view</Text>
      )}
    </View>
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
            <AnatomyIcon
              mode={system.key}
              size={19}
              color={isActive ? Colors.cyan : Colors.textSecond}
            />
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
    gap:             Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.lg,
  },
  headingRow: {
    paddingHorizontal: Spacing.base,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               Spacing.sm,
  },
  sectionLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
  },
  sectionHint: {
    flexShrink: 1,
    fontSize:   FontSize.xs,
    color:      Colors.textMuted,
    textAlign:  "right",
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap:               Spacing.sm,
  },
  item: {
    minWidth:        104,
    minHeight:       TouchTarget,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceHigh,
    borderRadius:    Radius.full,
    borderWidth:     1,
    borderColor:     Colors.border,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             7,
  },
  itemActive: {
    backgroundColor: Colors.cyanDim,
    borderColor:     Colors.cyan,
  },
  itemPressed:  { opacity: 0.72 },
  itemDisabled: { opacity: 0.4 },
  label: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textSecond,
  },
});
