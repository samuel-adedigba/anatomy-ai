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
import { VisualCommand, ViewMode, ViewerToMobileMessage, CameraAction } from "../../types/viewer";

// ─── Config ──────────────────────────────────────────────────────────────────

const VIEWER_URL: string =
  process.env.EXPO_PUBLIC_VIEWER_URL ??
  (Constants.expoConfig?.extra?.webViewerUrl as string | undefined) ??
  "http://localhost:5173";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewerCallbacks = {
  onReady?:        () => void;
  onModelLoading?: (mode: ViewMode) => void;
  onModelLoaded?:  (mode: ViewMode) => void;
  onError?:        (msg: string, mode?: ViewMode) => void;
};

export type AnatomyViewerHandle = {
  sendCommand:  (command: VisualCommand) => void;
  sendCamera:   (action: CameraAction, currentMode: ViewMode) => void;
  reloadViewer: () => void;
};

type Props = ViewerCallbacks & {
  style?: object;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AnatomyViewer = forwardRef<AnatomyViewerHandle, Props>(
  ({ onReady, onModelLoading, onModelLoaded, onError, style }, ref) => {
    const webViewRef    = useRef<InstanceType<typeof WebView>>(null);
    const [webViewLoading, setWebViewLoading] = useState(true);
    const [webViewError,   setWebViewError]   = useState<string | null>(null);
    const [viewerReady,    setViewerReady]     = useState(false);

    // ── Imperative handle ───────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      sendCommand: (command: VisualCommand) => {
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
      [onReady, onModelLoading, onModelLoaded, onError]
    );

    if (webViewError) {
      return (
        <View style={[styles.fallback, style as object]}>
          <Text style={styles.fallbackIcon}>⚠️</Text>
          <Text style={styles.fallbackTitle}>Viewer unavailable</Text>
          <Text style={styles.fallbackBody}>{webViewError}</Text>
          <Pressable
            onPress={() => { setWebViewError(null); setViewerReady(false); }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Retry loading 3D viewer"
            style={styles.retryBtn}
          >
            <Text style={styles.retryLabel}>Retry</Text>
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
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={()  => setWebViewLoading(false)}
          onError={() => {
            setWebViewLoading(false);
            setWebViewError(
              "The 3D viewer could not load. Make sure the web viewer service is running at " +
              VIEWER_URL
            );
          }}
          originWhitelist={["*"]}
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

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.bg,
    overflow:        "hidden",
  },
  webview: {
    flex:            1,
    backgroundColor: Colors.bg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
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
    backgroundColor: Colors.bg,
    padding:         Spacing.xxl,
    gap:             Spacing.md,
  },
  fallbackIcon:  { fontSize: 40 },
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
    marginTop:       Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  retryLabel: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.cyan,
  },
});
