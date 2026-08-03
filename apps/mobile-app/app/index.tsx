/**
 * AnatomyWorkspace — visual-first learning workspace.
 *
 * Wide screens show the question and explanation beside the 3D stage.
 * Narrow screens preserve space for the model and use clear tabs to switch
 * between the 3D view and the readable explanation.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "../constants/theme";
import { useAnatomyStore } from "../store/useAnatomyStore";
import { CameraAction, ScenePlaybackProgress, ViewMode } from "../types/viewer";

import { AppHeader } from "../components/molecules/AppHeader";
import { QueryInput } from "../components/molecules/QueryInput";
import { SystemSelector } from "../components/molecules/SystemSelector";
import {
  WorkspacePane,
  WorkspaceTabs,
} from "../components/molecules/WorkspaceTabs";
import { AnatomyViewerHandle } from "../components/organisms/AnatomyViewer";
import { AnswerPanel } from "../components/organisms/AnswerPanel";
import { ErrorCard } from "../components/organisms/ErrorCard";
import { OnboardingOverlay } from "../components/organisms/OnboardingOverlay";
import { ViewerStage } from "../components/organisms/ViewerStage";

const WIDE_WORKSPACE_BREAKPOINT = 980;

export default function AnatomyWorkspace() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const viewerRef = useRef<AnatomyViewerHandle>(null);
  const isWide = width >= WIDE_WORKSPACE_BREAKPOINT;

  const query = useAnatomyStore((state) => state.query);
  const answer = useAnatomyStore((state) => state.answer);
  const sources = useAnatomyStore((state) => state.sources);
  const isLoading = useAnatomyStore((state) => state.isLoading);
  const error = useAnatomyStore((state) => state.error);
  const currentCommand = useAnatomyStore((state) => state.currentCommand);
  const currentScenePlan = useAnatomyStore((state) => state.currentScenePlan);
  const visualMessage = useAnatomyStore((state) => state.visualMessage);
  const currentMode = useAnatomyStore((state) => state.currentMode);
  const viewerReady = useAnatomyStore((state) => state.viewerReady);
  const serviceHealth = useAnatomyStore((state) => state.serviceHealth);
  const onboardingDismissed = useAnatomyStore(
    (state) => state.onboardingDismissed
  );

  const setQuery = useAnatomyStore((state) => state.setQuery);
  const submitQuery = useAnatomyStore((state) => state.submitQuery);
  const clearAnswer = useAnatomyStore((state) => state.clearAnswer);
  const selectSystem = useAnatomyStore((state) => state.selectSystem);
  const setViewerReady = useAnatomyStore((state) => state.setViewerReady);
  const setViewerLoading = useAnatomyStore((state) => state.setViewerLoading);
  const setCurrentMode = useAnatomyStore((state) => state.setCurrentMode);
  const dismissOnboarding = useAnatomyStore(
    (state) => state.dismissOnboarding
  );
  const refreshHealth = useAnatomyStore((state) => state.refreshHealth);
  const hydrate = useAnatomyStore((state) => state.hydrate);
  const retry = useAnatomyStore((state) => state.retry);

  const [modelLoadingMode, setModelLoadingMode] = useState<ViewMode | null>(null);
  const [activePane, setActivePane] = useState<WorkspacePane>("viewer");
  const [sceneProgress, setSceneProgress] = useState<ScenePlaybackProgress | null>(null);
  const [sceneSpeed, setSceneSpeed] = useState(1);

  useEffect(() => {
    hydrate();
    refreshHealth();
    const healthInterval = setInterval(refreshHealth, 30_000);
    return () => clearInterval(healthInterval);
    // Store actions are stable for the lifetime of the app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewerReady && viewerRef.current && currentScenePlan) {
      setSceneProgress({
        plan_id: currentScenePlan.plan_id,
        time_ms: 0,
        duration_ms: currentScenePlan.duration_ms,
        state: "idle",
        step_id: currentScenePlan.steps[0]?.id,
      });
      setSceneSpeed(1);
      viewerRef.current.sendScenePlan(currentScenePlan);
    } else if (currentCommand && viewerRef.current && viewerReady) {
      setSceneProgress(null);
      viewerRef.current.sendCommand(currentCommand);
    }
  }, [currentCommand, currentScenePlan, viewerReady]);

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    setActivePane("viewer");
    submitQuery();
  }, [submitQuery]);

  const handleSystemSelect = useCallback(
    async (mode: ViewMode) => {
      setActivePane("viewer");
      clearAnswer();
      await selectSystem(mode);
    },
    [clearAnswer, selectSystem]
  );

  const handleCameraControl = useCallback(
    (action: CameraAction) => {
      viewerRef.current?.sendCamera(action, currentMode);
    },
    [currentMode]
  );

  const handleViewerReady = useCallback(() => {
    setViewerReady(true);
  }, [setViewerReady]);

  const handleViewerReset = useCallback(() => {
    setViewerReady(false);
  }, [setViewerReady]);

  const handleModelLoading = useCallback(
    (mode: ViewMode) => {
      setViewerLoading(true);
      setModelLoadingMode(mode);
    },
    [setViewerLoading]
  );

  const handleModelLoaded = useCallback(
    (mode: ViewMode) => {
      setViewerLoading(false);
      setModelLoadingMode(null);
      setCurrentMode(mode);
    },
    [setCurrentMode, setViewerLoading]
  );

  const handleSceneLoading = useCallback(() => {
    setViewerLoading(true);
    setModelLoadingMode("heart");
  }, [setViewerLoading]);

  const handleSceneLoaded = useCallback(() => {
    setViewerLoading(false);
    setModelLoadingMode(null);
  }, [setViewerLoading]);

  const handleViewerError = useCallback(() => {
    setViewerLoading(false);
    setModelLoadingMode(null);
  }, [setViewerLoading]);

  const handleTogglePlayback = useCallback(() => {
    viewerRef.current?.sendSceneControl({
      type: "scene_control",
      action: sceneProgress?.state === "playing" ? "pause" : "play",
    });
  }, [sceneProgress?.state]);

  const handleReplay = useCallback(() => {
    viewerRef.current?.sendSceneControl({ type: "scene_control", action: "replay" });
  }, []);

  const handleStepSelect = useCallback((timeMs: number) => {
    viewerRef.current?.sendSceneControl({ type: "scene_control", action: "pause" });
    viewerRef.current?.sendSceneControl({ type: "scene_control", action: "seek", time_ms: timeMs });
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSceneSpeed(speed);
    viewerRef.current?.sendSceneControl({ type: "scene_control", action: "set_speed", speed });
  }, []);

  const viewerStage = (
    <ViewerStage
      ref={viewerRef}
      currentMode={currentMode}
      modelLoadingMode={modelLoadingMode}
      isProcessing={isLoading}
      viewerReady={viewerReady}
      scenePlan={currentScenePlan}
      sceneProgress={sceneProgress}
      sceneSpeed={sceneSpeed}
      onReady={handleViewerReady}
      onReset={handleViewerReset}
      onModelLoading={handleModelLoading}
      onModelLoaded={handleModelLoaded}
      onSceneLoading={handleSceneLoading}
      onSceneLoaded={handleSceneLoaded}
      onSceneProgress={setSceneProgress}
      onSceneComplete={() => setViewerLoading(false)}
      onSceneFallback={() => setViewerLoading(false)}
      onError={handleViewerError}
      onControl={handleCameraControl}
      onTogglePlayback={handleTogglePlayback}
      onReplay={handleReplay}
      onStepSelect={handleStepSelect}
      onSpeedChange={handleSpeedChange}
      style={styles.fill}
    />
  );

  const answerPanel = (
    <AnswerPanel
      answer={answer}
      sources={sources}
      visualMessage={visualMessage ?? undefined}
      isLoading={isLoading}
      onClear={clearAnswer}
      style={styles.fill}
    />
  );

  return (
    <View style={styles.root}>
      <AppHeader serviceHealth={serviceHealth} />

      <View
        style={[
          styles.workspace,
          isWide ? styles.workspaceWide : styles.workspaceNarrow,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
      >
        {isWide ? (
          <>
            <View style={styles.sidePanel}>
              <QueryInput
                value={query}
                onChangeText={setQuery}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                disabled={serviceHealth === "offline"}
              />

              <SystemSelector
                currentMode={currentMode}
                onSelect={handleSystemSelect}
                disabled={isLoading}
              />

              {error && (
                <ErrorCard
                  error={error}
                  onRetry={error.retryable ? retry : undefined}
                  onDismiss={clearAnswer}
                />
              )}

              <View style={styles.sideAnswer}>{answerPanel}</View>
            </View>

            <View style={styles.visualColumn}>{viewerStage}</View>
          </>
        ) : (
          <>
            <View style={styles.mobileControls}>
              <QueryInput
                value={query}
                onChangeText={setQuery}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                disabled={serviceHealth === "offline"}
                compact
              />

              <SystemSelector
                currentMode={currentMode}
                onSelect={handleSystemSelect}
                disabled={isLoading}
                compact
              />

              {error && (
                <ErrorCard
                  error={error}
                  onRetry={error.retryable ? retry : undefined}
                  onDismiss={clearAnswer}
                />
              )}

              <WorkspaceTabs
                activePane={activePane}
                onChange={setActivePane}
                sourceCount={sources.length}
                hasAnswer={answer.length > 0}
              />
            </View>

            <View style={styles.mobileContent}>
              <View
                style={[
                  styles.mobilePane,
                  activePane !== "viewer" && styles.hiddenPane,
                ]}
                accessibilityElementsHidden={activePane !== "viewer"}
                importantForAccessibility={
                  activePane !== "viewer" ? "no-hide-descendants" : "auto"
                }
              >
                {viewerStage}
              </View>
              <View
                style={[
                  styles.mobilePane,
                  activePane !== "answer" && styles.hiddenPane,
                ]}
                accessibilityElementsHidden={activePane !== "answer"}
                importantForAccessibility={
                  activePane !== "answer" ? "no-hide-descendants" : "auto"
                }
              >
                {answerPanel}
              </View>
            </View>
          </>
        )}
      </View>

      {!onboardingDismissed && (
        <OnboardingOverlay onDismiss={dismissOnboarding} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    minHeight:       0,
    backgroundColor: Colors.bg,
  },
  workspace: {
    flex:      1,
    minHeight: 0,
    width:     "100%",
    maxWidth:  1800,
    alignSelf: "center",
  },
  workspaceWide: {
    flexDirection:     "row",
    gap:               Spacing.lg,
    paddingTop:        Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  workspaceNarrow: {
    gap:               Spacing.md,
    paddingTop:        Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  sidePanel: {
    width:     410,
    maxWidth:  "42%",
    minHeight: 0,
    gap:       Spacing.md,
  },
  sideAnswer: {
    flex:      1,
    minHeight: 240,
  },
  visualColumn: {
    flex:      1,
    minWidth:  0,
    minHeight: 0,
  },
  mobileControls: {
    gap: Spacing.sm,
  },
  mobileContent: {
    flex:      1,
    minHeight: 0,
    position:  "relative",
  },
  mobilePane: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenPane: {
    display: "none",
  },
  fill: {
    flex:      1,
    minHeight: 0,
  },
});
