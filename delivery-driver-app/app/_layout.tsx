import {
  DefaultTheme,
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "../src/hooks/useColorScheme";
import { StoreProvider } from "../src/store/StoreProvider";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";

// StatusBar component that responds to theme
const StatusBarThemed = () => {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
};

// Navigation theme wrapper
const NavigationWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme, isDark } = useTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.notification,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      {children}
    </NavigationThemeProvider>
  );
};

export default function RootLayout() {
  useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <StoreProvider>
      <ThemeProvider>
        <NavigationWrapper>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="login"
              options={{
                headerShown: false,
                title: "Sign In",
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBarThemed />
        </NavigationWrapper>
      </ThemeProvider>
    </StoreProvider>
  );
}
