import React from "react";
import { Platform } from "react-native";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

export function HapticTab({
  children,
  onPress,
  ...otherProps
}: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...otherProps}
      onPressIn={() => {
        if (Platform.OS === "ios") {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
      onPress={onPress}
    >
      {children}
    </PlatformPressable>
  );
}
