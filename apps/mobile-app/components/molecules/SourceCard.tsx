import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon } from "../atoms/AppIcon";
import { SourceRef } from "../../types/api";

type Props = { source: SourceRef; index: number };

export const SourceCard = ({ source, index }: Props) => {
  const safeUrl = source.url && /^https?:\/\//i.test(source.url) ? source.url : undefined;
  const hasLink = !!safeUrl;
  const domain = getSourceDomain(safeUrl);

  const handlePress = () => {
    if (safeUrl) {
      Linking.openURL(safeUrl).catch(() => {});
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
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={2}>
            {source.title}
          </Text>
          {domain && <Text style={styles.domain}>{domain}</Text>}
        </View>
        {hasLink && <AppIcon name="open-in-new" size={17} color={Colors.cyan} />}
      </View>
      {source.snippet ? (
        <Text style={styles.snippet} numberOfLines={4}>
          {source.snippet}
        </Text>
      ) : null}
      {hasLink && (
        <View style={styles.openRow}>
          <AppIcon name="book-open-page-variant-outline" size={15} color={Colors.textSecond} />
          <Text style={styles.openLabel}>Open reference</Text>
        </View>
      )}
    </Pressable>
  );
};

function getSourceDomain(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceHigh,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.base,
    gap:             Spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           Spacing.sm,
  },
  badge: {
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: Colors.cyanDim,
    borderWidth:     1,
    borderColor:     Colors.borderActive,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
    marginTop:       1,
  },
  badgeText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    color:      Colors.cyan,
  },
  titleGroup: {
    flex:     1,
    minWidth: 0,
    gap:      2,
  },
  title: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
    lineHeight: 20,
  },
  domain: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  snippet: {
    fontSize:   FontSize.sm,
    color:      Colors.textSecond,
    lineHeight: 20,
    marginLeft: 34,
  },
  openRow: {
    minHeight:     28,
    marginLeft:    34,
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  openLabel: {
    fontSize:   FontSize.xs,
    color:      Colors.textSecond,
    fontWeight: FontWeight.medium,
  },
  pressed: { opacity: 0.78, borderColor: Colors.cyan },
});
