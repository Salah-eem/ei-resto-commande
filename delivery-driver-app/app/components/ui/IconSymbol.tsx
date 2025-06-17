import { Ionicons } from "@expo/vector-icons";
import React from "react";

interface IconSymbolProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}
