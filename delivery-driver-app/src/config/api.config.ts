/**
 * Configuration pour l'intégration avec le backend NestJS
 */

export const API_CONFIG = {
  // URLs du backend
  // BASE_URL: __DEV__ ? process.env.EXPO_PUBLIC_API_URL : 'https://restocommande.onrender.com',
  BASE_URL:
    process.env.EXPO_PUBLIC_API_URL || "https://restocommande.onrender.com",

  // WebSocket namespaces (selon le backend NestJS)
  WEBSOCKET_NAMESPACES: {
    DELIVERY: "/delivery",
    LIVE_ORDERS: "/live-orders",
  },

  // Endpoints API
  ENDPOINTS: {
    // Authentification
    AUTH: {
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      VALIDATE: "/auth/validate",
      PROFILE: "/auth/me",
    },

    // Commandes
    ORDERS: {
      DELIVERY_ORDERS: "/order/in-delivery",
      LIVE_ORDERS: "/order/live",
      TODAY_ORDERS: "/order/today",
      BY_ID: "/order/:id",
      UPDATE_STATUS: "/order/:orderId/status",
      ASSIGN_DELIVERY: "/order/:orderId/assign-delivery-driver",
      UPDATE_POSITION: "/order/:id/position",
      BY_USER: "/order/user/:userId",
    },
    // Restaurant
    RESTAURANT: {
      INFO: "/restaurant/info",
      DASHBOARD: "/restaurant/dashboard",
      DELIVERY_STATS: "/restaurant/delivery-stats",
    },

    // Utilisateurs
    USERS: {
      PROFILE: "/user/profile",
      BY_ID: "/user/:id",
      BY_EMAIL: "/user/by-email/:email",
    },
  },

  // Configuration des timeouts
  TIMEOUTS: {
    API_REQUEST: 10000, // 10 secondes
    WEBSOCKET_CONNECT: 20000, // 20 secondes
    LOCATION_UPDATE_INTERVAL: 10000, // 10 secondes
  },

  // Configuration de reconnexion WebSocket
  WEBSOCKET: {
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    TRANSPORTS: ["websocket"],
  },
};

// Statuts des commandes (selon le backend NestJS)
export const ORDER_STATUS = {
  // Statuts backend
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY_FOR_DELIVERY: "ready for delivery",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  CANCELED: "canceled",
} as const;

// Types de commandes
export const ORDER_TYPE = {
  DELIVERY: "delivery",
  PICKUP: "pickup",
} as const;

// Statuts de paiement
export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

// Méthodes de paiement
export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  ONLINE: "online",
  STRIPE: "stripe",
  PAYPAL: "paypal",
} as const;

// Rôles utilisateurs
export const USER_ROLES = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
  CLIENT: "client",
  DRIVER: "driver", // Si vous ajoutez ce rôle
} as const;

// Configuration des notifications
export const NOTIFICATION_TYPES = {
  ORDER_ASSIGNED: "order_assigned",
  NEW_ORDER: "new_order",
  ORDER_CANCELLED: "order_cancelled",
  STATUS_UPDATE: "status_update",
  NEW_MESSAGE: "new_message",
  LOCATION_REQUEST: "location_request",
} as const;

// Messages par défaut
export const DEFAULT_MESSAGES = {
  CONNECTION_LOST: "Connexion perdue avec le serveur",
  RECONNECTING: "Reconnexion en cours...",
  LOGIN_REQUIRED: "Connexion requise",
  ORDER_NOT_FOUND: "Commande introuvable",
  LOCATION_PERMISSION_DENIED: "Permission de localisation refusée",
  NETWORK_ERROR: "Erreur de réseau",
  UNKNOWN_ERROR: "Une erreur inconnue s'est produite",
} as const;

// Configuration de développement
export const DEV_CONFIG = {
  // URLs alternatives pour le développement
  ALTERNATIVE_URLS: [
    "http://localhost:3001",
    "http://192.168.1.100:3001", // IP locale réseau
    "https://your-tunnel-url.ngrok.io", // Tunnel ngrok
  ],

  // Paramètres de debug
  DEBUG: {
    LOG_API_CALLS: true,
    LOG_WEBSOCKET_EVENTS: true,
    MOCK_LOCATION: {
      latitude: 50.8503396, // Bruxelles
      longitude: 4.3517103,
    },
  },
};

// Utilitaires pour construire les URLs
export const buildUrl = (
  endpoint: string,
  params?: Record<string, string>
): string => {
  let url = endpoint;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return `${API_CONFIG.BASE_URL}${url}`;
};

// Fonction pour valider la configuration
export const validateConfig = (): boolean => {
  if (!API_CONFIG.BASE_URL) {
    console.error("Base URL not configured");
    return false;
  }

  if (!API_CONFIG.ENDPOINTS) {
    console.error("API endpoints not configured");
    return false;
  }

  return true;
};

export default API_CONFIG;
