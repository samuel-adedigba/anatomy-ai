import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Spacing,
  TouchTarget,
} from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon } from "../atoms/AppIcon";
import { SourceCard } from "../molecules/SourceCard";
import { SourceRef } from "../../types/api";

type Props = {
  answer: string;
  sources: SourceRef[];
  visualMessage?: string;
  isLoading?: boolean;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const AnswerPanel = ({
  answer,
  sources,
  visualMessage,
  isLoading = false,
  onClear,
  style,
}: Props) => {
  const hasAnswer = answer.trim().length > 0;

  return (
    <View style={[styles.panel, style]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.headerIcon}>
            <AppIcon name="text-box-outline" size={19} color={Colors.cyan} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.heading} accessibilityRole="header">
              Explanation
            </Text>
            <Text style={styles.subheading}>
              Grounded answer and references
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {sources.length > 0 && (
            <View
              style={styles.sourceCount}
              accessible
              accessibilityLabel={`${sources.length} sources`}
            >
              <Text style={styles.sourceCountText}>{sources.length}</Text>
              <AppIcon name="book-open-page-variant-outline" size={15} color={Colors.textSecond} />
            </View>
          )}
          {hasAnswer && onClear && (
            <Pressable
              onPress={onClear}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Clear answer"
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <AppIcon name="close" size={19} color={Colors.textSecond} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        accessibilityLiveRegion="polite"
      >
        {isLoading ? (
          <View style={styles.state}>
            <View style={styles.stateIcon}>
              <ActivityIndicator size="small" color={Colors.cyan} />
            </View>
            <Text style={styles.stateTitle}>Preparing your visual answer</Text>
            <Text style={styles.stateBody}>
              Finding relevant anatomy and connecting it to the 3D view.
            </Text>
          </View>
        ) : hasAnswer ? (
          <>
            <View style={styles.answerSection}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>Answer</Text>
                <View style={styles.educationTag}>
                  <AppIcon name="shield-check-outline" size={14} color={Colors.textSecond} />
                  <Text style={styles.educationTagText}>Education only</Text>
                </View>
              </View>
              <AnswerContent answer={answer} />
            </View>

            {visualMessage && (
              <View style={styles.visualNotice} accessibilityRole="alert">
                <AppIcon name="information-outline" size={18} color={Colors.warning} />
                <Text style={styles.visualNoticeText}>{visualMessage}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.sourcesSection}>
              <View style={styles.sourcesHeading}>
                <View style={styles.sourcesTitleRow}>
                  <AppIcon
                    name="book-open-page-variant-outline"
                    size={19}
                    color={Colors.cyan}
                  />
                  <Text style={styles.sourcesTitle} accessibilityRole="header">
                    Sources
                  </Text>
                </View>
                <Text style={styles.sourcesSummary}>
                  {sources.length > 0
                    ? `${sources.length} reference${sources.length === 1 ? "" : "s"} used`
                    : "No reference links returned"}
                </Text>
              </View>

              {sources.length > 0 ? (
                <View style={styles.sourcesList}>
                  {sources.map((source, index) => (
                    <SourceCard
                      key={`${source.url ?? source.title}-${index}`}
                      source={source}
                      index={index}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.noSources}>
                  <AppIcon name="information-outline" size={18} color={Colors.textMuted} />
                  <Text style={styles.noSourcesText}>
                    The answer did not include reference links. Treat it as incomplete
                    until a source is available.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.disclaimer}>
              <AppIcon name="shield-check-outline" size={18} color={Colors.textSecond} />
              <Text style={styles.disclaimerText}>
                Anatomy education only. This content does not diagnose conditions or
                replace medical advice.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.state}>
            <View style={styles.stateIcon}>
              <AppIcon name="motion-play-outline" size={28} color={Colors.cyan} />
            </View>
            <Text style={styles.stateTitle}>Your explanation will appear here</Text>
            <Text style={styles.stateBody}>
              Ask how a structure works or moves. Anatomy AI will connect the answer
              to the interactive 3D view.
            </Text>
            <View style={styles.example}>
              <AppIcon name="lightbulb-on-outline" size={17} color={Colors.warning} />
              <Text style={styles.exampleText}>
                Try: “Show how the heart pumps blood.”
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const AnswerContent = ({ answer }: { answer: string }) => {
  const lines = answer
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return (
      <Text style={styles.answerText} selectable>
        {answer.trim()}
      </Text>
    );
  }

  return (
    <View style={styles.answerBlocks}>
      {lines.map((line, index) => {
        const bullet = /^[-*]\s+/.test(line);
        const content = line.replace(/^[-*]\s+/, "");

        if (bullet) {
          return (
            <View key={`${content}-${index}`} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <Text style={styles.bulletText} selectable>
                {content}
              </Text>
            </View>
          );
        }

        return (
          <Text key={`${content}-${index}`} style={styles.answerText} selectable>
            {content}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    minHeight:       0,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        "hidden",
  },
  header: {
    minHeight:         70,
    paddingHorizontal: Spacing.base,
    paddingVertical:   Spacing.md,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor:   Colors.surfaceHigh,
  },
  headerTitle: {
    minWidth:      0,
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing.md,
  },
  headerIcon: {
    width:           38,
    height:          38,
    borderRadius:    Radius.md,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: Colors.cyanDim,
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 1 },
  heading: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
  },
  subheading: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing.xs,
  },
  sourceCount: {
    minHeight:         34,
    paddingHorizontal: Spacing.sm,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.whiteAlpha,
  },
  sourceCountText: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.semi,
    color:      Colors.textSecond,
  },
  clearButton: {
    width:          TouchTarget,
    height:         TouchTarget,
    borderRadius:   Radius.md,
    alignItems:     "center",
    justifyContent: "center",
  },
  buttonPressed: { backgroundColor: Colors.whiteAlpha },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: {
    flexGrow: 1,
    padding:  Spacing.lg,
    gap:      Spacing.xl,
  },
  answerSection: { gap: Spacing.md },
  visualNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningDim,
  },
  visualNoticeText: {
    flex: 1,
    color: Colors.textSecond,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  sectionLabelRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            Spacing.sm,
  },
  sectionLabel: {
    color:         Colors.textMuted,
    fontSize:      FontSize.xs,
    fontWeight:    FontWeight.semi,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  educationTag: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
  },
  educationTagText: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
  answerBlocks: { gap: Spacing.md },
  answerText: {
    fontSize:   FontSize.base,
    color:      Colors.textPrimary,
    lineHeight: 27,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           Spacing.md,
  },
  bullet: {
    width:           6,
    height:          6,
    marginTop:       10,
    borderRadius:    3,
    backgroundColor: Colors.cyan,
  },
  bulletText: {
    flex:       1,
    fontSize:   FontSize.base,
    color:      Colors.textPrimary,
    lineHeight: 27,
  },
  divider: {
    height:          1,
    backgroundColor: Colors.border,
  },
  sourcesSection: { gap: Spacing.md },
  sourcesHeading: { gap: 3 },
  sourcesTitleRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           Spacing.sm,
  },
  sourcesTitle: {
    color:      Colors.textPrimary,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semi,
  },
  sourcesSummary: {
    marginLeft: 27,
    fontSize:   FontSize.xs,
    color:      Colors.textMuted,
  },
  sourcesList: { gap: Spacing.md },
  noSources: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             Spacing.sm,
    padding:         Spacing.md,
    borderRadius:    Radius.md,
    backgroundColor: Colors.whiteAlpha,
  },
  noSourcesText: {
    flex:       1,
    fontSize:   FontSize.sm,
    color:      Colors.textSecond,
    lineHeight: 21,
  },
  disclaimer: {
    flexDirection:   "row",
    alignItems:      "flex-start",
    gap:             Spacing.sm,
    padding:         Spacing.md,
    backgroundColor: Colors.whiteAlpha,
    borderRadius:    Radius.md,
  },
  disclaimerText: {
    flex:       1,
    fontSize:   FontSize.xs,
    color:      Colors.textSecond,
    lineHeight: 18,
  },
  state: {
    flex:           1,
    minHeight:      260,
    maxWidth:       420,
    alignSelf:      "center",
    alignItems:     "center",
    justifyContent: "center",
    padding:        Spacing.xl,
    gap:            Spacing.sm,
  },
  stateIcon: {
    width:           58,
    height:          58,
    marginBottom:    Spacing.sm,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.lg,
    backgroundColor: Colors.cyanDim,
    borderWidth:     1,
    borderColor:     Colors.borderActive,
  },
  stateTitle: {
    color:      Colors.textPrimary,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semi,
    textAlign:  "center",
  },
  stateBody: {
    color:      Colors.textSecond,
    fontSize:   FontSize.sm,
    lineHeight: 21,
    textAlign:  "center",
  },
  example: {
    marginTop:       Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             Spacing.sm,
    borderRadius:    Radius.md,
    backgroundColor: Colors.warningDim,
  },
  exampleText: {
    flex:       1,
    color:      Colors.textSecond,
    fontSize:   FontSize.xs,
    lineHeight: 18,
  },
});
