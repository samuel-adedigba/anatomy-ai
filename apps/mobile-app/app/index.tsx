/**
 * AnatomyWorkspace — primary screen of Anatomy AI mobile.
 *
 * Layout (portrait, bottom-sheet answer pattern):
 *   AppHeader (fixed)
 *   QueryInput + suggestions (fixed)
 *   SystemSelector strip (fixed)
 *   [ErrorCard if error]
 *   AnatomyViewer (Three.js, fills remaining space)
 *   ViewerControls (fixed strip)
 *   AnswerPanel (slides up as bottom sheet when answer exists)
 *   OnboardingOverlay (first launch only)
 *   Disclaimer bar (fixed)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontSize, FontWeight, Radius, Spacing } from "../constants/theme";
import { useAnatomyStore } from "../store/useAnatomyStore";
import { getSystemByKey } from "../constants/anatomy";
import { CameraAction, ViewMode } from "../types/viewer";

import { AppHeader }         from "../components/molecules/AppHeader";
import { QueryInput }        from "../components/molecules/QueryInput";
import { SystemSelector }    from "../components/molecules/SystemSelector";
import { ViewerControls }    from "../components/molecules/ViewerControls";
import { AnatomyViewer, AnatomyViewerHandle } from "../components/organisms/AnatomyViewer";
import { AnswerPanel }       from "../components/organisms/AnswerPanel";
import { ErrorCard }         from "../components/organisms/ErrorCard";
import { OnboardingOverlay } from "../components/organisms/OnboardingOverlay";
import { Text }              from "../components/atoms/Text";

export default function AnatomyWorkspace() {
  const insets    = useSafeAreaInsets();
  const viewerRef = useRef<AnatomyViewerHandle>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // ── Store slice ────────────────────────────────────────────────────────────
  const query               = useAnatomyStore((s) => s.query);
  const answer              = useAnatomyStore((s) => s.answer);
  const sources             = useAnatomyStore((s) => s.sources);
  const isLoading           = useAnatomyStore((s) => s.isLoading);
  const error               = useAnatomyStore((s) => s.error);
  const hasAsked            = useAnatomyStore((s) => s.hasAsked);
  const currentCommand      = useAnatomyStore((s) => s.currentCommand);
  const currentMode         = useAnatomyStore((s) => s.currentMode);
  const viewerReady         = useAnatomyStore((s) => s.viewerReady);
  const serviceHealth       = useAnatomyStore((s) => s.serviceHealth);
  const onboardingDismissed = useAnatomyStore((s) => s.onboardingDismissed);

  const setQuery          = useAnatomyStore((s) => s.setQuery);
  const submitQuery       = useAnatomyStore((s) => s.submitQuery);
  const clearAnswer       = useAnatomyStore((s) => s.clearAnswer);
  const selectSystem      = useAnatomyStore((s) => s.selectSystem);
  const setViewerReady    = useAnatomyStore((s) => s.setViewerReady);
  const setViewerLoading  = useAnatomyStore((s) => s.setViewerLoading);
  const setCurrentMode    = useAnatomyStore((s) => s.setCurrentMode);
  const dismissOnboarding = useAnatomyStore((s) => s.dismissOnboarding);
  const refreshHealth     = useAnatomyStore((s) => s.refreshHealth);
  const hydrate           = useAnatomyStore((s) => s.hydrate);
  const retry             = useAnatomyStore((s) => s.retry);

  const [modelLoadingMode, setModelLoadingMode] = useState<ViewMode | null>(null);
  const [panelVisible,     setPanelVisible]     = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    hydrate();
    refreshHealth();
    const id = setInterval(refreshHealth, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Forward visual commands to viewer ──────────────────────────────────────
  useEffect(() => {
    if (currentCommand && viewerRef.current && viewerReady) {
      viewerRef.current.sendCommand(currentCommand);
    }
  }, [currentCommand, viewerReady]);

  // ── Answer panel slide animation ───────────────────────────────────────────
  useEffect(() => {
    if (hasAsked && answer) {
      setPanelVisible(true);
      Animated.spring(panelAnim, {
        toValue: 1, useNativeDriver: true, tension: 80, friction: 11,
      }).start();
    } else {
      Animated.timing(panelAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start(() => setPanelVisible(false));
    }
  }, [hasAsked, answer, panelAnim]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    Keyboard.dismiss();
    submitQuery();
  }, [submitQuery]);

  const handleSystemSelect = useCallback(async (mode: ViewMode) => {
    clearAnswer();
    await selectSystem(mode);
  }, [selectSystem, clearAnswer]);

  const handleCameraControl = useCallback((action: CameraAction) => {
    viewerRef.current?.sendCamera(action, currentMode);
  }, [currentMode]);

  const handleClosePanel = useCallback(() => clearAnswer(), [clearAnswer]);

  const handleViewerReady     = useCallback(() => setViewerReady(true),          [setViewerReady]);
  const handleModelLoading    = useCallback((mode: ViewMode) => {
    setViewerLoading(true);
    setModelLoadingMode(mode);
  }, [setViewerLoading]);
  const handleModelLoaded     = useCallback((mode: ViewMode) => {
    setViewerLoading(false);
    setModelLoadingMode(null);
    setCurrentMode(mode);
  }, [setViewerLoading, setCurrentMode]);
  const handleViewerError     = useCallback(() => {
    setViewerLoading(false);
    setModelLoadingMode(null);
  }, [setViewerLoading]);

  const handleDismissError    = useCallback(() => clearAnswer(), [clearAnswer]);

  const currentSystem = getSystemByKey(currentMode);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>

      {/* ─ App header ─────────────────────────────────────────────────────── */}
      <AppHeader serviceHealth={serviceHealth} />

      {/* ─ Query input ────────────────────────────────────────────────────── */}
      <View style={styles.inputSection}>
        <QueryInput
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          disabled={serviceHealth === "offline"}
        />
      </View>

      {/* ─ System selector ────────────────────────────────────────────────── */}
      <View style={styles.selectorSection}>
        <SystemSelector
          currentMode={currentMode}
          onSelect={handleSystemSelect}
          disabled={isLoading}
        />
      </View>

      {/* ─ API error card ─────────────────────────────────────────────────── */}
      {error && (
        <ErrorCard
          error={error}
          onRetry={error.retryable ? retry : undefined}
          onDismiss={handleDismissError}
        />
      )}

      {/* ─ 3D viewer (flex 1, always rendered) ───────────────────────────── */}
      <View style={styles.viewerWrapper}>
        {/* Current mode badge */}
        <View
          style={styles.modeBadge}
          accessible
          accessibilityLabel={`Viewing: ${currentSystem.label}`}
        >
          <Text style={styles.modeIcon} aria-hidden>{currentSystem.icon}</Text>
          <Text style={styles.modeLabel}>{currentSystem.label}</Text>
          {modelLoadingMode && (
            <ActivityIndicator
              size="small"
              color={Colors.cyan}
              style={{ marginLeft: Spacing.xs }}
              accessibilityLabel={`Loading ${modelLoadingMode} model`}
            />
          )}
        </View>

        <AnatomyViewer
          ref={viewerRef}
          style={styles.viewer}
          onReady={handleViewerReady}
          onModelLoading={handleModelLoading}
          onModelLoaded={handleModelLoaded}
          onError={handleViewerError}
        />

        {/* Processing overlay while AI request is in-flight */}
        {isLoading && (
          <View
            style={styles.aiOverlay}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Processing your anatomy question"
            pointerEvents="none"
          >
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={styles.aiOverlayText}>Analysing your question…</Text>
          </View>
        )}
      </View>

      {/* ─ Camera controls ────────────────────────────────────────────────── */}
      <ViewerControls
        onControl={handleCameraControl}
        disabled={!viewerReady}
      />

      {/* ─ Answer panel (animated bottom sheet) ──────────────────────────── */}
      {panelVisible && (
        <Animated.View
          style={[
            styles.answerPanel,
            {
              transform: [{
                translateY: panelAnim.interpolate({
                  inputRange:  [0, 1],
                  outputRange: [320, 0],
                }),
              }],
              opacity: panelAnim,
            },
          ]}
        >
          <AnswerPanel
            answer={answer}
            sources={sources}
            onClose={handleClosePanel}
          />
        </Animated.View>
      )}

      {/* ─ Onboarding overlay ────────────────────────────────────────────── */}
      {!onboardingDismissed && (
        <OnboardingOverlay onDismiss={dismissOnboarding} />
      )}

      {/* ─ Persistent disclaimer bar ─────────────────────────────────────── */}
      <View
        style={styles.disclaimer}
        accessible
        accessibilityRole="text"
        accessibilityLabel="This tool is for anatomy education. It does not diagnose conditions or provide treatment advice."
      >
        <Text style={styles.disclaimerText}>
          For anatomy education only · Not medical advice
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: Colors.bg,
  },
  inputSection: {
    paddingTop: Spacing.xs,
  },
  selectorSection: {
    paddingBottom: Spacing.xs,
  },
  viewerWrapper: {
    flex:     1,
    position: "relative",
  },
  viewer: { flex: 1 },
  modeBadge: {
    position:          "absolute",
    top:               Spacing.md,
    left:              Spacing.md,
    zIndex:            10,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               Spacing.xs,
    backgroundColor:   "rgba(8,12,20,0.78)",
    borderWidth:       1,
    borderColor:       Colors.border,
    borderRadius:      Radius.full,
    paddingVertical:   5,
    paddingHorizontal: Spacing.md,
  },
  modeIcon:  { fontSize: 14 },
  modeLabel: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
    color:      Colors.textPrimary,
    letterSpacing: 0.2,
  },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,12,20,0.70)",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             Spacing.md,
    zIndex:          20,
  },
  aiOverlayText: {
    fontSize: FontSize.sm,
    color:    Colors.textSecond,
  },
  answerPanel: {
    position: "absolute",
    bottom:   0,
    left:     0,
    right:    0,
    zIndex:   50,
  },
  disclaimer: {
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.base,
    backgroundColor:   Colors.bg,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
  },
  disclaimerText: {
    fontSize:  FontSize.xs,
    color:     Colors.textMuted,
    textAlign: "center",
  },
});
