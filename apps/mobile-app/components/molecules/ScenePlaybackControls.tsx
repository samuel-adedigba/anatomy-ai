import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import type { ScenePlan } from "../../types/scenePlan.generated";
import type { ScenePlaybackProgress } from "../../types/viewer";
import { IconButton } from "../atoms/IconButton";
import { Text } from "../atoms/Text";

const SPEEDS = [0.5, 1, 1.5, 2] as const;

type Props = {
  plan: ScenePlan;
  progress: ScenePlaybackProgress;
  speed: number;
  disabled?: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onStepSelect: (timeMs: number) => void;
  onSpeedChange: (speed: number) => void;
};

export function ScenePlaybackControls({
  plan,
  progress,
  speed,
  disabled = false,
  onTogglePlay,
  onReplay,
  onStepSelect,
  onSpeedChange,
}: Props) {
  const activeStep = plan.steps.find((step) => step.id === progress.step_id) ??
    plan.steps.find(
      (step) => progress.time_ms >= step.start_ms && progress.time_ms < step.end_ms
    ) ?? plan.steps[0];
  const progressRatio = progress.duration_ms > 0
    ? Math.min(1, Math.max(0, progress.time_ms / progress.duration_ms))
    : 0;
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed as typeof SPEEDS[number]) + 1) % SPEEDS.length];
  const isPlaying = progress.state === "playing";

  return (
    <View style={styles.container} accessibilityLabel="Visual explanation playback">
      <View style={styles.captionRow} accessible accessibilityLiveRegion="polite">
        <Text style={styles.stepCount}>
          Step {Math.max(1, plan.steps.findIndex((step) => step.id === activeStep?.id) + 1)} of {plan.steps.length}
        </Text>
        <Text style={styles.caption}>{activeStep?.caption ?? plan.learning_objective}</Text>
      </View>

      <View
        style={styles.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel="Explanation progress"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progressRatio * 100) }}
      >
        <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
      </View>

      <View style={styles.actionRow}>
        <IconButton
          icon={isPlaying ? "pause" : "play"}
          label={isPlaying ? "Pause explanation" : "Play explanation"}
          onPress={onTogglePlay}
          disabled={disabled}
          variant="filled"
        />
        <IconButton
          icon="replay"
          label="Replay explanation"
          onPress={onReplay}
          disabled={disabled}
          variant="outlined"
        />
        <Pressable
          onPress={() => onSpeedChange(nextSpeed)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${speed} times. Change speed`}
          accessibilityState={{ disabled }}
          style={({ pressed }) => [styles.speedButton, pressed && styles.pressed]}
        >
          <Text style={styles.speedText}>{speed}×</Text>
        </Pressable>
        <Text style={styles.timeText}>
          {formatTime(progress.time_ms)} / {formatTime(progress.duration_ms)}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.steps}
        accessibilityRole="tablist"
      >
        {plan.steps.map((step, index) => {
          const selected = step.id === activeStep?.id;
          return (
            <Pressable
              key={step.id}
              onPress={() => onStepSelect(step.start_ms)}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityLabel={`Step ${index + 1}: ${step.caption}`}
              accessibilityState={{ selected, disabled }}
              style={({ pressed }) => [
                styles.stepButton,
                selected && styles.stepButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.stepText, selected && styles.stepTextActive]}>
                {index + 1}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function formatTime(timeMs: number): string {
  const seconds = Math.max(0, Math.floor(timeMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 14,
    right: Spacing.md,
    bottom: Spacing.md,
    width: 360,
    maxWidth: "92%",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    backgroundColor: Colors.glass,
  },
  captionRow: { gap: 2 },
  stepCount: {
    color: Colors.cyan,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semi,
  },
  caption: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 19 },
  progressTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },
  progressFill: { height: "100%", backgroundColor: Colors.cyan },
  actionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  speedButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  speedText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semi },
  timeText: { marginLeft: "auto", color: Colors.textSecond, fontSize: FontSize.xs },
  steps: { gap: Spacing.xs },
  stepButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  stepButtonActive: { borderColor: Colors.cyan, backgroundColor: Colors.cyanDim },
  stepText: { color: Colors.textSecond, fontSize: FontSize.sm, fontWeight: FontWeight.semi },
  stepTextActive: { color: Colors.cyan },
  pressed: { opacity: 0.72 },
});
