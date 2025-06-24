import { API_CONFIG } from "../config";
import WebSocketService from "./WebSocketService";

// Socket Service - WebSocket interface for delivery
let deliverySocket: any = null;

export function getDeliverySocket() {
  if (!deliverySocket) {
    const wsService = WebSocketService.getInstance();
    // Wrapper pour compatibilité avec l'ancienne interface
    deliverySocket = {
      on: (event: string, callback: (...args: any[]) => void) => {
        wsService.on(event, callback);
      },
      off: (event: string, callback?: (...args: any[]) => void) => {
        wsService.off(event, callback);
      },
      emit: (event: string, data?: any) => {
        wsService.emit(event, data);
      },
      disconnect: () => {
        wsService.disconnect();
      },
      // Méthodes spécifiques au delivery
      joinOrder: (orderId: string) => {
        wsService.joinOrder(orderId);
      },
      joinDeliveryRoom: () => {
        wsService.joinDeliveryRoom();
      },
      updatePosition: (orderId: string, lat: number, lng: number) => {
        wsService.updatePosition(orderId, lat, lng);
      },
      updateStatus: (orderId: string, status: string) => {
        wsService.updateStatus(orderId, status);
      },
      isConnected: () => {
        return wsService.isSocketConnected();
      },
      connect: (url?: string) => {
        return wsService.connect(url);
      },
    };
  }

  return deliverySocket;
}

// Fonction utilitaire pour initialiser la connexion WebSocket
export async function initializeDeliverySocket(
  backendUrl: string = API_CONFIG.BASE_URL
): Promise<void> {
  try {
    const wsService = WebSocketService.getInstance();
    await wsService.connect(backendUrl);
    console.log("Delivery WebSocket initialized successfully");
  } catch (error) {
    console.error("Failed to initialize delivery WebSocket:", error);
    throw error;
  }
}

// Fonction pour vérifier l'état de la connexion
export function isDeliverySocketConnected(): boolean {
  const wsService = WebSocketService.getInstance();
  return wsService.isSocketConnected();
}

export default {
  getDeliverySocket,
  initializeDeliverySocket,
  isDeliverySocketConnected,
};
