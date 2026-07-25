import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing, TouchTarget } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon, AppIconName } from "../atoms/AppIcon";

export type WorkspacePane = "viewer" | "answer";

type Props = {
  activePane: WorkspacePane;
  onChange: (pane: WorkspacePane) => void;
  sourceCount: number;
  hasAnswer: boolean;
};

type Tab = {
  key: WorkspacePane;
  label: string;
  icon: AppIconName;
};

const TABS: Tab[] = [
  { key: "viewer", label: "3D view", icon: "cube-scan" },
  { key: "answer", label: "Explanation", icon: "text-box-outline" },
];

export const WorkspaceTabs = ({
  activePane,
  onChange,
  sourceCount,
  hasAnswer,
}: Props) => (
  <View
    style={styles.tabs}
    accessibilityRole="tablist"
    accessibilityLabel="Workspace views"
  >
    {TABS.map((tab) => {
      const active = tab.key === activePane;
      const showCount = tab.key === "answer" && sourceCount > 0;

      return (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          accessibilityRole="tab"
          accessibilityLabel={
            tab.key === "answer" && hasAnswer
              ? `Explanation with ${sourceCount} sources`
              : tab.label
          }
          accessibilityState={{ selected: active }}
          style={({ pressed }) => [
            styles.tab,
            active && styles.tabActive,
            pressed && styles.tabPressed,
          ]}
        >
          <AppIcon
            name={tab.icon}
            size={18}
            color={active ? Colors.cyan : Colors.textSecond}
          />
          <Text style={[styles.label, active && styles.labelActive]}>
            {tab.label}
          </Text>
          {showCount && (
            <View style={[styles.count, active && styles.countActive]}>
              <Text style={[styles.countText, active && styles.countTextActive]}>
                {sourceCount}
              </Text>
            </View>
          )}
          {tab.key === "answer" && hasAnswer && !showCount && (
            <View style={styles.availableDot} />
          )}
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  tabs: {
    minHeight:       TouchTarget + 8,
    padding:         4,
    flexDirection:   "row",
    gap:             4,
    borderRadius:    Radius.md,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  tab: {
    minHeight:      TouchTarget,
    flex:           1,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            Spacing.sm,
    borderRadius:   Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth:     1,
    borderColor:     Colors.borderActive,
  },
  tabPressed: { opacity: 0.76 },
  label: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textSecond,
  },
  labelActive: { color: Colors.textPrimary },
  count: {
    minWidth:         20,
    height:           20,
    paddingHorizontal: 5,
    alignItems:       "center",
    justifyContent:   "center",
    borderRadius:     Radius.full,
    backgroundColor:  Colors.whiteAlpha,
  },
  countActive: { backgroundColor: Colors.cyanDim },
  countText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.semi,
    color:      Colors.textSecond,
  },
  countTextActive: { color: Colors.cyan },
  availableDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: Colors.cyan,
  },
});
