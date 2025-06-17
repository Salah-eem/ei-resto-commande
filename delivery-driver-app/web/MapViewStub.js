// web/MapViewStub.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Stub pour MapView
export default function MapView(props) {
  return (
    <View style={[styles.mapContainer, props.style]}>
      <Text style={styles.mapText}>🗺️ Carte non disponible sur web</Text>
      <Text style={styles.mapSubText}>
        Utilisez l'application mobile pour la navigation
      </Text>
    </View>
  );
}

// Stub pour Marker
export const Marker = (props) => null;

// Stub pour Polyline
export const Polyline = (props) => null;

// Stub pour PROVIDER_GOOGLE
export const PROVIDER_GOOGLE = "google";

// Stub pour autres composants
export const Circle = (props) => null;
export const Polygon = (props) => null;
export const Callout = (props) => null;
export const CalloutSubview = (props) => null;
export const Overlay = (props) => null;
export const Heatmap = (props) => null;
export const Geojson = (props) => null;
export const LocalTile = (props) => null;
export const UrlTile = (props) => null;
export const WMSTile = (props) => null;

// Stub pour les providers
export const PROVIDER_DEFAULT = "default";

// Export par défaut pour les imports de sous-modules
export * from "./MapViewStub.js";

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  mapText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 10,
  },
  mapSubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});

// Named exports pour la compatibilité
module.exports = {
  default: MapView,
  MapView,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  Circle,
  Polygon,
  Callout,
  CalloutSubview,
  Overlay,
  Heatmap,
  Geojson,
  LocalTile,
  UrlTile,
  WMSTile,
};
