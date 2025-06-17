const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configuration pour gérer les modules natifs sur web
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Resolver personnalisé pour bloquer les modules natifs sur web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Si on est sur web, intercepter les modules natifs problématiques
  if (platform === 'web') {
    // Specifically block the module that causes the error
    if (moduleName === 'react-native/Libraries/Utilities/codegenNativeCommands') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'web/codegenNativeCommands.js'),
      };
    }
    
    // Bloquer react-native-maps et ses composants
    if (moduleName.startsWith('react-native-maps')) {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'web/MapViewStub.js'),
      };
    }
    
    // Bloquer expo-location
    if (moduleName === 'expo-location') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'web/LocationStub.js'),
      };
    }
    
    // Bloquer tous les modules natifs React Native
    if (moduleName.startsWith('react-native/Libraries/') && moduleName.includes('Native')) {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'web/EmptyStub.js'),
      };
    }
  }
  
  // Utiliser le resolver par défaut pour les autres cas
  return context.resolveRequest(context, moduleName, platform);
};

// Améliorations pour web
config.resolver.alias = {
  ...config.resolver.alias,
  // React Native Maps - remplacer par des stubs web
  'react-native-maps': path.resolve(__dirname, 'web/MapViewStub.js'),
  
  // Expo Location
  'expo-location': path.resolve(__dirname, 'web/LocationStub.js'),
};

// Configuration spécifique pour web
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

module.exports = config;