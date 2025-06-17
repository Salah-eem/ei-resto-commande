import { StyleSheet } from "react-native";
import { useTheme, Theme } from "../contexts/ThemeContext";

export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  styleCreator: (theme: Theme) => T
): T => {
  const { theme } = useTheme();
  return styleCreator(theme);
};

export const createThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  styleCreator: (theme: Theme) => T
) => styleCreator;
