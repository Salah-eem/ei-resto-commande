import { io, Socket } from "socket.io-client";
import { API_CONFIG } from "../config";

// WebSocket Service pour communication temps réel avec le backend
class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(url: string = API_CONFIG.BASE_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`WebSocket connecting to: ${url}/delivery`);

        this.socket = io(`${url}/delivery`, {
          transports: ["websocket"],
          timeout: 5000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        });

        this.socket.on("connect", () => {
          console.log("WebSocket connected successfully");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          console.log("WebSocket disconnected:", reason);
          this.isConnected = false;
        });

        this.socket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
          this.isConnected = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.socket.on("reconnect", (attemptNumber) => {
          console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
        });

        this.socket.on("reconnect_failed", () => {
          console.error("WebSocket failed to reconnect after maximum attempts");
          this.isConnected = false;
        });
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    console.log("WebSocket disconnecting...");
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Méthodes spécifiques au delivery gateway
  joinOrder(orderId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit("joinOrder", orderId);
      console.log(`Joined order room: ${orderId}`);
    } else {
      console.warn("Cannot join order: WebSocket not connected");
    }
  }

  joinDeliveryRoom(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit("joinDeliveryRoom");
      console.log("Joined delivery room for order updates");
    } else {
      console.warn("Cannot join delivery room: WebSocket not connected");
    }
  }

  updatePosition(orderId: string, lat: number, lng: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit("updatePosition", { orderId, lat, lng });
      console.log(
        `Position updated for order ${orderId}: lat=${lat}, lng=${lng}`
      );
    } else {
      console.warn("Cannot update position: WebSocket not connected");
    }
  }

  updateStatus(orderId: string, status: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit("updateStatus", { orderId, status });
      console.log(`Status updated for order ${orderId}: ${status}`);
    } else {
      console.warn("Cannot update status: WebSocket not connected");
    }
  }
  // Event listeners
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
      console.log(`WebSocket event listener registered: ${event}`);
    } else {
      console.warn(
        `Cannot register event listener ${event}: WebSocket not initialized`
      );
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
      console.log(`WebSocket event listener removed: ${event}`);
    }
  }

  // Méthodes utilitaires
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Méthodes génériques pour compatibilité
  send(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      console.log(`WebSocket event sent: ${event}`, data);
    } else {
      console.warn(`Cannot send event ${event}: WebSocket not connected`);
    }
  }

  emit(event: string, data?: any): void {
    this.send(event, data);
  }
}

export default WebSocketService;
