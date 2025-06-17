// web/LocationStub.js
// Stub pour expo-location sur web

export const requestForegroundPermissionsAsync = async () => {
  return { status: "denied" };
};

export const getCurrentPositionAsync = async (options) => {
  // Simuler une position par défaut (Bruxelles)
  return {
    coords: {
      latitude: 50.8503,
      longitude: 4.3517,
      altitude: 0,
      accuracy: 100,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  };
};

export const watchPositionAsync = async (options, callback) => {
  // Retourner un objet avec une méthode remove
  return {
    remove: () => {},
  };
};

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export default {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
  Accuracy,
};
