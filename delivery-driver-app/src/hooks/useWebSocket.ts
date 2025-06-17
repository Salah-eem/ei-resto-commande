import { useEffect, useRef, useState } from "react";
import {
  getDeliverySocket,
  initializeDeliverySocket,
  isDeliverySocketConnected,
} from "../services/socket";
import { API_CONFIG } from "../config";

interface UseWebSocketOptions {
  autoConnect?: boolean;
  backendUrl?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

interface UseWebSocketReturn {
  socket: any;
  isConnected: boolean;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  joinOrder: (orderId: string) => void;
  joinDeliveryRoom: () => void;
  updatePosition: (orderId: string, lat: number, lng: number) => void;
  updateStatus: (orderId: string, status: string) => void;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    backendUrl = API_CONFIG.BASE_URL,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (autoConnect && !initialized.current) {
      initialized.current = true;
      connectToSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [autoConnect, backendUrl]);

  const connectToSocket = async (url?: string) => {
    try {
      await initializeDeliverySocket(url || backendUrl);
      socketRef.current = getDeliverySocket();

      // Setup event listeners
      socketRef.current.on("connect", () => {
        setIsConnected(true);
        onConnect?.();
      });

      socketRef.current.on("disconnect", () => {
        setIsConnected(false);
        onDisconnect?.();
      });

      socketRef.current.on("connect_error", (error: any) => {
        setIsConnected(false);
        onError?.(error);
      });

      // Check initial connection status
      setIsConnected(isDeliverySocketConnected());
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      onError?.(error);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  };

  const joinOrder = (orderId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.joinOrder(orderId);
    } else {
      console.warn("Cannot join order: WebSocket not connected");
    }
  };

  const joinDeliveryRoom = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.joinDeliveryRoom();
    } else {
      console.warn("Cannot join delivery room: WebSocket not connected");
    }
  };

  const updatePosition = (orderId: string, lat: number, lng: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.updatePosition(orderId, lat, lng);
    } else {
      console.warn("Cannot update position: WebSocket not connected");
    }
  };

  const updateStatus = (orderId: string, status: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.updateStatus(orderId, status);
    } else {
      console.warn("Cannot update status: WebSocket not connected");
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connect: connectToSocket,
    disconnect,
    emit,
    joinOrder,
    joinDeliveryRoom,
    updatePosition,
    updateStatus,
  };
}

export default useWebSocket;
