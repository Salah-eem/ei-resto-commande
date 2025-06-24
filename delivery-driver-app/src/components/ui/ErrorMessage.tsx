import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  retryText = "Retry",
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);

  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={64}
        color={theme.colors.error}
      />
      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color="white" />
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    retryButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#4CAF50",
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    retryText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
  });
