import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing, TouchTarget } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { Chip } from "../atoms/Chip";
import { AppIcon } from "../atoms/AppIcon";
import { SUGGESTED_QUESTIONS } from "../../constants/anatomy";

type Props = {
  value:           string;
  onChangeText:    (text: string) => void;
  onSubmit:        () => void;
  isLoading:       boolean;
  disabled?:       boolean;
  compact?:        boolean;
};

export const QueryInput = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
  disabled = false,
  compact = false,
}: Props) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleSuggestion = (q: string) => {
    onChangeText(q);
    setTimeout(onSubmit, 0);
  };

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.heading} accessibilityRole="header">
            Ask Anatomy AI
          </Text>
          {!compact && (
            <Text style={styles.helper}>
              Ask about a structure, movement, or body process.
            </Text>
          )}
        </View>
        <View style={styles.modeTag}>
          <AppIcon name="motion-play-outline" size={15} color={Colors.cyan} />
          <Text style={styles.modeTagText}>Visual answer</Text>
        </View>
      </View>

      <View style={[styles.composer, focused && styles.composerFocused]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, compact && styles.inputCompact]}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={canSubmit ? onSubmit : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="How does the heart pump blood?"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          editable={!isLoading && !disabled}
          accessibilityLabel="Anatomy question"
          accessibilityHint="Ask about anatomy, movement, or how a body process works"
          maxLength={400}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          accessible
          accessibilityRole="button"
          accessibilityLabel={isLoading ? "Preparing answer" : "Ask Anatomy AI"}
          accessibilityState={{ disabled: !canSubmit, busy: isLoading }}
          style={({ pressed }) => [
            styles.submitBtn,
            !canSubmit && styles.submitDisabled,
            pressed && canSubmit && styles.submitPressed,
          ]}
        >
          <AppIcon
            name={isLoading ? "dots-horizontal" : "arrow-up-bold"}
            size={20}
            color={canSubmit ? Colors.textInverse : Colors.textMuted}
          />
          {!compact && (
            <Text style={[styles.submitLabel, !canSubmit && styles.submitLabelDisabled]}>
              Ask
            </Text>
          )}
        </Pressable>
      </View>

      {!compact && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestions}
          accessible={false}
        >
          <Text style={styles.suggestLabel}>Try a question</Text>
          {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
            <Chip
              key={q}
              label={q}
              onPress={() => handleSuggestion(q)}
              disabled={isLoading || disabled}
              accessibilityLabel={`Suggested question: ${q}`}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap:             Spacing.md,
    padding:         Spacing.base,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.lg,
  },
  headingRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            Spacing.md,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: 2 },
  heading: {
    color:      Colors.textPrimary,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semi,
  },
  helper: {
    color:    Colors.textSecond,
    fontSize: FontSize.sm,
  },
  modeTag: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   Colors.cyanDim,
    borderRadius:      Radius.full,
    paddingVertical:   5,
    paddingHorizontal: Spacing.sm,
  },
  modeTagText: {
    color:      Colors.cyan,
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  composer: {
    flexDirection:   "row",
    alignItems:      "flex-end",
    gap:             Spacing.sm,
    padding:         6,
    backgroundColor: Colors.bg,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.md,
  },
  composerFocused: {
    borderColor: Colors.cyan,
  },
  input: {
    flex:              1,
    minHeight:         70,
    maxHeight:         120,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.sm,
    fontSize:          FontSize.base,
    lineHeight:        23,
    color:             Colors.textPrimary,
  },
  inputCompact: { minHeight: 48, maxHeight: 82 },
  submitBtn: {
    minWidth:        TouchTarget,
    height:          TouchTarget,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cyan,
    borderRadius:    Radius.md,
    flexDirection:   "row",
    gap:             6,
    alignItems:      "center",
    justifyContent:  "center",
  },
  submitLabel: {
    fontSize:   FontSize.sm,
    fontWeight: "600",
    color:      Colors.textInverse,
  },
  submitDisabled: {
    backgroundColor: Colors.surfaceHigh,
  },
  submitPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  submitLabelDisabled: { color: Colors.textMuted },
  suggestions: {
    gap:        Spacing.sm,
    alignItems: "center",
  },
  suggestLabel: {
    fontSize:   FontSize.xs,
    color:      Colors.textSecond,
    fontWeight: FontWeight.medium,
  },
});
