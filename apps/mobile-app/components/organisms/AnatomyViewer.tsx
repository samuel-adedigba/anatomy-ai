/**
 * AnatomyViewer — React Native WebView wrapper for the Three.js visual engine.
 *
 * Responsibilities:
 *  - Load the web-viewer (local bundle or deployed URL)
 *  - Forward VisualCommands to the viewer via postMessage
 *  - Listen for viewer→mobile messages and propagate state changes
 *  - Show loading, error, and fallback states
 *  - Block unexpected external navigations
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import Constants from "expo-constants";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../constants/theme";
import { Text } from "../atoms/Text";
import { AppIcon } from "../atoms/AppIcon";
import {
  CameraAction,
  ScenePlaybackCommand,
  ScenePlaybackProgress,
  ViewerToMobileMessage,
  ViewMode,
  VisualCommand,
} from "../../types/viewer";
import type { ScenePlan } from "../../types/scenePlan.generated";

// ─── Config ──────────────────────────────────────────────────────────────────

const VIEWER_URL: string =
  process.env.EXPO_PUBLIC_VIEWER_URL ??
  (Constants.expoConfig?.extra?.webViewerUrl as string | undefined) ??
  "http://localhost:5173";

const VIEWER_ORIGIN = getOrigin(VIEWER_URL);

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewerCallbacks = {
  onReady?:        () => void;
  onReset?:        () => void;
  onModelLoading?: (mode: ViewMode) => void;
  onModelLoaded?:  (mode: ViewMode) => void;
  onSceneLoading?: () => void;
  onSceneLoaded?:  () => void;
  onSceneProgress?: (progress: ScenePlaybackProgress) => void;
  onSceneComplete?: (planId: string) => void;
  onSceneFallback?: (message: string) => void;
  onError?:        (msg: string, mode?: ViewMode) => void;
};

export type AnatomyViewerHandle = {
  sendCommand:  (command: VisualCommand) => void;
  sendScenePlan: (plan: ScenePlan) => void;
  sendSceneControl: (command: ScenePlaybackCommand) => void;
  sendCamera:   (action: CameraAction, currentMode: ViewMode) => void;
  reloadViewer: () => void;
};

type Props = ViewerCallbacks & {
  style?: object;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AnatomyViewer = forwardRef<AnatomyViewerHandle, Props>(
  ({ onReady, onReset, onModelLoading, onModelLoaded, onSceneLoading, onSceneLoaded, onSceneProgress, onSceneComplete, onSceneFallback, onError, style }, ref) => {
    const webViewRef    = useRef<InstanceType<typeof WebView>>(null);
    const [webViewLoading, setWebViewLoading] = useState(true);
    const [webViewError,   setWebViewError]   = useState<string | null>(null);
    const [viewerReady,    setViewerReady]     = useState(false);

    // ── Imperative handle ───────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      sendCommand: (command: VisualCommand) => {
        webViewRef.current?.postMessage(JSON.stringify(command));
      },
      sendScenePlan: (plan: ScenePlan) => {
        webViewRef.current?.postMessage(JSON.stringify(plan));
      },
      sendSceneControl: (command: ScenePlaybackCommand) => {
        webViewRef.current?.postMessage(JSON.stringify(command));
      },
      sendCamera: (action: CameraAction, currentMode: ViewMode) => {
        const cmd: VisualCommand = {
          focus_region: currentMode,
          view_mode:    currentMode,
          highlight:    [],
          animation:    "none",
          camera:       action,
          confidence:   1.0,
        };
        webViewRef.current?.postMessage(JSON.stringify(cmd));
      },
      reloadViewer: () => {
        setWebViewError(null);
        setViewerReady(false);
        onReset?.();
        webViewRef.current?.reload();
      },
    }));

    // ── Message handler ─────────────────────────────────────────────────────
    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data) as ViewerToMobileMessage;
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
          // Malformed message — safe to ignore
        }
      },
      [onReady, onModelLoading, onModelLoaded, onSceneLoading, onSceneLoaded, onSceneProgress, onSceneComplete, onSceneFallback, onError]
    );

    if (webViewError) {
      return (
        <View style={[styles.fallback, style as object]}>
          <View style={styles.fallbackIcon}>
            <AppIcon name="cloud-alert-outline" size={30} color={Colors.error} />
          </View>
          <Text style={styles.fallbackTitle}>The 3D viewer is unavailable</Text>
          <Text style={styles.fallbackBody}>{webViewError}</Text>
          <Pressable
            onPress={() => { setWebViewError(null); setViewerReady(false); }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Retry loading 3D viewer"
            style={styles.retryBtn}
          >
            <AppIcon name="restore" size={18} color={Colors.textPrimary} />
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.container, style as object]}>
        <WebView
          ref={webViewRef}
          source={{ uri: VIEWER_URL }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled={false}
          onMessage={handleMessage}
          onLoadStart={() => {
            setWebViewLoading(true);
            setViewerReady(false);
            onReset?.();
          }}
          onLoadEnd={()  => setWebViewLoading(false)}
          onError={() => {
            setWebViewLoading(false);
            setWebViewError(
              "The 3D viewer could not load. Make sure the web viewer service is running at " +
              VIEWER_URL
            );
          }}
          originWhitelist={["*"]}
          onShouldStartLoadWithRequest={(request) =>
            request.url === "about:blank" || getOrigin(request.url) === VIEWER_ORIGIN
          }
          applicationNameForUserAgent="AnatomyAI/1.0"
        />

        {webViewLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={styles.loadingLabel}>Loading 3D viewer…</Text>
          </View>
        )}

        {!webViewLoading && !viewerReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={Colors.cyan} />
            <Text style={styles.loadingLabel}>Initialising engine…</Text>
          </View>
        )}
      </View>
    );
  }
);

AnatomyViewer.displayName = "AnatomyViewer";

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.canvas,
    overflow:        "hidden",
  },
  webview: {
    flex:            1,
    backgroundColor: Colors.canvas,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.canvas,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             Spacing.md,
  },
  loadingLabel: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
  },
  fallback: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: Colors.canvas,
    padding:         Spacing.xxl,
    gap:             Spacing.md,
  },
  fallbackIcon: {
    width:           64,
    height:          64,
    alignItems:      "center",
    justifyContent:  "center",
    borderRadius:    Radius.xl,
    backgroundColor: Colors.errorDim,
  },
  fallbackTitle: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.semi,
    color:      Colors.textPrimary,
    textAlign:  "center",
  },
  fallbackBody: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecond,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    minHeight:       44,
    marginTop:       Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             Spacing.sm,
  },
  retryLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.cyan,
  },
});
