import * as Location from "expo-location";
import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface RouteData {
  distance: number;
  duration: number;
  coordinates: Array<[number, number]>;
  instructions?: string[];
}

export interface DeliveryRoute {
  orderId: string;
  startLocation: LocationData;
  endLocation: LocationData;
  currentLocation: LocationData;
  route: RouteData;
  estimatedArrival: Date;
  actualArrival?: Date;
  distanceRemaining: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

class LocationService {
  private static instance: LocationService;
  private watchId: Location.LocationSubscription | null = null;
  private currentLocation: LocationData | null = null;
  private isTracking: boolean = false;
  private locationHistory: LocationData[] = [];
  private callbacks: Array<(location: LocationData) => void> = [];

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "This app needs location access to provide accurate delivery tracking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return false;
      }

      // Demander la permission en arrière-plan pour le tracking continu
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== "granted") {
        Alert.alert(
          "Background Location",
          'For continuous tracking during deliveries, please enable "Allow all the time" in location settings.',
          [
            { text: "Later", style: "cancel" },
            {
              text: "Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }

      return true;
    } catch (error) {
      console.error("Error requesting location permissions:", error);
      return false;
    }
  }

  async checkPermissions(): Promise<{
    foreground: boolean;
    background: boolean;
  }> {
    try {
      const [foreground, background] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);

      return {
        foreground: foreground.status === "granted",
        background: background.status === "granted",
      };
    } catch (error) {
      console.error("Error checking location permissions:", error);
      return { foreground: false, background: false };
    }
  }

  async getCurrentLocation(
    highAccuracy: boolean = true
  ): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;
      const location = await Location.getCurrentPositionAsync({
        accuracy: highAccuracy
          ? Location.Accuracy.High
          : Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        altitude: location.coords.altitude ?? undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
        heading: location.coords.heading ?? undefined,
        speed: location.coords.speed ?? undefined,
        timestamp: location.timestamp,
      };

      this.currentLocation = locationData;
      await this.saveLocationHistory(locationData);

      return locationData;
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your GPS settings."
      );
      return null;
    }
  }

  async startLocationTracking(intervalMs: number = 5000): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log("Location tracking already active");
        return true;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy ?? undefined,
            altitude: location.coords.altitude ?? undefined,
            altitudeAccuracy: location.coords.altitudeAccuracy ?? undefined,
            heading: location.coords.heading ?? undefined,
            speed: location.coords.speed ?? undefined,
            timestamp: location.timestamp,
          };

          this.currentLocation = locationData;
          this.saveLocationHistory(locationData);

          // Notifier tous les callbacks
          this.callbacks.forEach((callback) => callback(locationData));
        }
      );

      this.isTracking = true;
      console.log("Location tracking started");
      return true;
    } catch (error) {
      console.error("Error starting location tracking:", error);
      return false;
    }
  }

  async stopLocationTracking(): Promise<void> {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
    this.isTracking = false;
    console.log("Location tracking stopped");
  }

  addLocationUpdateCallback(callback: (location: LocationData) => void): void {
    this.callbacks.push(callback);
  }

  removeLocationUpdateCallback(
    callback: (location: LocationData) => void
  ): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // Calculer la distance entre deux points (en mètres)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Calculer l'ETA basé sur la distance et la vitesse
  calculateETA(
    distance: number,
    averageSpeed: number = 30 // km/h par défaut
  ): Date {
    const timeInHours = distance / 1000 / averageSpeed;
    const timeInMs = timeInHours * 60 * 60 * 1000;
    return new Date(Date.now() + timeInMs);
  }

  // Obtenir un itinéraire via une API externe (exemple avec OSRM)
  async getRoute(
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number
  ): Promise<RouteData | null> {
    try {
      // Utilisation de l'API OSRM (Open Source Routing Machine)
      const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry = route.geometry;

        return {
          distance: route.distance,
          duration: route.duration,
          coordinates: geometry.coordinates.map((coord: number[]) => [
            coord[1],
            coord[0],
          ]), // Inverse lat/lon
          instructions:
            route.legs[0]?.steps?.map(
              (step: any) => step.maneuver?.instruction
            ) || [],
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting route:", error);

      // Fallback: route directe
      const distance = this.calculateDistance(
        startLat,
        startLon,
        endLat,
        endLon
      );
      return {
        distance,
        duration: (distance / 30) * 3.6, // Estimation basée sur 30 km/h
        coordinates: [
          [startLat, startLon],
          [endLat, endLon],
        ],
      };
    }
  }

  // Géofencing - vérifier si on est dans une zone
  isWithinGeofence(
    centerLat: number,
    centerLon: number,
    radius: number, // en mètres
    currentLat?: number,
    currentLon?: number
  ): boolean {
    const current = this.currentLocation;
    if (!current && (!currentLat || !currentLon)) return false;

    const lat = currentLat || current!.latitude;
    const lon = currentLon || current!.longitude;

    const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
    return distance <= radius;
  }

  // Sauvegarder l'historique des positions
  private async saveLocationHistory(location: LocationData): Promise<void> {
    try {
      this.locationHistory.push(location);

      // Garder seulement les 100 dernières positions
      if (this.locationHistory.length > 100) {
        this.locationHistory = this.locationHistory.slice(-100);
      }

      // Sauvegarder périodiquement en local
      if (this.locationHistory.length % 10 === 0) {
        await AsyncStorage.setItem(
          "location_history",
          JSON.stringify(this.locationHistory.slice(-50)) // Garder 50 dernières
        );
      }
    } catch (error) {
      console.error("Error saving location history:", error);
    }
  }

  async getLocationHistory(): Promise<LocationData[]> {
    try {
      const stored = await AsyncStorage.getItem("location_history");
      return stored ? JSON.parse(stored) : this.locationHistory;
    } catch (error) {
      console.error("Error getting location history:", error);
      return this.locationHistory;
    }
  }

  // Ouvrir l'app de navigation native
  async openNativeNavigation(
    destinationLat: number,
    destinationLon: number,
    label?: string
  ): Promise<boolean> {
    try {
      const current = await this.getCurrentLocation();
      if (!current) return false;

      const url = `https://www.google.com/maps/dir/?api=1&origin=${current.latitude},${current.longitude}&destination=${destinationLat},${destinationLon}&travelmode=driving`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }

      // Fallback pour iOS
      const appleUrl = `http://maps.apple.com/?daddr=${destinationLat},${destinationLon}&dirflg=d`;
      const canOpenApple = await Linking.canOpenURL(appleUrl);
      if (canOpenApple) {
        await Linking.openURL(appleUrl);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error opening navigation:", error);
      return false;
    }
  }

  // Créer un itinéraire de livraison
  async createDeliveryRoute(
    orderId: string,
    destinationLat: number,
    destinationLon: number
  ): Promise<DeliveryRoute | null> {
    try {
      const currentLocation = await this.getCurrentLocation();
      if (!currentLocation) return null;

      const route = await this.getRoute(
        currentLocation.latitude,
        currentLocation.longitude,
        destinationLat,
        destinationLon
      );

      if (!route) return null;

      const deliveryRoute: DeliveryRoute = {
        orderId,
        startLocation: currentLocation,
        endLocation: {
          latitude: destinationLat,
          longitude: destinationLon,
          timestamp: Date.now(),
        },
        currentLocation,
        route,
        estimatedArrival: this.calculateETA(route.distance),
        distanceRemaining: route.distance,
        status: "pending",
      };

      // Sauvegarder l'itinéraire
      await AsyncStorage.setItem(
        `delivery_route_${orderId}`,
        JSON.stringify(deliveryRoute)
      );

      return deliveryRoute;
    } catch (error) {
      console.error("Error creating delivery route:", error);
      return null;
    }
  }

  // Mettre à jour un itinéraire de livraison
  async updateDeliveryRoute(orderId: string): Promise<DeliveryRoute | null> {
    try {
      const storedRoute = await AsyncStorage.getItem(
        `delivery_route_${orderId}`
      );
      if (!storedRoute) return null;
      const deliveryRoute: DeliveryRoute = JSON.parse(storedRoute);
      const currentLocation = await this.getCurrentLocation();

      if (!currentLocation) return deliveryRoute;

      // Mettre à jour la position actuelle
      deliveryRoute.currentLocation = currentLocation;

      // Recalculer la distance restante
      deliveryRoute.distanceRemaining = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        deliveryRoute.endLocation.latitude,
        deliveryRoute.endLocation.longitude
      );

      // Mettre à jour l'ETA
      deliveryRoute.estimatedArrival = this.calculateETA(
        deliveryRoute.distanceRemaining
      );

      // Sauvegarder
      await AsyncStorage.setItem(
        `delivery_route_${orderId}`,
        JSON.stringify(deliveryRoute)
      );

      return deliveryRoute;
    } catch (error) {
      console.error("Error updating delivery route:", error);
      return null;
    }
  }

  async getDeliveryRoute(orderId: string): Promise<DeliveryRoute | null> {
    try {
      const stored = await AsyncStorage.getItem(`delivery_route_${orderId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error("Error getting delivery route:", error);
      return null;
    }
  }

  async completeDeliveryRoute(orderId: string): Promise<boolean> {
    try {
      const route = await this.getDeliveryRoute(orderId);
      if (!route) return false;

      route.status = "completed";
      route.actualArrival = new Date();

      await AsyncStorage.setItem(
        `delivery_route_${orderId}`,
        JSON.stringify(route)
      );

      return true;
    } catch (error) {
      console.error("Error completing delivery route:", error);
      return false;
    }
  }

  // Alias pour la compatibilité avec les slices Redux
  static async startTracking(): Promise<boolean> {
    return LocationService.getInstance().startLocationTracking();
  }

  static stopTracking(): void {
    LocationService.getInstance().stopLocationTracking();
  }

  static async initialize(): Promise<boolean> {
    return LocationService.getInstance().requestPermissions();
  }
}

export default LocationService;
