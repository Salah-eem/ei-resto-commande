// web/MapMarkerNativeComponent.js
// Stub for MapMarkerNativeComponent to prevent web import errors

// Stub for codegenNativeCommands (this is what causes the error)
export const codegenNativeCommands = () => ({});

// Export all the components that might be imported from this module
export default function MapMarkerNativeComponent(props) {
  return null;
}

// Additional exports for compatibility
export const MapMarkerNativeComponent = MapMarkerNativeComponent;
export const Commands = {};
export const NativeCommands = {};

// Module exports (pour les require())
module.exports = {
  default: MapMarkerNativeComponent,
  MapMarkerNativeComponent,
  Commands,
  NativeCommands,
  codegenNativeCommands,
};
