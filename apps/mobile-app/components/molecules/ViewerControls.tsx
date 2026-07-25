import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { IconButton } from "../atoms/IconButton";
import { AppIconName } from "../atoms/AppIcon";
import { CameraAction } from "../../types/viewer";

type ControlDef = {
  icon:   AppIconName;
  label:  string;
  action: CameraAction;
};

const PRIMARY_CONTROLS: ControlDef[] = [
  { icon: "restore",              label: "Reset 3D view", action: "reset"        },
  { icon: "magnify-plus-outline", label: "Zoom in",       action: "zoom_in"      },
  { icon: "magnify-minus-outline",label: "Zoom out",      action: "zoom_out"     },
  { icon: "rotate-left",          label: "Rotate left",   action: "rotate_left"  },
  { icon: "rotate-right",         label: "Rotate right",  action: "rotate_right" },
];

const ORIENTATION_CONTROLS: ControlDef[] = [
  { icon: "account",         label: "View from front", action: "front" },
  { icon: "account-outline", label: "View from back",  action: "back"  },
  { icon: "arrow-up",        label: "View from top",   action: "top"   },
];

type Props = {
  onControl: (action: CameraAction) => void;
  disabled?: boolean;
};

export const ViewerControls = ({ onControl, disabled = false }: Props) => {
  const [orientationsOpen, setOrientationsOpen] = useState(false);

  return (
    <View style={styles.container}>
      {orientationsOpen && (
        <View
          style={styles.orientationStrip}
          accessibilityRole="toolbar"
          accessibilityLabel="3D viewing angles"
        >
          {ORIENTATION_CONTROLS.map((control) => (
            <IconButton
              key={control.action}
              icon={control.icon}
              label={control.label}
              onPress={() => onControl(control.action)}
              disabled={disabled}
              size={44}
            />
          ))}
        </View>
      )}

      <View
        style={styles.strip}
        accessibilityRole="toolbar"
        accessibilityLabel="3D viewer controls"
      >
        {PRIMARY_CONTROLS.map((control) => (
          <IconButton
            key={control.action}
            icon={control.icon}
            label={control.label}
            onPress={() => onControl(control.action)}
            disabled={disabled}
            size={44}
          />
        ))}
        <View style={styles.divider} />
        <IconButton
          icon="dots-horizontal"
          label={orientationsOpen ? "Hide viewing angles" : "Show viewing angles"}
          onPress={() => setOrientationsOpen((open) => !open)}
          disabled={disabled}
          active={orientationsOpen}
          size={44}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap:        Spacing.xs,
  },
  strip: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             2,
    padding:         4,
    backgroundColor: Colors.glass,
    borderWidth:     1,
    borderColor:     Colors.borderStrong,
    borderRadius:    Radius.md,
  },
  orientationStrip: {
    flexDirection:   "row",
    gap:             2,
    padding:         4,
    backgroundColor: Colors.glass,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderRadius:    Radius.md,
  },
  divider: {
    width:           1,
    height:          26,
    marginHorizontal: 3,
    backgroundColor: Colors.border,
  },
});
