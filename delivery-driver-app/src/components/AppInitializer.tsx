import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useAppDispatch, useAppSelector } from "../store";
import { setInitialized, setError } from "../store/slices/appSlice";

// Services
import ApiService from "../services/ApiService";
import NotificationService from "../services/NotificationService";
import LocationService from "../services/LocationService";

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const { isInitialized, loading, error } = useAppSelector(
    (state) => state.app
  );
  const [initializationStatus, setInitializationStatus] = useState(
    "Initializing services..."
  );

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setInitializationStatus("Initializing API...");
      // Check if API service is available
      console.log("API service initialized:", !!ApiService);

      setInitializationStatus("Setting up notifications...");
      const notificationInitialized = await NotificationService.initialize();

      if (!notificationInitialized) {
        console.warn("Notification service failed to initialize");
      }

      setInitializationStatus("Checking location permissions...");
      const locationInitialized = await LocationService.initialize();

      if (!locationInitialized) {
        console.warn("Location service failed to initialize");
      }

      // Mark app as initialized
      dispatch(setInitialized(true));

      console.log("✅ App initialization completed");
    } catch (error: any) {
      console.error("❌ App initialization failed:", error);
      dispatch(setError(error.message || "Initialization failed"));

      Alert.alert(
        "Initialization Error",
        "Some features may not work properly. Continue anyway?",
        [
          {
            text: "Continue",
            onPress: () => dispatch(setInitialized(true)),
          },
          {
            text: "Retry",
            onPress: () => initializeApp(),
          },
        ]
      );
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.title}>Delivery Driver App</Text>
        <Text style={styles.status}>{initializationStatus}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 24,
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    color: "#f44336",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
});
