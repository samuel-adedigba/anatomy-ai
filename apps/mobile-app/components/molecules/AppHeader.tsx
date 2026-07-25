import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { HealthStatus } from "../../types/api";
import { AppIcon } from "../atoms/AppIcon";

type Props = {
  serviceHealth: HealthStatus;
};

const STATUS_MAP: Record<HealthStatus, { color: string; label: string }> = {
  online:   { color: Colors.online,   label: "Service online" },
  degraded: { color: Colors.degraded, label: "Service degraded" },
  offline:  { color: Colors.offline,  label: "Service offline" },
};

export const AppHeader = ({ serviceHealth }: Props) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const status = STATUS_MAP[serviceHealth] ?? STATUS_MAP.offline;

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <AppIcon name="cube-scan" size={22} color={Colors.cyan} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.logo} accessibilityRole="header">
            Anatomy AI
          </Text>
          {!compact && (
            <Text style={styles.tagline}>Ask, explore, and understand in 3D</Text>
          )}
        </View>
      </View>

      <View style={styles.headerMeta}>
        {!compact && (
          <View
            style={styles.educationBadge}
            accessible
            accessibilityLabel="Designed for anatomy education"
          >
            <AppIcon name="shield-check-outline" size={16} color={Colors.textSecond} />
            <Text style={styles.educationText}>Education only</Text>
          </View>
        )}
        <View
          style={styles.statusRow}
          accessible
          accessibilityLabel={status.label}
          accessibilityRole="text"
        >
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {serviceHealth === "online"   ? "Online"   :
             serviceHealth === "degraded" ? "Limited" : "Offline"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight:         68,
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.md,
    backgroundColor:   Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
  },
  brand: {
    minWidth:      0,
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing.md,
  },
  brandMark: {
    width:           42,
    height:          42,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.md,
    backgroundColor: Colors.cyanDim,
    borderWidth:     1,
    borderColor:     Colors.borderActive,
  },
  brandCopy: { minWidth: 0, gap: 1 },
  logo: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: FontSize.sm,
    color:    Colors.textSecond,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing.sm,
  },
  educationBadge: {
    minHeight:         34,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.whiteAlpha,
  },
  educationText: {
    fontSize: FontSize.xs,
    color:    Colors.textSecond,
  },
  statusRow: {
    minHeight:     34,
    flexDirection: "row",
    alignItems:    "center",
    gap:           7,
    paddingHorizontal: Spacing.md,
    borderRadius:  Radius.full,
    backgroundColor: Colors.surface,
    borderWidth:   1,
    borderColor:   Colors.border,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  statusText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
