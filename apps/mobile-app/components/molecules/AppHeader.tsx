import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, FontSize, FontWeight, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { HealthStatus } from "../../types/api";

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
  const status = STATUS_MAP[serviceHealth] ?? STATUS_MAP.offline;

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.left}>
        <Text style={styles.logo} accessibilityRole="header">
          Anatomy AI
        </Text>
        <Text style={styles.tagline}>Educational anatomy explorer</Text>
      </View>
      <View
        style={styles.statusRow}
        accessible
        accessibilityLabel={status.label}
        accessibilityRole="text"
      >
        <View style={[styles.dot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusText, { color: status.color }]}>
          {serviceHealth === "online"   ? "Online"   :
           serviceHealth === "degraded" ? "Degraded" : "Offline"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom:     Spacing.md,
    backgroundColor:   Colors.surfaceHigh,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection:     "row",
    alignItems:        "flex-end",
    justifyContent:    "space-between",
  },
  left: { gap: 2 },
  logo: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  statusRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  statusText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});
