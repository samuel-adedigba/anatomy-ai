import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";

type Step = { icon: string; text: string };

const STEPS: Step[] = [
  { icon: "💬", text: "Ask any question about human anatomy in plain language." },
  { icon: "🧠", text: "Explore body systems — skeleton, muscles, nerves, and more." },
  { icon: "👆", text: "Drag to rotate the 3D model. Pinch or scroll to zoom." },
  { icon: "📚", text: "This tool is for education only — not medical diagnosis." },
];

type Props = {
  onDismiss: () => void;
};

export const OnboardingOverlay = ({ onDismiss }: Props) => (
  <View style={styles.backdrop}>
    <View style={styles.card}>
      <Text style={styles.title}>Welcome to Anatomy AI</Text>
      <Text style={styles.subtitle}>
        An interactive 3D anatomy learning tool
      </Text>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepIcon} aria-hidden>{step.icon}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
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
        <Text style={styles.startLabel}>Start exploring</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,12,20,0.90)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         Spacing.xl,
    zIndex:          100,
  },
  card: {
    width:           "100%",
    maxWidth:        400,
    backgroundColor: Colors.surfaceHigh,
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.xl,
    gap:             Spacing.lg,
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
    fontSize:  20,
    flexShrink: 0,
    marginTop:  -1,
  },
  stepText: {
    flex:      1,
    fontSize:  FontSize.base,
    color:     Colors.textPrimary,
    lineHeight: 22,
  },
  startBtn: {
    backgroundColor: Colors.cyan,
    borderRadius:    Radius.lg,
    paddingVertical: Spacing.md,
    alignItems:      "center",
  },
  startLabel: {
    fontSize:   FontSize.base,
    fontWeight: FontWeight.bold,
    color:      Colors.textInverse,
  },
});
