import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon, AppIconName } from "../atoms/AppIcon";

type Step = { icon: AppIconName; title: string; text: string };

const STEPS: Step[] = [
  {
    icon: "message-text-outline",
    title: "Ask naturally",
    text: "Ask about a structure, movement, or body process.",
  },
  {
    icon: "rotate-3d-variant",
    title: "Explore in 3D",
    text: "Rotate, zoom, and focus the anatomy while you learn.",
  },
  {
    icon: "book-open-page-variant-outline",
    title: "Read the evidence",
    text: "Review the explanation and open its source references.",
  },
];

type Props = {
  onDismiss: () => void;
};

export const OnboardingOverlay = ({ onDismiss }: Props) => (
  <View
    style={styles.backdrop}
    accessibilityViewIsModal
    accessibilityLabel="Welcome to Anatomy AI"
  >
    <View style={styles.card} accessible>
      <View style={styles.heroIcon}>
        <AppIcon name="cube-scan" size={30} color={Colors.cyan} />
      </View>
      <Text style={styles.title}>Welcome to Anatomy AI</Text>
      <Text style={styles.subtitle}>
        See the body while you learn how it works.
      </Text>

      <View style={styles.steps}>
        {STEPS.map((step) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepIcon}>
              <AppIcon name={step.icon} size={21} color={Colors.cyan} />
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onDismiss}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Start exploring anatomy"
        style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.startLabel}>Open the workspace</Text>
        <AppIcon name="arrow-right" size={19} color={Colors.textInverse} />
      </Pressable>

      <Text style={styles.disclaimer}>
        For anatomy education only. Not medical advice.
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.scrim,
    alignItems:      "center",
    justifyContent:  "center",
    padding:         Spacing.xl,
    zIndex:          100,
  },
  card: {
    width:           "100%",
    maxWidth:        460,
    backgroundColor: Colors.surfaceHigh,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.xxl,
    gap:             Spacing.lg,
  },
  heroIcon: {
    width:           64,
    height:          64,
    alignSelf:       "center",
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.xl,
    backgroundColor: Colors.cyanDim,
    borderWidth:     1,
    borderColor:     Colors.borderActive,
  },
  title: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    textAlign:  "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecond,
    textAlign: "center",
    marginTop: -Spacing.sm,
  },
  steps: { gap: Spacing.md },
  step: {
    flexDirection: "row",
    alignItems:    "flex-start",
    gap:           Spacing.md,
  },
  stepIcon: {
    width:           42,
    height:          42,
    flexShrink:      0,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.md,
    backgroundColor: Colors.whiteAlpha,
  },
  stepCopy: {
    flex: 1,
    gap:  2,
  },
  stepTitle: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
  },
  stepText: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecond,
    lineHeight: 20,
  },
  startBtn: {
    minHeight:       50,
    backgroundColor: Colors.cyan,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md,
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             Spacing.sm,
  },
  startLabel: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.bold,
    color:      Colors.textInverse,
  },
  disclaimer: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    textAlign: "center",
  },
});
