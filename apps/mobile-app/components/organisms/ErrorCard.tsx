import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon } from "../atoms/AppIcon";
import { ApiError } from "../../types/api";

type Props = {
  error:     ApiError;
  onRetry?:  () => void;
  onDismiss?: () => void;
};

export const ErrorCard = ({ error, onRetry, onDismiss }: Props) => (
  <View
    style={styles.card}
    accessible
    accessibilityRole="alert"
    accessibilityLabel={`Error: ${error.message}`}
  >
    <View style={styles.header}>
      <View style={styles.icon}>
        <AppIcon name="alert-circle-outline" size={20} color={Colors.error} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>We could not complete that request</Text>
        <Text style={styles.body}>{error.message}</Text>
      </View>
    </View>
    <View style={styles.actions}>
      {error.retryable && onRetry && (
        <Pressable
          onPress={onRetry}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.retryLabel}>Try again</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Dismiss error"
          style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.dismissLabel}>Dismiss</Text>
        </Pressable>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.errorDim,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.error,
    padding:         Spacing.base,
    gap:             Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           Spacing.md,
  },
  icon: {
    width:           38,
    height:          38,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.md,
    backgroundColor: Colors.errorDim,
  },
  copy: { flex: 1, gap: 3 },
  title: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.semi,
    color:      Colors.error,
  },
  body: {
    fontSize:  FontSize.sm,
    color:     Colors.textPrimary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap:           Spacing.sm,
    marginTop:     Spacing.xs,
  },
  retryBtn: {
    minHeight:         44,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor:   Colors.surface,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.error,
  },
  retryLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.error,
  },
  dismissBtn: {
    minHeight:         44,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  dismissLabel: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
  },
});
