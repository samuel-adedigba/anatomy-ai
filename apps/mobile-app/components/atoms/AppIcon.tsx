import React, { ComponentProps } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Colors } from "../../constants/theme";
import { ViewMode } from "../../types/viewer";

export type AppIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
};

export const AppIcon = ({
  name,
  size = 20,
  color = Colors.textSecond,
}: Props) => (
  <MaterialCommunityIcons
    name={name}
    size={size}
    color={color}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  />
);

const ANATOMY_ICONS: Record<ViewMode, AppIconName> = {
  full_body:      "human",
  skeleton:       "bone",
  muscular:       "arm-flex-outline",
  nervous_system: "flash-outline",
  circulatory:    "heart-pulse",
  respiratory:    "lungs",
  digestive:      "stomach",
  brain:          "brain",
  heart:          "heart-outline",
  spine:          "human-male-height-variant",
};

type AnatomyIconProps = Omit<Props, "name"> & {
  mode: ViewMode;
};

export const AnatomyIcon = ({ mode, ...props }: AnatomyIconProps) => (
  <AppIcon name={ANATOMY_ICONS[mode]} {...props} />
);
