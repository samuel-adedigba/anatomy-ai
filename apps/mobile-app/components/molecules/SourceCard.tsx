import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { SourceRef } from "../../types/api";

type Props = { source: SourceRef; index: number };

export const SourceCard = ({ source, index }: Props) => {
  const hasLink = !!source.url;

  const handlePress = () => {
    if (source.url) {
      Linking.openURL(source.url).catch(() => {});
    }
  };

  return (
    <Pressable
      onPress={hasLink ? handlePress : undefined}
      disabled={!hasLink}
      accessible
      accessibilityRole={hasLink ? "link" : "text"}
      accessibilityLabel={`Source ${index + 1}: ${source.title}${hasLink ? ". Opens in browser." : ""}`}
      style={({ pressed }) => [
        styles.card,
        pressed && hasLink && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {source.title}
        </Text>
        {hasLink && <Text style={styles.linkIcon} aria-hidden>↗</Text>}
      </View>
      {source.snippet ? (
        <Text style={styles.snippet} numberOfLines={3}>
          {source.snippet}
        </Text>
      ) : null}
      {typeof source.score === "number" ? (
        <Text style={styles.score}>
          Relevance: {Math.round(source.score * 100)}%
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.md,
    gap:             Spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           Spacing.sm,
  },
  badge: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: Colors.violetDim,
    borderWidth:     1,
    borderColor:     Colors.violet,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
    marginTop:       1,
  },
  badgeText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    color:      Colors.violet,
  },
  title: {
    flex:       1,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textPrimary,
    lineHeight: 18,
  },
  linkIcon: {
    fontSize: FontSize.sm,
    color:    Colors.cyan,
    flexShrink: 0,
  },
  snippet: {
    fontSize:   FontSize.xs,
    color:      Colors.textSecond,
    lineHeight: 17,
    marginLeft: 28,
  },
  score: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    marginLeft: 28,
  },
  pressed: { opacity: 0.7 },
});
