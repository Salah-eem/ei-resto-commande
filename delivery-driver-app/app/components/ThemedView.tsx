import React from "react";
import { View, type ViewProps } from "react-native";
import { useColorScheme } from "../../src/hooks/useColorScheme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const theme = useColorScheme() ?? "light";
  const backgroundColor = theme === "light" ? lightColor : darkColor;

  return (
    <View
      style={[
        {
          backgroundColor:
            backgroundColor ?? (theme === "light" ? "#fff" : "#151718"),
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
