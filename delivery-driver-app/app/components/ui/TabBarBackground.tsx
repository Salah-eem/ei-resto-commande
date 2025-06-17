import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

export default function TabBarBackground() {
  return (
    <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="light" />
  );
}
