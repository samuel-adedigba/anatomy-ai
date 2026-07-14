import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { SourceCard } from "../molecules/SourceCard";
import { SourceRef } from "../../types/api";

type Props = {
  answer:  string;
  sources: SourceRef[];
  onClose?: () => void;
};

export const AnswerPanel = ({ answer, sources, onClose }: Props) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = sources.length > 0;

  return (
    <View style={styles.panel}>
      {/* ── Handle & header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.handle} accessibilityElementsHidden />
        <View style={styles.headerRow}>
          <Text style={styles.heading} accessibilityRole="header">
            Anatomy Explanation
          </Text>
          {onClose && (
            <Pressable
              onPress={onClose}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close answer panel"
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Educational content — not medical advice
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Answer body ──────────────────────────────────────────── */}
        <Text style={styles.answerText} selectable>
          {answer}
        </Text>

        {/* ── Sources ──────────────────────────────────────────────── */}
        {hasSources && (
          <View style={styles.sourcesSection}>
            <Pressable
              onPress={() => setSourcesOpen((v) => !v)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={
                sourcesOpen ? "Hide source references" : "Open source references"
              }
              accessibilityState={{ expanded: sourcesOpen }}
              style={styles.sourcesToggle}
            >
              <Text style={styles.sourcesLabel}>
                Sources ({sources.length})
              </Text>
              <Text style={styles.sourcesChevron}>
                {sourcesOpen ? "▲" : "▼"}
              </Text>
            </Pressable>

            {sourcesOpen && (
              <View style={styles.sourcesList} aria-live="polite">
                {sources.map((s, i) => (
                  <SourceCard key={`${s.title}-${i}`} source={s} index={i} />
                ))}
                <Text style={styles.sourcesNote}>
                  Sources are provided for reference. Always verify medical
                  information with qualified healthcare professionals.
                </Text>
              </View>
            )}
          </View>
        )}

        {!hasSources && (
          <Text style={styles.noSources}>
            No source references were returned for this query.
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surfaceHigh,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth:  1,
    borderLeftWidth: 1,
    borderRightWidth:1,
    borderColor:     Colors.border,
    maxHeight:       "75%",
    overflow:        "hidden",
  },
  header: {
    padding:         Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap:             Spacing.sm,
  },
  handle: {
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.border,
    alignSelf:       "center",
  },
  headerRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
  },
  closeBtn: {
    padding:     Spacing.sm,
    borderRadius: Radius.md,
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
  },
  disclaimer: {
    backgroundColor: Colors.cyanDim,
    borderRadius:    Radius.sm,
    paddingVertical:   4,
    paddingHorizontal: Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.cyanGlow,
    alignSelf:       "flex-start",
  },
  disclaimerText: {
    fontSize:   FontSize.xs,
    color:      Colors.cyan,
    fontWeight: FontWeight.medium,
  },
  scroll: { flexGrow: 0 },
  scrollContent: {
    padding: Spacing.base,
    gap:     Spacing.lg,
  },
  answerText: {
    fontSize:  FontSize.base,
    color:     Colors.textPrimary,
    lineHeight: 24,
  },
  sourcesSection: { gap: Spacing.sm },
  sourcesToggle: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: Spacing.sm,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
  },
  sourcesLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
    color:      Colors.textSecond,
  },
  sourcesChevron: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  sourcesList: { gap: Spacing.sm },
  sourcesNote: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    lineHeight: 17,
    fontStyle: "italic",
  },
  noSources: {
    fontSize:  FontSize.sm,
    color:     Colors.textMuted,
    fontStyle: "italic",
  },
});
