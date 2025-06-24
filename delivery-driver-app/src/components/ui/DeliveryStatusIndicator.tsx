import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface DeliveryStatusIndicatorProps {
  status: "idle" | "navigating" | "arrived" | "delivering";
  eta?: string;
  distance?: string;
  customerName?: string;
}

export default function DeliveryStatusIndicator({
  status,
  eta,
  distance,
  customerName,
}: DeliveryStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "navigating":
        return {
          colors: ["#2196F3", "#1976D2"] as [string, string],
          icon: "navigate",
          title: "En route",
          subtitle: `Livraison vers ${customerName}`,
        };
      case "arrived":
        return {
          colors: ["#FF9800", "#F57C00"] as [string, string],
          icon: "location",
          title: "Arrivé",
          subtitle: "À la destination",
        };
      case "delivering":
        return {
          colors: ["#4CAF50", "#45a049"] as [string, string],
          icon: "checkmark-circle",
          title: "Livraison",
          subtitle: "En cours...",
        };
      default:
        return {
          colors: ["#9E9E9E", "#757575"] as [string, string],
          icon: "pause",
          title: "En attente",
          subtitle: "Aucune livraison active",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={styles.container}>
      <LinearGradient colors={config.colors} style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.statusInfo}>
            <Ionicons name={config.icon as any} size={24} color="#fff" />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
          </View>

          {(eta || distance) && (
            <View style={styles.metricsContainer}>
              {distance && (
                <View style={styles.metric}>
                  <Ionicons name="speedometer-outline" size={16} color="#fff" />
                  <Text style={styles.metricText}>{distance}</Text>
                </View>
              )}
              {eta && (
                <View style={styles.metric}>
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <Text style={styles.metricText}>{eta}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 90,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    padding: 16,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  metricsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
