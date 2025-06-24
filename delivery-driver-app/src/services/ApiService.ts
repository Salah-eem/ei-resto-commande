/**
 * API Service for communicating with NestJS backend
 */
import axios, { AxiosInstance, AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  API_CONFIG,
  ORDER_STATUS,
  buildUrl,
  validateConfig,
} from "../config/api.config";
import { DeliveryStats, Order, RestaurantInfo, User } from "../types";

class ApiService {
  private axiosInstance: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Valider la configuration
    if (!validateConfig()) {
      throw new Error("Invalid API configuration");
    }

    this.baseURL = API_CONFIG.BASE_URL!;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.TIMEOUTS.API_REQUEST,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }
  private setupInterceptors(): void {
    // Intercepteur de requete pour ajouter le token d'authentification
    this.axiosInstance.interceptors.request.use(
      async (config: any) => {
        try {
          const token = await AsyncStorage.getItem("access_token");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Error getting token from storage:", error);
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Intercepteur de réponse pour gérer les erreurs
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        if (error.response?.status === 401) {
          // Token expiré ou invalide, déconnexion
          await this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  async login(email: string, password: string) {
    try {
      const response = await this.axiosInstance.post(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        { email, password }
      );
      console.log("Login response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error logging in:", error);
      throw new Error("Unable to connect");
    }
  }
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("refresh_token");
    } catch (error: any) {
      console.error("Error logging out:", error);
      throw new Error("Impossible to log out");
    }
  }
  // Utilisateur connecté
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.USERS.PROFILE
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching current user:", error);
      throw new Error("Impossible to retrieve current user");
    }
  }

  async getDeliveryOrders(): Promise<Order[]> {
    try {
      const response = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.ORDERS.DELIVERY_ORDERS
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching delivery orders:", error);
      throw new Error("Impossible to retrieve delivery orders");
    }
  }

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const url = buildUrl(API_CONFIG.ENDPOINTS.ORDERS.BY_ID, { id: orderId });
      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching order:", error);
      throw new Error("Impossible to retrieve order");
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    try {
      const url = buildUrl(API_CONFIG.ENDPOINTS.ORDERS.UPDATE_STATUS, {
        orderId,
      });
      const response = await this.axiosInstance.put(url, { status });
      return response.data;
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw new Error("Impossible to update order status");
    }
  }

  async assignDeliveryDriver(orderId: string): Promise<Order> {
    try {
      const url = buildUrl(API_CONFIG.ENDPOINTS.ORDERS.ASSIGN_DELIVERY, {
        orderId,
      });
      const response = await this.axiosInstance.put(url);
      return response.data;
    } catch (error: any) {
      console.error("Error assigning delivery driver:", error);
      throw new Error("Impossible to assign delivery driver to order");
    }
  }

  async updateOrderPosition(
    orderId: string,
    position: { lat: number; lng: number }
  ): Promise<Order> {
    try {
      const url = buildUrl(API_CONFIG.ENDPOINTS.ORDERS.UPDATE_POSITION, {
        id: orderId,
      });
      const response = await this.axiosInstance.patch(url, position);
      return response.data;
    } catch (error: any) {
      console.error("Error updating order position:", error);
      throw new Error("Impossible to update order position");
    }
  }

  // Récupère l'historique des livraisons du livreur connecté
  async getDeliveryHistory(limit = 50, offset = 0): Promise<Order[]> {
    try {
      const response = await this.axiosInstance.get(
        buildUrl("/order/deliveries/history"),
        {
          params: { limit, offset },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching delivery history:", error);
      throw error;
    }
  }

  async getRestaurantInfo(): Promise<RestaurantInfo> {
    try {
      const response = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.RESTAURANT.INFO
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching restaurant info:", error);
      throw new Error("Unable to retrieve restaurant information");
    }
  }

  async getDeliveryStats(): Promise<DeliveryStats> {
    try {
      // Get orders for the day
      const deliveryOrdersResponse = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.ORDERS.DELIVERY_ORDERS
      );
      const todayOrdersResponse = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.ORDERS.TODAY_ORDERS
      );

      const deliveryOrders = deliveryOrdersResponse.data;
      const todayOrders = todayOrdersResponse.data;

      // Calculer les statistiques
      const deliveredToday = todayOrders.filter(
        (order: Order) => order.orderStatus === ORDER_STATUS.DELIVERED
      ).length;
      const totalRevenue = todayOrders
        .filter((order: Order) => order.orderStatus === ORDER_STATUS.DELIVERED)
        .reduce((sum: number, order: Order) => sum + order.totalAmount, 0);

      const pendingDeliveries = deliveryOrders.filter(
        (order: Order) =>
          order.orderStatus === ORDER_STATUS.READY_FOR_DELIVERY ||
          order.orderStatus === ORDER_STATUS.OUT_FOR_DELIVERY
      ).length;

      // Calcul approximatif du temps de livraison moyen
      const deliveredOrders = todayOrders.filter(
        (order: Order) => order.orderStatus === ORDER_STATUS.DELIVERED
      );
      let averageDeliveryTime = 0;

      if (deliveredOrders.length > 0) {
        const totalDeliveryTime = deliveredOrders.reduce(
          (sum: number, order: Order) => {
            const createdAt = new Date(order.createdAt);
            const updatedAt = new Date(order.updatedAt);
            return sum + (updatedAt.getTime() - createdAt.getTime());
          },
          0
        );

        averageDeliveryTime = Math.round(
          totalDeliveryTime / deliveredOrders.length / (1000 * 60)
        ); // en minutes
      }
      return {
        deliveredToday,
        deliveredThisWeek: deliveredToday * 7, // Approximation
        inProgressOrders: 0,
        pendingOrders: pendingDeliveries,
        todayRevenue: totalRevenue,
        weekRevenue: totalRevenue * 7, // Approximation
        averageDeliveryTime,
      };
    } catch (error: any) {
      console.error("Error fetching delivery stats:", error);
      throw new Error("Impossible to retrieve delivery statistics");
    }
  }

  // Enhanced statistics methods
  async getComprehensiveStats(
    startDate?: string,
    endDate?: string,
    driverId?: string
  ): Promise<any> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (driverId) params.driverId = driverId;

      const response = await this.axiosInstance.get(buildUrl("/order/stats"), {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching comprehensive stats:", error);
      throw new Error("Unable to retrieve comprehensive statistics");
    }
  }

  async getQuickDashboardStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        buildUrl("/order/stats/quick")
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching quick stats:", error);
      throw new Error("Unable to retrieve quick statistics");
    }
  }

  async getDriverPerformanceStats(
    driverId?: string,
    period: "today" | "week" | "month" = "today"
  ): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (period) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
      }

      return this.getComprehensiveStats(
        startDate.toISOString(),
        endDate.toISOString(),
        driverId
      );
    } catch (error: any) {
      console.error("Error fetching driver performance stats:", error);
      throw new Error("Unable to retrieve driver performance statistics");
    }
  }

  // UTILITIES
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.RESTAURANT.INFO
      );
      return response.status === 200;
    } catch (error: any) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  getWebSocketUrl(): string {
    return this.baseURL;
  }

  getBaseUrl(): string {
    return this.baseURL;
  }

  // GESTION DES ERREURS
  private handleApiError(error: any, customMessage?: string): never {
    const message =
      customMessage ||
      error.response?.data?.message ||
      error.message ||
      "Une erreur s'est produite";
    console.error("API Error:", error);
    throw new Error(message);
  }

  // Récupère le profil du livreur connecté
  async getDriverProfile(): Promise<any> {
    try {
      const response = await this.axiosInstance.get(buildUrl("/user/profile"));
      return response.data;
    } catch (error) {
      console.error("Error fetching driver profile:", error);
      throw error;
    }
  }

  // Met à jour le profil du livreur
  async updateDriverProfile(profile: any): Promise<void> {
    try {
      await this.axiosInstance.put(buildUrl(`/user/${profile._id}`), profile);
    } catch (error) {
      console.error("Error updating driver profile:", error);
      throw error;
    }
  }

  // Valider un token d'authentification
  async validateToken(token: string): Promise<User> {
    try {
      const response = await this.axiosInstance.get(
        API_CONFIG.ENDPOINTS.AUTH.VALIDATE,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error validating token:", error);
      throw new Error("Token invalide");
    }
  }

  // Récupérer toutes les commandes (alias pour getDeliveryOrders)
  async getOrders(): Promise<Order[]> {
    return this.getDeliveryOrders();
  }

  async getOrdersHistory(limit = 50, offset = 0): Promise<Order[]> {
    try {
      const response = await this.axiosInstance.get(
        buildUrl("/order/deliveries/history"),
        {
          params: { limit, offset },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching deliveries history:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
