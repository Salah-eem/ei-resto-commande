import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  Dimensions,
  Modal,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import useWebSocket from "../../src/hooks/useWebSocket";
import ApiService from "../../src/services/ApiService";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useThemedStyles } from "../../src/hooks/useThemedStyles";

// Interfaces pour les types
interface RoutePoint {
  lat: number;
  lng: number;
  description: string;
  speed: number;
}

interface SimulationRoute {
  name: string;
  points: RoutePoint[];
  estimatedDuration: number;
  realOrder?: boolean;
  customerInfo?: {
    name: string;
    phone: string;
    address: string;
    instructions?: string;
  };
}

interface Position {
  lat: number;
  lng: number;
  timestamp: string;
  description: string;
  speed: number;
  accuracy: number;
}

interface SimulationStats {
  startTime: Date | null;
  distance: number;
  averageSpeed: number;
  estimatedArrival: Date | null;
}

interface OrderInfo {
  _id: string;
  orderNumber: string;
  customerName: string;
  address: string;
}

const { width } = Dimensions.get("window");

// Simulation points for different scenarios
const SIMULATION_ROUTES = {
  restaurant_to_downtown: {
    name: "Restaurant -> Downtown",
    points: [
      {
        lat: 50.8503,
        lng: 4.3517,
        description: "Restaurant - Depart",
        speed: 0,
      },
      { lat: 50.8498, lng: 4.3522, description: "Parking exit", speed: 15 },
      { lat: 50.8493, lng: 4.3527, description: "Main Street", speed: 25 },
      { lat: 50.8488, lng: 4.3532, description: "Red light", speed: 0 },
      { lat: 50.8483, lng: 4.3537, description: "Heavy traffic", speed: 10 },
      {
        lat: 50.8478,
        lng: 4.3542,
        description: "Approaching center",
        speed: 20,
      },
      { lat: 50.8473, lng: 4.3547, description: "Narrow street", speed: 15 },
      {
        lat: 50.847,
        lng: 4.355,
        description: "Searching for parking",
        speed: 5,
      },
      { lat: 50.8467, lng: 4.3553, description: "Parking lot", speed: 0 },
      {
        lat: 50.8467,
        lng: 4.357,
        description: "Destination - Grand Place",
        speed: 0,
      },
    ],
    estimatedDuration: 15, // minutes
  },

  restaurant_to_university: {
    name: "Restaurant -> University",
    points: [
      {
        lat: 50.8503,
        lng: 4.3517,
        description: "Restaurant - Depart",
        speed: 0,
      },
      { lat: 50.849, lng: 4.353, description: "Main street", speed: 30 },
      { lat: 50.846, lng: 4.358, description: "Major intersection", speed: 20 },
      { lat: 50.842, lng: 4.362, description: "University Avenue", speed: 25 },
      {
        lat: 50.838,
        lng: 4.365,
        description: "Construction slowdown",
        speed: 10,
      },
      { lat: 50.835, lng: 4.366, description: "Campus entrance", speed: 15 },
      { lat: 50.834, lng: 4.3665, description: "Student building", speed: 5 },
      { lat: 50.8333, lng: 4.3667, description: "Destination - ULB", speed: 0 },
    ],
    estimatedDuration: 12,
  },

  restaurant_to_atomium: {
    name: "Restaurant -> Atomium",
    points: [
      {
        lat: 50.8503,
        lng: 4.3517,
        description: "Restaurant - Depart",
        speed: 0,
      },
      { lat: 50.852, lng: 4.35, description: "North Direction", speed: 35 },
      { lat: 50.86, lng: 4.345, description: "Rocade", speed: 45 },
      { lat: 50.87, lng: 4.34, description: "Highway", speed: 60 },
      { lat: 50.88, lng: 4.342, description: "Laeken exit", speed: 30 },
      { lat: 50.89, lng: 4.3415, description: "Atomium Avenue", speed: 25 },
      { lat: 50.893, lng: 4.3417, description: "Atomium parking", speed: 10 },
      {
        lat: 50.8948,
        lng: 4.3417,
        description: "Destination - Atomium",
        speed: 0,
      },
    ],
    estimatedDuration: 20,
  },
};

