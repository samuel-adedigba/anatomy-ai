import React, { forwardRef } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import {
  Colors,
  FontSize,
  FontWeight,
  Radius,
  Shadow,
  Spacing,
} from "../../constants/theme";
import { getSystemByKey } from "../../constants/anatomy";
import { CameraAction, ViewMode } from "../../types/viewer";
import { Text } from "../atoms/Text";
import { AnatomyIcon, AppIcon } from "../atoms/AppIcon";
import { ViewerControls } from "../molecules/ViewerControls";
import { AnatomyViewer, AnatomyViewerHandle } from "./AnatomyViewer";

type Props = {
  currentMode: ViewMode;
  modelLoadingMode: ViewMode | null;
  isProcessing: boolean;
  viewerReady: boolean;
  onReady: () => void;
  onModelLoading: (mode: ViewMode) => void;
  onModelLoaded: (mode: ViewMode) => void;
  onSceneLoading: () => void;
  onSceneLoaded: () => void;
  onError: (message: string, mode?: ViewMode) => void;
  onControl: (action: CameraAction) => void;
  style?: StyleProp<ViewStyle>;
};

export const ViewerStage = forwardRef<AnatomyViewerHandle, Props>(
  (
    {
      currentMode,
      modelLoadingMode,
      isProcessing,
      viewerReady,
      onReady,
      onModelLoading,
      onModelLoaded,
      onSceneLoading,
      onSceneLoaded,
      onError,
      onControl,
      style,
    },
    ref
  ) => {
    const { width } = useWindowDimensions();
    const compact = width < 560;
    const currentSystem = getSystemByKey(currentMode);

    return (
      <View style={[styles.stage, style]}>
        <AnatomyViewer
          ref={ref}
          style={styles.viewer}
          onReady={onReady}
          onModelLoading={onModelLoading}
          onModelLoaded={onModelLoaded}
          onSceneLoading={onSceneLoading}
          onSceneLoaded={onSceneLoaded}
          onError={onError}
        />

        <View style={styles.stageHeader} pointerEvents="none">
          <View style={styles.subjectBadge}>
            <View style={styles.subjectIcon}>
              <AnatomyIcon mode={currentMode} size={21} color={Colors.cyan} />
            </View>
            <View style={styles.subjectCopy}>
              <Text style={styles.eyebrow}>Interactive 3D</Text>
              <Text style={styles.subjectName} numberOfLines={1}>
                {currentSystem.label}
              </Text>
            </View>
          </View>

          <View
            style={styles.viewerStatus}
            accessible
            accessibilityLabel={
              modelLoadingMode
                ? `Loading ${getSystemByKey(modelLoadingMode).label}`
                : viewerReady
                  ? "3D viewer ready"
                  : "3D viewer starting"
            }
          >
            {modelLoadingMode ? (
              <ActivityIndicator size="small" color={Colors.cyan} />
            ) : (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: viewerReady ? Colors.success : Colors.warning },
                ]}
              />
            )}
            {!compact && (
              <Text style={styles.viewerStatusText}>
                {modelLoadingMode ? "Loading model" : viewerReady ? "Ready" : "Starting"}
              </Text>
            )}
          </View>
        </View>

        {isProcessing && (
          <View
            style={styles.processingCard}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Preparing your visual anatomy answer"
            pointerEvents="none"
          >
            <ActivityIndicator size="small" color={Colors.cyan} />
            <View style={styles.processingCopy}>
              <Text style={styles.processingTitle}>Building your visual answer</Text>
              {!compact && (
                <Text style={styles.processingBody}>
                  Matching the explanation to the 3D anatomy.
                </Text>
              )}
            </View>
          </View>
        )}

        {!compact && (
          <View style={styles.gestureHint} pointerEvents="none">
            <AppIcon name="gesture-tap" size={16} color={Colors.textMuted} />
            <Text style={styles.gestureHintText}>
              Drag to rotate · Scroll or pinch to zoom
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <ViewerControls onControl={onControl} disabled={!viewerReady} />
        </View>
      </View>
    );
  }
);

ViewerStage.displayName = "ViewerStage";

const styles = StyleSheet.create({
  stage: {
    minHeight:       0,
    position:        "relative",
    overflow:        "hidden",
    borderRadius:    Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    backgroundColor: Colors.canvas,
    ...Shadow.card,
  },
  viewer: { flex: 1, backgroundColor: Colors.canvas },
  stageHeader: {
    position:       "absolute",
    zIndex:         10,
    top:            Spacing.md,
    left:           Spacing.md,
    right:          Spacing.md,
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            Spacing.sm,
  },
  subjectBadge: {
    minWidth:          0,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               Spacing.sm,
    paddingVertical:   7,
    paddingHorizontal: 8,
    paddingRight:      Spacing.md,
    borderRadius:      Radius.md,
    backgroundColor:   Colors.glass,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  subjectIcon: {
    width:           36,
    height:          36,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.sm,
    backgroundColor: Colors.cyanDim,
  },
  subjectCopy: { minWidth: 0, gap: 1 },
  eyebrow: {
    color:         Colors.textMuted,
    fontSize:      10,
    fontWeight:    FontWeight.semi,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  subjectName: {
    maxWidth:   180,
    color:      Colors.textPrimary,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
  },
  viewerStatus: {
    minHeight:         38,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: Spacing.md,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.glass,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  statusDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  viewerStatusText: {
    color:      Colors.textSecond,
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  processingCard: {
    position:          "absolute",
    zIndex:            12,
    top:               82,
    alignSelf:         "center",
    maxWidth:          "86%",
    minHeight:         54,
    paddingVertical:   Spacing.sm,
    paddingHorizontal: Spacing.base,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               Spacing.md,
    borderRadius:      Radius.md,
    backgroundColor:   Colors.glass,
    borderWidth:       1,
    borderColor:       Colors.borderActive,
    ...Shadow.card,
  },
  processingCopy: { flexShrink: 1, gap: 1 },
  processingTitle: {
    color:      Colors.textPrimary,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semi,
  },
  processingBody: {
    color:    Colors.textSecond,
    fontSize: FontSize.xs,
  },
  gestureHint: {
    position:          "absolute",
    zIndex:            8,
    left:               Spacing.md,
    bottom:             Spacing.md,
    minHeight:          34,
    paddingHorizontal:  Spacing.md,
    flexDirection:      "row",
    alignItems:         "center",
    gap:                6,
    borderRadius:       Radius.full,
    backgroundColor:    Colors.glass,
  },
  gestureHintText: {
    color:    Colors.textMuted,
    fontSize: FontSize.xs,
  },
  controls: {
    position:  "absolute",
    zIndex:    10,
    bottom:    Spacing.md,
    alignSelf: "center",
  },
});
