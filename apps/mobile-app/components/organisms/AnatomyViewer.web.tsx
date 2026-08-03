/**
 * Browser implementation of the AnatomyViewer bridge.
 *
 * Expo Web cannot render react-native-webview, so the Three.js application is
 * hosted in an iframe and uses the same postMessage protocol as the native app.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import {
  CameraAction,
  ScenePlaybackCommand,
  ScenePlaybackProgress,
  ViewerToMobileMessage,
  ViewMode,
  VisualCommand,
} from "../../types/viewer";
import type { ScenePlan } from "../../types/scenePlan.generated";
import { AppIcon } from "../atoms/AppIcon";
import { Text } from "../atoms/Text";

const VIEWER_URL: string =
  process.env.EXPO_PUBLIC_VIEWER_URL ??
  (Constants.expoConfig?.extra?.webViewerUrl as string | undefined) ??
  "http://localhost:5173";

type ViewerCallbacks = {
  onReady?: () => void;
  onReset?: () => void;
  onModelLoading?: (mode: ViewMode) => void;
  onModelLoaded?: (mode: ViewMode) => void;
  onSceneLoading?: () => void;
  onSceneLoaded?: () => void;
  onSceneProgress?: (progress: ScenePlaybackProgress) => void;
  onSceneComplete?: (planId: string) => void;
  onSceneFallback?: (message: string) => void;
  onError?: (message: string, mode?: ViewMode) => void;
};

export type AnatomyViewerHandle = {
  sendCommand: (command: VisualCommand) => void;
  sendScenePlan: (plan: ScenePlan) => void;
  sendSceneControl: (command: ScenePlaybackCommand) => void;
  sendCamera: (action: CameraAction, currentMode: ViewMode) => void;
  reloadViewer: () => void;
};

type Props = ViewerCallbacks & {
  style?: object;
};

export const AnatomyViewer = forwardRef<AnatomyViewerHandle, Props>(
  ({ onReady, onReset, onModelLoading, onModelLoaded, onSceneLoading, onSceneLoaded, onSceneProgress, onSceneComplete, onSceneFallback, onError, style }, ref) => {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [frameLoading, setFrameLoading] = useState(true);
    const [frameError, setFrameError] = useState<string | null>(null);
    const [viewerReady, setViewerReady] = useState(false);

    const postCommand = useCallback((command: VisualCommand) => {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) return;

      try {
        frameWindow.postMessage(JSON.stringify(command), new URL(VIEWER_URL).origin);
      } catch {
        frameWindow.postMessage(JSON.stringify(command), "*");
      }
    }, []);

    useImperativeHandle(ref, () => ({
      sendCommand: postCommand,
      sendScenePlan: (plan: ScenePlan) => {
        const frameWindow = frameRef.current?.contentWindow;
        if (!frameWindow) return;
        frameWindow.postMessage(JSON.stringify(plan), new URL(VIEWER_URL).origin);
      },
      sendSceneControl: (command: ScenePlaybackCommand) => {
        const frameWindow = frameRef.current?.contentWindow;
        if (!frameWindow) return;
        frameWindow.postMessage(JSON.stringify(command), new URL(VIEWER_URL).origin);
      },
      sendCamera: (action: CameraAction, currentMode: ViewMode) => {
        postCommand({
          focus_region: currentMode,
          view_mode: currentMode,
          highlight: [],
          animation: "none",
          camera: action,
          confidence: 1,
        });
      },
      reloadViewer: () => {
        setFrameError(null);
        setViewerReady(false);
        setFrameLoading(true);
        onReset?.();
        setReloadKey((key) => key + 1);
      },
    }));

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== frameRef.current?.contentWindow) return;
        try {
          if (event.origin !== new URL(VIEWER_URL).origin) return;
        } catch {
          return;
        }

        try {
          const msg = (
            typeof event.data === "string" ? JSON.parse(event.data) : event.data
          ) as ViewerToMobileMessage;

          switch (msg.type) {
            case "viewer_ready":
              setViewerReady(true);
              onReady?.();
              break;
            case "model_loading":
              onModelLoading?.(msg.view_mode);
              break;
            case "model_loaded":
              onModelLoaded?.(msg.view_mode);
              break;
            case "scene_loading":
              onSceneLoading?.();
              break;
            case "scene_loaded":
              onSceneLoaded?.();
              break;
            case "scene_progress":
              onSceneProgress?.(msg);
              break;
            case "scene_complete":
              onSceneComplete?.(msg.plan_id);
              break;
            case "scene_fallback":
              onSceneFallback?.(msg.message);
              break;
            case "viewer_error":
              onError?.(msg.message, msg.view_mode);
              break;
            case "command_complete":
              break;
          }
        } catch {
          // Ignore unrelated window messages and malformed viewer payloads.
        }
      };

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, [onError, onModelLoaded, onModelLoading, onReady, onSceneComplete, onSceneFallback, onSceneLoaded, onSceneLoading, onSceneProgress]);

    if (frameError) {
      return (
        <View style={[styles.fallback, style as object]}>
          <View style={styles.fallbackIcon}>
            <AppIcon name="cloud-alert-outline" size={30} color={Colors.error} />
          </View>
          <Text style={styles.fallbackTitle}>The 3D viewer is unavailable</Text>
          <Text style={styles.fallbackBody}>{frameError}</Text>
          <Pressable
            onPress={() => {
              setFrameError(null);
              setViewerReady(false);
              setFrameLoading(true);
              onReset?.();
              setReloadKey((key) => key + 1);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading 3D viewer"
            style={styles.retryBtn}
          >
            <AppIcon name="restore" size={18} color={Colors.cyan} />
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.container, style as object]}>
        <iframe
          key={reloadKey}
          ref={frameRef}
          src={VIEWER_URL}
          title="Interactive 3D anatomy viewer"
          aria-label="Interactive 3D anatomy viewer"
          style={iframeStyle}
          onLoad={() => setFrameLoading(false)}
          onError={() => {
            setFrameLoading(false);
            setFrameError(
              `The 3D viewer could not load. Make sure the viewer service is running at ${VIEWER_URL}`
            );
          }}
        />

        {frameLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={styles.loadingLabel}>Loading 3D viewer…</Text>
          </View>
        )}

        {!frameLoading && !viewerReady && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color={Colors.cyan} />
            <Text style={styles.loadingLabel}>Initialising engine…</Text>
          </View>
        )}
      </View>
    );
  }
);

AnatomyViewer.displayName = "AnatomyViewer";

const iframeStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
  border: 0,
  backgroundColor: Colors.canvas,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvas,
    overflow: "hidden",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    backgroundColor: Colors.canvas,
  },
  loadingLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.xxl,
    backgroundColor: Colors.canvas,
  },
  fallbackIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xl,
    backgroundColor: Colors.errorDim,
  },
  fallbackTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semi,
    textAlign: "center",
  },
  fallbackBody: {
    color: Colors.textSecond,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  retryBtn: {
    minHeight: 44,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  retryLabel: {
    color: Colors.cyan,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