export default function DeliverySimulatorScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    orderId,
    simulationType,
    customerName,
    customerPhone,
    deliveryLat,
    deliveryLng,
    deliveryAddress,
    restaurantName,
    restaurantAddress,
    orderNumber,
    specialInstructions,
    estimatedDuration,
  } = useLocalSearchParams();
  const [selectedRoute, setSelectedRoute] = useState<
    keyof typeof SIMULATION_ROUTES
  >("restaurant_to_downtown");
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(2000); // ms between each point
  const [autoProgress, setAutoProgress] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<SimulationRoute | null>(
    null
  );
  const [simulationStats, setSimulationStats] = useState<SimulationStats>({
    startTime: null,
    distance: 0,
    averageSpeed: 0,
    estimatedArrival: null,
  });

  // WebSocket connection
  const {
    socket,
    isConnected: socketConnected,
    joinOrder,
    updatePosition,
    updateStatus,
  } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      console.log("Delivery Simulator WebSocket connected");
      if (orderId) {
        const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;
        joinOrder(orderIdStr);
      }
    },
    onDisconnect: () => {
      console.log("Delivery Simulator WebSocket disconnected");
    },
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeSimulator();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (socket && socketConnected) {
      // Listen for location updates confirmation
      socket.on("locationUpdate", (data: any) => {
        console.log("Confirmed location update:", data);
      });

      socket.on("statusUpdate", (data: any) => {
        console.log("Confirmed status update:", data);
      });

      return () => {
        socket.off("locationUpdate");
        socket.off("statusUpdate");
      };
    }
  }, [socket, socketConnected]);
  // Function to generate a dynamic route to a real address
  const generateRealOrderRoute = (
    targetLat: number,
    targetLng: number,
    customerName: string,
    address: string
  ): SimulationRoute => {
    const restaurantLat = 50.8503;
    const restaurantLng = 4.3517;

    // Calculer la distance approximative
    const distance = calculateDistance(
      restaurantLat,
      restaurantLng,
      targetLat,
      targetLng
    );
    const estimatedTime = Math.max(8, Math.ceil(distance * 2)); // 2 min par km minimum

    // Generate realistic intermediate points
    const numPoints = Math.max(6, Math.min(12, Math.ceil(distance * 1.5)));
    const points = [];

    // Point de départ
    points.push({
      lat: restaurantLat,
      lng: restaurantLng,
      description: `${restaurantName || "Restaurant"} - Depart`,
      speed: 0,
    });

    // Intermediate points
    for (let i = 1; i < numPoints - 1; i++) {
      const progress = i / (numPoints - 1);
      const lat = restaurantLat + (targetLat - restaurantLat) * progress;
      const lng = restaurantLng + (targetLng - restaurantLng) * progress;

      // Ajouter de la variation réaliste
      const variation = 0.001 * (Math.random() - 0.5);
      const adjustedLat = lat + variation;
      const adjustedLng = lng + variation;

      // Realistic descriptions and speeds
      let description = "";
      let speed = 25;

      if (i === 1) {
        description = "Restaurant exit";
        speed = 15;
      } else if (i === Math.ceil(numPoints * 0.3)) {
        description = "Heavy traffic";
        speed = 10;
      } else if (i === Math.ceil(numPoints * 0.5)) {
        description = "Red light";
        speed = 0;
      } else if (i === Math.ceil(numPoints * 0.7)) {
        description = "Main avenue";
        speed = 35;
      } else if (i === numPoints - 2) {
        description = "Approaching destination";
        speed = 20;
      } else {
        description = `On the way (${Math.ceil(progress * 100)}%)`;
        speed = Math.random() > 0.7 ? 15 : 25; // Variation aléatoire
      }

      points.push({
        lat: adjustedLat,
        lng: adjustedLng,
        description,
        speed,
      });
    }

    // Point final
    points.push({
      lat: targetLat,
      lng: targetLng,
      description: `Destination - ${customerName || "Client"}`,
      speed: 0,
    });

    return {
      name: `Delivery ? ${customerName || "Customer"}`,
      points,
      estimatedDuration: estimatedTime,
      realOrder: true,
      customerInfo: {
        name: customerName,
        phone: "N/A", // customerPhone not passed to function
        address: address,
        instructions: "N/A", // specialInstructions not passed to function
      },
    };
  };

  // Fonction utilitaire pour calculer la distance
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const initializeSimulator = async () => {
    try {
      // If it's a real order, generate a dynamic route
      if (simulationType === "real_order" && deliveryLat && deliveryLng) {
        const realRoute = generateRealOrderRoute(
          parseFloat(deliveryLat as string),
          parseFloat(deliveryLng as string),
          customerName as string,
          deliveryAddress as string
        );
        setCurrentRoute(realRoute);
        setOrderInfo({
          _id: Array.isArray(orderId) ? orderId[0] : (orderId as string),
          orderNumber: Array.isArray(orderNumber)
            ? orderNumber[0]
            : (orderNumber as string) ||
              `#${(Array.isArray(orderId) ? orderId[0] : orderId)
                ?.toString()
                .slice(-6)}`,
          customerName: Array.isArray(customerName)
            ? customerName[0]
            : (customerName as string),
          address: Array.isArray(deliveryAddress)
            ? deliveryAddress[0]
            : (deliveryAddress as string),
        });
      } else {
        // Utiliser les routes pr�d�finies
        setCurrentRoute(
          SIMULATION_ROUTES[selectedRoute as keyof typeof SIMULATION_ROUTES]
        );
      }

      console.log("Simulateur initialisé avec route:", selectedRoute);
    } catch (error) {
      console.error("Simulator initialization error:", error);
      Alert.alert("Error", "Unable to initialize simulator");
    }
  };

  const startSimulation = () => {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    const route = SIMULATION_ROUTES[selectedRoute];
    setIsSimulating(true);
    setCurrentStep(0);
    setSimulationStats({
      startTime: new Date(),
      distance: 0,
      averageSpeed: 0,
      estimatedArrival: new Date(Date.now() + route.estimatedDuration * 60000),
    });

    // D�marrer au premier point
    moveToStep(0);

    if (autoProgress) {
      startAutoProgression();
    }
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAutoProgression = () => {
    const route = SIMULATION_ROUTES[selectedRoute];

    intervalRef.current = setInterval(
      () => {
        setCurrentStep((prevStep) => {
          const nextStep = prevStep + 1;

          if (nextStep >= route.points.length) {
            // Fin de simulation
            stopSimulation();
            Alert.alert(
              "Simulation terminée",
              "Le livreur est arrivé à destination !"
            );
            return prevStep;
          }

          moveToStep(nextStep);
          return nextStep;
        });
      },
      realTimeMode ? calculateRealTimeDelay() : simulationSpeed
    );
  };

  const calculateRealTimeDelay = () => {
    const route = SIMULATION_ROUTES[selectedRoute];
    return (route.estimatedDuration * 60000) / route.points.length;
  };

  const moveToStep = (stepIndex: number) => {
    const route = SIMULATION_ROUTES[selectedRoute];
    const point = route.points[stepIndex];

    if (!point) return;

    const newPosition = {
      lat: point.lat,
      lng: point.lng,
      timestamp: new Date().toISOString(),
      description: point.description,
      speed: point.speed,
      accuracy: Math.random() * 10 + 5, // 5-15m
    };

    setCurrentPosition(newPosition);

    // Calculer les statistiques
    if (stepIndex > 0) {
      const prevPoint = route.points[stepIndex - 1];
      const distance = calculateDistance(
        prevPoint.lat,
        prevPoint.lng,
        point.lat,
        point.lng
      );

      setSimulationStats((prev) => ({
        ...prev,
        distance: prev.distance + distance,
      }));
    } // Envoyer la position via WebSocket
    if (socket && socketConnected && orderId) {
      const orderIdStr = Array.isArray(orderId) ? orderId[0] : orderId;
      updatePosition(orderIdStr, point.lat, point.lng);
    }

    console.log(
      `Simulation - Étape ${stepIndex + 1}/${route.points.length}: ${
        point.description
      }`
    );
  };

  const manualNextStep = () => {
    const route = SIMULATION_ROUTES[selectedRoute];
    if (currentStep < route.points.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      moveToStep(nextStep);
    }
  };

  const manualPrevStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      moveToStep(prevStep);
    }
  };

  const RouteSelectionModal = () => (
    <Modal
      visible={showRouteModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowRouteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Route</Text>
            <TouchableOpacity onPress={() => setShowRouteModal(false)}>
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {Object.entries(SIMULATION_ROUTES).map(([key, route]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.routeOption,
                selectedRoute === key && styles.routeOptionSelected,
              ]}
              onPress={() => {
                setSelectedRoute(key as keyof typeof SIMULATION_ROUTES);
                setShowRouteModal(false);
              }}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <Text style={styles.routeDetails}>
                  {route.points.length} points ~ {route.estimatedDuration} min
                </Text>
              </View>
              {selectedRoute === key && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  const route = SIMULATION_ROUTES[selectedRoute];
  const progress = route ? (currentStep / (route.points.length - 1)) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#6A11CB", "#2575FC"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Simulator</Text>
          <Text style={styles.headerSubtitle}>
            {orderInfo ? `Order #${orderInfo._id.slice(-5)}` : "Test Mode"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* État actuel */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#6A11CB" />
            <Text style={styles.cardTitle}>Current Position</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isSimulating ? "#4CAF50" : "#FF9800" },
              ]}
            >
              <Text style={styles.statusText}>
                {isSimulating ? "In Progress" : "Stopped"}
              </Text>
            </View>
          </View>

          {currentPosition ? (
            <View style={styles.positionInfo}>
              <Text style={styles.positionDescription}>
                {currentPosition.description}
              </Text>
              <Text style={styles.coordinates}>
                {currentPosition.lat.toFixed(6)},{" "}
                {currentPosition.lng.toFixed(6)}
              </Text>
              <Text style={styles.positionMeta}>
                Speed: {currentPosition.speed} km/h Accuracy:{" "}
                {currentPosition.accuracy.toFixed(1)}m
              </Text>
            </View>
          ) : (
            <Text style={styles.noPosition}>Simulation not started</Text>
          )}

          {/* Barre de progression */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              step {currentStep + 1} of {route?.points.length || 0} (
              {progress.toFixed(0)}%)
            </Text>
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="settings" size={24} color="#2575FC" />
            <Text style={styles.cardTitle}>Configuration</Text>
          </View>

          {/* Sélection d'itinéraire */}
          <TouchableOpacity
            style={styles.routeSelector}
            onPress={() => setShowRouteModal(true)}
          >
            <View>
              <Text style={styles.routeSelectorLabel}>Itinerary</Text>
              <Text style={styles.routeSelectorValue}>{route?.name}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controlsGrid}>
            <View style={styles.controlItem}>
              <Text style={styles.controlLabel}>Auto Progress</Text>
              <Switch
                value={autoProgress}
                onValueChange={setAutoProgress}
                trackColor={{ false: "#ccc", true: "#4CAF50" }}
              />
            </View>

            <View style={styles.controlItem}>
              <Text style={styles.controlLabel}>Real Time</Text>
              <Switch
                value={realTimeMode}
                onValueChange={setRealTimeMode}
                trackColor={{ false: "#ccc", true: "#FF9800" }}
              />
            </View>
          </View>

          {!realTimeMode && (
            <View style={styles.speedControl}>
              <Text style={styles.controlLabel}>Simulation Speed</Text>
              <View style={styles.speedButtons}>
                {[500, 1000, 2000, 5000].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedButton,
                      simulationSpeed === speed && styles.speedButtonActive,
                    ]}
                    onPress={() => setSimulationSpeed(speed)}
                  >
                    <Text
                      style={[
                        styles.speedButtonText,
                        simulationSpeed === speed &&
                          styles.speedButtonTextActive,
                      ]}
                    >
                      {speed / 1000}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Contrôles de simulation */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="play" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Controles</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: isSimulating ? "#F44336" : "#4CAF50" },
              ]}
              onPress={startSimulation}
            >
              <Ionicons
                name={isSimulating ? "stop" : "play"}
                size={20}
                color="white"
              />
              <Text style={styles.buttonText}>
                {isSimulating ? "Stop" : "Start"}
              </Text>
            </TouchableOpacity>

            {!autoProgress && (
              <View style={styles.manualControls}>
                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={manualPrevStep}
                  disabled={currentStep === 0}
                >
                  <Ionicons name="chevron-back" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stepButton}
                  onPress={manualNextStep}
                  disabled={currentStep >= route?.points.length - 1}
                >
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Statistiques */}
        {simulationStats.startTime && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics" size={24} color="#FF9800" />
              <Text style={styles.cardTitle}>Statistics</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {simulationStats.distance.toFixed(2)} km
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {simulationStats.startTime
                    ? Math.floor(
                        (Date.now() - simulationStats.startTime.getTime()) /
                          60000
                      )
                    : 0}{" "}
                  min
                </Text>
                <Text style={styles.statLabel}>Elapsed Time</Text>
              </View>

              {simulationStats.estimatedArrival && (
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {simulationStats.estimatedArrival.toLocaleTimeString(
                      "fr-FR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </Text>
                  <Text style={styles.statLabel}>ETA</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Itinéraire détaillé */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map" size={24} color="#9C27B0" />
            <Text style={styles.cardTitle}>Itinerary</Text>
          </View>

          {route?.points.map((point, index) => (
            <View
              key={index}
              style={[
                styles.routePoint,
                index === currentStep && styles.routePointActive,
                index < currentStep && styles.routePointCompleted,
              ]}
            >
              <View style={styles.routePointIcon}>
                <Text style={styles.routePointNumber}>{index + 1}</Text>
              </View>
              <View style={styles.routePointInfo}>
                <Text style={styles.routePointDescription}>
                  {point.description}
                </Text>
                <Text style={styles.routePointCoords}>
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </Text>
                {point.speed > 0 && (
                  <Text style={styles.routePointSpeed}>
                    Speed: {point.speed} km/h
                  </Text>
                )}
              </View>
              {index === currentStep && isSimulating && (
                <Ionicons name="radio-button-on" size={20} color="#4CAF50" />
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <RouteSelectionModal />
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      paddingTop: 50,
    },
    backButton: {
      marginRight: 15,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
    },
    headerSubtitle: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 2,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginLeft: 8,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      color: "white",
      fontSize: 12,
      fontWeight: "600",
    },
    positionInfo: {
      marginBottom: 16,
    },
    positionDescription: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 4,
    },
    coordinates: {
      fontSize: 14,
      fontFamily: "monospace",
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    positionMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    noPosition: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: 16,
    },
    progressContainer: {
      marginTop: 16,
    },
    progressBar: {
      height: 6,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: "#4CAF50",
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
    },
    routeSelector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 8,
      marginBottom: 16,
    },
    routeSelectorLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    routeSelectorValue: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    controlsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    controlItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flex: 1,
      marginHorizontal: 8,
    },
    controlLabel: {
      fontSize: 14,
      color: theme.colors.text,
    },
    speedControl: {
      marginTop: 16,
    },
    speedButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    speedButton: {
      flex: 1,
      backgroundColor: theme.colors.border,
      paddingVertical: 8,
      borderRadius: 6,
      marginHorizontal: 2,
    },
    speedButtonActive: {
      backgroundColor: "#6A11CB",
    },
    speedButtonText: {
      textAlign: "center",
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    speedButtonTextActive: {
      color: "white",
      fontWeight: "600",
    },
    actionButtons: {
      gap: 12,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 8,
      gap: 8,
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    manualControls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 20,
    },
    stepButton: {
      backgroundColor: "#2575FC",
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    routePoint: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
      paddingLeft: 16,
      marginLeft: 15,
    },
    routePointActive: {
      borderLeftColor: "#4CAF50",
      backgroundColor: "#f8fff8",
    },
    routePointCompleted: {
      borderLeftColor: "#81C784",
      opacity: 0.7,
    },
    routePointIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      marginLeft: -23,
    },
    routePointNumber: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.colors.textSecondary,
    },
    routePointInfo: {
      flex: 1,
    },
    routePointDescription: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    routePointCoords: {
      fontSize: 12,
      fontFamily: "monospace",
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    routePointSpeed: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      width: width * 0.9,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    routeOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    routeOptionSelected: {
      backgroundColor: "#e8f5e8",
      borderWidth: 2,
      borderColor: "#4CAF50",
    },
    routeInfo: {
      flex: 1,
    },
    routeName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 2,
    },
    routeDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });
