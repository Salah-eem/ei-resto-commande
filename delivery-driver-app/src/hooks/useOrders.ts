import { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchOrders, updateOrderStatus } from "../store/slices/orderSlice";

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refreshOrders: () => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  filterOrders: (status?: OrderStatus) => Order[];
}

export const useOrders = (): UseOrdersReturn => {
  const dispatch = useAppDispatch();
  const { orders, loading, error } = useAppSelector((state) => state.orders);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      await dispatch(fetchOrders()).unwrap();
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const refreshOrders = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchOrders()).unwrap();
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await dispatch(updateOrderStatus({ orderId, status })).unwrap();
      console.log("Updating order status:", orderId, status);
    } catch (error) {
      console.error("Error updating status:", error);
      throw error;
    }
  };

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.find((order: Order) => order._id === orderId);
  };

  const filterOrders = (status?: OrderStatus): Order[] => {
    if (!status) return orders;
    return orders.filter((order: Order) => order.orderStatus === status);
  };

  return {
    orders,
    loading: loading || refreshing,
    error,
    refreshOrders,
    updateStatus,
    getOrderById,
    filterOrders,
  };
};
