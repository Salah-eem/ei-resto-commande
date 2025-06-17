import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface ToastNotificationProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onHide?: () => void;
}

export default function ToastNotification({
  visible,
  message,
  type = "info",
  duration = 3000,
  onHide,
}: ToastNotificationProps) {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50) {
        hideToast();
      } else {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          colors: ["#4CAF50", "#45a049"] as [string, string],
          icon: "checkmark-circle",
        };
      case "error":
        return {
          colors: ["#f44336", "#d32f2f"] as [string, string],
          icon: "close-circle",
        };
      case "warning":
        return {
          colors: ["#FF9800", "#F57C00"] as [string, string],
          icon: "warning",
        };
      default:
        return {
          colors: ["#2196F3", "#1976D2"] as [string, string],
          icon: "information-circle",
        };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <LinearGradient colors={config.colors} style={styles.gradient}>
        <View style={styles.content}>
          <Ionicons name={config.icon as any} size={24} color="#fff" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    lineHeight: 22,
  },
});
