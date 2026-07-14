import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { IconButton } from "../atoms/IconButton";
import { CameraAction } from "../../types/viewer";

type ControlDef = {
  icon:   string;
  label:  string;
  action: CameraAction;
};

const CONTROLS: ControlDef[] = [
  { icon: "🔄", label: "Reset 3D view",       action: "reset"        },
  { icon: "🔍", label: "Zoom in",              action: "zoom_in"      },
  { icon: "🔎", label: "Zoom out",             action: "zoom_out"     },
  { icon: "◀",  label: "Rotate left",          action: "rotate_left"  },
  { icon: "▶",  label: "Rotate right",         action: "rotate_right" },
  { icon: "⬆",  label: "View from front",      action: "front"        },
  { icon: "⬇",  label: "View from back",       action: "back"         },
  { icon: "⏫",  label: "View from top",        action: "top"          },
];

type Props = {
  onControl: (action: CameraAction) => void;
  disabled?: boolean;
};

export const ViewerControls = ({ onControl, disabled = false }: Props) => (
  <View
    style={styles.strip}
    accessible
    accessibilityRole="toolbar"
    accessibilityLabel="3D viewer controls"
  >
    {CONTROLS.map((c) => (
      <IconButton
        key={c.action}
        icon={c.icon}
        label={c.label}
        onPress={() => onControl(c.action)}
        disabled={disabled}
        variant="ghost"
        size={40}
        style={styles.btn}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  strip: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surfaceHigh,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
    borderRadius:    Radius.lg,
  },
  btn: { flex: 0 },
});
