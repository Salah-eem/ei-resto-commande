import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "../components/HapticTab";
import { IconSymbol } from "../components/ui/IconSymbol";
import TabBarBackground from "../components/ui/TabBarBackground";
import { useColorScheme } from "../../src/hooks/useColorScheme";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function TabLayout() {
  useColorScheme();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          ...Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
          display: "none", // Keep hidden for now
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="list" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="time" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gamification"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="trophy" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name="settings" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
