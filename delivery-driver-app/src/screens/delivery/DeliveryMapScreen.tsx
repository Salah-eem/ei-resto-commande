import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme } from "../../contexts/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// Import conditionnel pour react-native-maps
let MapView: any, Marker: any, Polyline: any, PROVIDER_GOOGLE: any;

if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (error) {
    console.warn("Failed to load react-native-maps:", error);
  }
}

// Hooks
import { useOrders } from "../../hooks/useOrders";
import { useDelivery } from "../../hooks/useDelivery";

// Components
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorMessage } from "../../components/ui/ErrorMessage";

// Types
import { RootStackParamList } from "../../types/navigation";
import { Position as AppPosition } from "../../types";

const { width, height } = Dimensions.get("window");

type DeliveryMapScreenRouteProp = RouteProp<RootStackParamList, "DeliveryMap">;
type DeliveryMapScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const DeliveryMapScreen: React.FC = () => {
  const navigation = useNavigation<DeliveryMapScreenNavigationProp>();
  const route = useRoute<DeliveryMapScreenRouteProp>();
  const { orderId } = route.params;
  const { theme } = useTheme();
  const styles = useThemedStyles(createThemedStyles);

  const { orders, getOrderById, updateStatus } = useOrders();
  const currentOrder = orders.find((order) => order._id === orderId);

  const {
    currentPosition,
    deliveryRoute,
    isDelivering,
    updateCurrentPosition,
    complete,
  } = useDelivery();

  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const [watchPositionId, setWatchPositionId] =
    useState<Location.LocationSubscription | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      if (watchPositionId) {
        watchPositionId.remove();
      }
    };
  }, []);

  const initializeScreen = async () => {
    try {
      await requestLocationPermission();
      await loadOrderData();
      await startLocationTracking();
    } catch (error) {
      console.error("Error initializing delivery map:", error);
      Alert.alert("Erreur", "Impossible d'initialiser la carte de livraison");
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission requise",
          "L'acc�s � la localisation est n�cessaire pour la livraison"
        );
        return;
      }
      setLocationPermission(true);
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const loadOrderData = () => {
    try {
      getOrderById(orderId);
    } catch (error) {
      Alert.alert("Error", "Unable to load order details");
    }
  };

  const startLocationTracking = async () => {
    if (!locationPermission) return;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        },
        (location) => {
          const position: AppPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
          };
          updateCurrentPosition(position);
        }
      );
      setWatchPositionId(subscription);
    } catch (error) {
      console.error("Error starting location tracking:", error);
    }
  };

  const handleCompleteDelivery = () => {
    Alert.alert(
      "Confirmer la livraison",
      "�tes-vous s�r d'avoir livr� cette commande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: async () => {
            try {
              await updateStatus(orderId, "delivered");
              await complete(orderId);

              Alert.alert(
                "Livraison termin�e",
                "Commande marqu�e comme livr�e",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert("Erreur", "Impossible de terminer la livraison");
            }
          },
        },
      ]
    );
  };

  const handleNavigateToCustomer = () => {
    if (!currentOrder?.deliveryAddress) return;

    const address = currentOrder.deliveryAddress;
    const url = Platform.select({
      ios: `maps:0,0?q=${address.lat},${address.lng}`,
      android: `geo:0,0?q=${address.lat},${address.lng}`,
    });

    if (url) {
      Alert.alert("Navigation", "Ouvrir l'application de navigation ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Ouvrir", onPress: () => require("expo-linking").openURL(url) },
      ]);
    }
  };

  const handleCenterOnLocation = () => {
    if (currentPosition && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Fallback pour web ou si react-native-maps n'est pas disponible
  const MapFallback = () => (
    <View style={styles.mapFallback}>
      <Ionicons name="map-outline" size={64} color="#ccc" />
      <Text style={styles.mapFallbackText}>
        Carte non disponible sur cette plateforme
      </Text>
      {currentOrder && (
        <View style={styles.addressInfo}>
          <Text style={styles.addressTitle}>Adresse de livraison:</Text>
          <Text style={styles.addressText}>
            {currentOrder.deliveryAddress?.street},{" "}
            {currentOrder.deliveryAddress?.city}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentOrder) {
    return (
      <ErrorMessage
        message="Commande non trouv�e"
        onRetry={() => navigation.goBack()}
      />
    );
  }

  const deliveryLocation = currentOrder.deliveryAddress;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livraison en cours</Text>
        <TouchableOpacity onPress={handleCenterOnLocation}>
          <Ionicons name="locate" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {Platform.OS !== "web" && MapView ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: deliveryLocation?.lat || 48.8566,
              longitude: deliveryLocation?.lng || 2.3522,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
          >
            {/* Destination Marker */}
            {deliveryLocation && (
              <Marker
                coordinate={{
                  latitude: deliveryLocation.lat || 0,
                  longitude: deliveryLocation.lng || 0,
                }}
                title="Destination"
                description={`${deliveryLocation.street}, ${deliveryLocation.city}`}
                pinColor="#f44336"
              />
            )}

            {/* Current Position Marker */}
            {currentPosition && (
              <Marker
                coordinate={{
                  latitude: currentPosition.latitude,
                  longitude: currentPosition.longitude,
                }}
                title="Ma position"
                pinColor="#4CAF50"
              />
            )}

            {/* Route Polyline */}
            {deliveryRoute.length > 0 && (
              <Polyline
                coordinates={deliveryRoute.map((pos) => ({
                  latitude: pos.latitude,
                  longitude: pos.longitude,
                }))}
                strokeColor="#4CAF50"
                strokeWidth={3}
              />
            )}
          </MapView>
        ) : (
          <MapFallback />
        )}
      </View>

      {/* Order Info */}
      <View style={styles.orderInfo}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {currentOrder.customer?.name || "Client"}
          </Text>
          <Text style={styles.orderNumber}>#{currentOrder.orderNumber}</Text>
        </View>
        <TouchableOpacity
          style={styles.phoneButton}
          onPress={() =>
            currentOrder.customer?.phone &&
            require("expo-linking").openURL(
              `tel:${currentOrder.customer.phone}`
            )
          }
        >
          <Ionicons name="call" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handleNavigateToCustomer}
        >
          <Ionicons name="navigate" size={20} color="white" />
          <Text style={styles.buttonText}>Navigation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deliveredButton}
          onPress={handleCompleteDelivery}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.buttonText}>Livr�</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createThemedStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: "#e0e0e0",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    mapContainer: {
      flex: 1,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapFallback: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      padding: 32,
    },
    mapFallbackText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 16,
    },
    addressInfo: {
      marginTop: 32,
      alignItems: "center",
    },
    addressTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    orderInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: "#e0e0e0",
    },
    customerInfo: {
      flex: 1,
    },
    customerName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    orderNumber: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    phoneButton: {
      backgroundColor: "#4CAF50",
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    actionButtons: {
      flexDirection: "row",
      padding: 16,
      backgroundColor: theme.colors.card,
      gap: 12,
    },
    navigationButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2196F3",
      paddingVertical: 12,
      borderRadius: 8,
    },
    deliveredButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#4CAF50",
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "500",
      marginLeft: 8,
    },
  });

export default DeliveryMapScreen;
