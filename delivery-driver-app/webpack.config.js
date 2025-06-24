// webpack.config.js
const { withExpo } = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await withExpo(env, argv);
  
  // Ensure alias exists
  config.resolve.alias = config.resolve.alias || {};
  
  // Add native module aliases for web
  config.resolve.alias['react-native-maps'] = path.resolve(__dirname, 'web/MapViewStub.js');
  config.resolve.alias['react-native-maps/lib/MapMarkerNativeComponent'] = path.resolve(__dirname, 'web/MapMarkerNativeComponent.js');
  config.resolve.alias['react-native/Libraries/Utilities/codegenNativeCommands'] = path.resolve(__dirname, 'web/MapMarkerNativeComponent.js');
  config.resolve.alias['expo-location'] = path.resolve(__dirname, 'web/LocationStub.js');
  
  // Ignore native-only modules on web
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'react-native/Libraries/Utilities/codegenNativeCommands': false,
  };
  
  return config;
};
