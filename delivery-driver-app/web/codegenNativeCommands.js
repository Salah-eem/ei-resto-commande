// web/codegenNativeCommands.js
// Stub spécifique pour react-native/Libraries/Utilities/codegenNativeCommands

// This function is used by React Native to generate native commands
// Sur web, on retourne juste une fonction vide
export default function codegenNativeCommands(config) {
  return {};
}

// Export nommé également
export const codegenNativeCommands = (config) => ({});

// Module export pour les require()
module.exports = codegenNativeCommands;
module.exports.codegenNativeCommands = codegenNativeCommands;
module.exports.default = codegenNativeCommands;
