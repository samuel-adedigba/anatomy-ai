import React, { useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Colors, FontSize, Radius, Spacing, TouchTarget } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { Chip } from "../atoms/Chip";
import { SUGGESTED_QUESTIONS } from "../../constants/anatomy";

type Props = {
  value:           string;
  onChangeText:    (text: string) => void;
  onSubmit:        () => void;
  isLoading:       boolean;
  disabled?:       boolean;
};

export const QueryInput = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
  disabled = false,
}: Props) => {
  const inputRef = useRef<TextInput>(null);

  const handleSuggestion = (q: string) => {
    onChangeText(q);
    // Small delay so the text state settles before submit
    setTimeout(onSubmit, 50);
  };

  const canSubmit = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <View style={styles.container}>
      {/* ── Search bar ─────────────────────────────────────────── */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder="Ask about anatomy…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          blurOnSubmit
          editable={!isLoading && !disabled}
          accessibilityLabel="Ask anatomy question"
          accessibilityHint="Type your question and press Ask or the return key"
          maxLength={400}
          multiline={false}
        />
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Ask anatomy question"
          accessibilityState={{ disabled: !canSubmit }}
          style={({ pressed }) => [
            styles.submitBtn,
            !canSubmit && styles.submitDisabled,
            pressed && canSubmit && styles.submitPressed,
          ]}
        >
          <Text style={styles.submitLabel}>
            {isLoading ? "…" : "Ask"}
          </Text>
        </Pressable>
      </View>

      {/* ── Suggestion chips ────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestions}
        accessible={false}
      >
        <Text style={styles.suggestLabel}>Try:</Text>
        {SUGGESTED_QUESTIONS.map((q) => (
          <Chip
            key={q}
            label={q}
            onPress={() => handleSuggestion(q)}
            disabled={isLoading || disabled}
            accessibilityLabel={`Suggested question: ${q}`}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  inputRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  input: {
    flex:            1,
    height:          TouchTarget,
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.lg,
    paddingHorizontal: Spacing.base,
    fontSize:        FontSize.base,
    color:           Colors.textPrimary,
  },
  submitBtn: {
    height:          TouchTarget,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.cyan,
    borderRadius:    Radius.lg,
    alignItems:      "center",
    justifyContent:  "center",
  },
  submitLabel: {
    fontSize:   FontSize.sm,
    fontWeight: "600",
    color:      Colors.textInverse,
  },
  submitDisabled: {
    backgroundColor: Colors.surface,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  submitPressed: { opacity: 0.8 },
  suggestions: {
    paddingHorizontal: Spacing.base,
    gap:               Spacing.sm,
    alignItems:        "center",
  },
  suggestLabel: {
    fontSize: FontSize.xs,
    color:    Colors.textMuted,
  },
});
