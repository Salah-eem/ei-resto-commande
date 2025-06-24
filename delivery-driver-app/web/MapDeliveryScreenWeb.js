// web/MapDeliveryScreenWeb.js
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Sidebar from "../components/Sidebar";

export default function MapDeliveryScreenWeb() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const orderId = params.orderId;
  const deliveryLat = parseFloat(params.deliveryLat) || null;
  const deliveryLng = parseFloat(params.deliveryLng) || null;

  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleDelivered = () => {
    Alert.alert(
      "Confirm Delivery",
      "Are you sure you have delivered this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            Alert.alert(
              "Delivery Confirmed",
              "The order has been marked as delivered.",
              [{ text: "OK", onPress: () => router.push("/(tabs)/orders") }]
            );
          },
        },
      ]
    );
  };

  const openGoogleMaps = () => {
    if (deliveryLat && deliveryLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}`;
      window.open(url, "_blank");
    }
  };

  return (
    <View style={styles.container}>
      {/* Bouton menu */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setSidebarVisible(true)}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      {/* Zone de carte remplacée par une interface web */}
      <View style={styles.webMapContainer}>
        <Text style={styles.webMapTitle}>🗺️ Navigation - Version Web</Text>
        <Text style={styles.webMapText}>
          La navigation est disponible uniquement sur l'application mobile.
        </Text>

        {deliveryLat && deliveryLng && (
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesTitle}>Delivery coordinates:</Text>
            <Text style={styles.coordinates}>
              Latitude: {deliveryLat.toFixed(6)}
            </Text>
            <Text style={styles.coordinates}>
              Longitude: {deliveryLng.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Panneau d'informations */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Delivery information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Order:</Text>
          <Text style={styles.infoValue}>#{orderId?.slice(-6)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Statut :</Text>
          <Text style={styles.infoValue}>Out for delivery</Text>
        </View>
      </View>

      {/* Boutons d'action */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={openGoogleMaps}
        >
          <Text style={styles.buttonText}>🧭 Ouvrir Google Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deliveredButton}
          onPress={handleDelivered}
        >
          <Text style={styles.buttonText}>✅ Marquer comme livré</Text>
        </TouchableOpacity>
      </View>

      <Sidebar
        isVisible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  menuButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "white",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  webMapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: 20,
    marginTop: 120,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  webMapTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  webMapText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  coordinatesContainer: {
    backgroundColor: "#f0f8ff",
    padding: 15,
    borderRadius: 10,
    alignSelf: "stretch",
  },
  coordinatesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  coordinates: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    fontFamily: "monospace",
  },
  infoPanel: {
    position: "absolute",
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navigationButton: {
    backgroundColor: "#1976d2",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 10,
    elevation: 5,
  },
  deliveredButton: {
    backgroundColor: "#4caf50",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 10,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
