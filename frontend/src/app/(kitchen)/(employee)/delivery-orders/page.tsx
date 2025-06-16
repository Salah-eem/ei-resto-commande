"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Checkbox,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { fetchDeliveryOrders, updateOrderStatus } from "@/store/slices/orderSlice";
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";
import { Order, OrderStatus } from "@/types/order";
import { fetchRestaurantInfo } from "@/store/slices/restaurantSlice";
import { getDeliverySocket } from "@/lib/deliverySocket";
import { useRouter } from 'next/navigation';

export default function DeliveryOrdersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { restaurantAddress } = useAppSelector((state) => state.restaurant);
  const { orders, loading, error } = useAppSelector((state) => state.orders);
  const [deliveryOrders, setDeliveryOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    dispatch(fetchRestaurantInfo() as any);
    // Demander la position du livreur dès l'arrivée sur la page
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setCurrentPosition(null); // refusé ou erreur
        }
      );
    }
    // --- WebSocket pour commandes en livraison ---
    const socket = getDeliverySocket();
    socket.emit("joinDeliveryRoom"); // (optionnel: côté backend, join room globale)
    const handleUpdate = (orders: any[]) => {
      setDeliveryOrders(
        orders.filter((order: any) => order.orderStatus === OrderStatus.READY_FOR_DELIVERY)
      );
    };
    socket.on("deliveryOrders:update", handleUpdate);
    // Initial fetch fallback (si pas d'event reçu)
    const fetchOrders = async () => {
      try {
        const response = await dispatch(fetchDeliveryOrders() as any);
        setDeliveryOrders(response.payload.filter((order: Order) => order.orderStatus === OrderStatus.READY_FOR_DELIVERY));
      } catch (err) {
        console.error("Failed to fetch delivery orders:", err);
      }
    };
    fetchOrders();
    return () => {
      socket.off("deliveryOrders:update", handleUpdate);
    };
  }, [dispatch]);

  const handleSelect = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleStartDelivery = async () => {
    for (const orderId of selectedOrders) {
      await dispatch(updateOrderStatus({ orderId, status: OrderStatus.OUT_FOR_DELIVERY }) as any);
    }
    setSnackbar("Livraison commencée pour les commandes sélectionnées.");
    if (selectedOrders.length > 0) {
      const selected = deliveryOrders.filter((order) => selectedOrders.includes(order._id));
      const coords = selected
        .map((order) => order.deliveryAddress && order.deliveryAddress.lat && order.deliveryAddress.lng
          ? `${order.deliveryAddress.lat},${order.deliveryAddress.lng}`
          : null)
        .filter(Boolean);
      if (coords.length > 0) {
        // Utilise la position récupérée ou fallback sur restaurant/Bruxelles
        /*const origin = currentPosition
          ? `${currentPosition.lat},${currentPosition.lng}`
          : restaurantAddress?.lat && restaurantAddress?.lng
            ? `${restaurantAddress.lat},${restaurantAddress.lng}`
            : "50.8503,4.3517";
        const destination = coords[coords.length - 1];
        const waypoints = coords.slice(0, -1).join("|");
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
        if (waypoints) url += `&waypoints=${waypoints}`;
        window.open(url, "_blank");*/
        router.push('delivery/68488f209efa0ceed84dab77'); // Simule la navigation vers une page de suivi de livraison
      }
    }
    setSelectedOrders([]);
    // Re-fetch delivery orders to update the list
    const updatedOrders = await dispatch(fetchDeliveryOrders() as any);
    setDeliveryOrders(updatedOrders.payload.filter((order: Order) => order.orderStatus === OrderStatus.READY_FOR_DELIVERY));
  };

  return (
    <ProtectRoute allowedRoles={[Role.Employee, Role.Admin]}>
      <Box maxWidth="md" mx="auto" py={4}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="40vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <>
            <List>
              {(deliveryOrders || []).length === 0 && (
                <Typography color="text.secondary" textAlign="center" mt={4}>
                    No orders ready for delivery at the moment.
                </Typography>
              )}
              {(deliveryOrders || []).map((order: Order) => (
                <ListItem key={order._id} divider>
                  <Checkbox
                    checked={selectedOrders.includes(order._id)}
                    onChange={() => handleSelect(order._id)}
                  />
                  <ListItemText
                    primary={`#${order._id.slice(-5).toUpperCase()} - ${order.customer?.name || "Unknown Client"}`}
                    secondary={`Address: ${order.deliveryAddress?.street || "-"} ${order.deliveryAddress?.streetNumber || ""} ${order.deliveryAddress?.city || ""}`}
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="body2" color="text.secondary">
                      {order.totalAmount?.toFixed(2)} €
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Button
              variant="contained"
              color="primary"
              disabled={selectedOrders.length === 0}
              onClick={handleStartDelivery}
              sx={{ mt: 3, mr: 2 }}
            >
              Start Delivery
            </Button>
          </>
        )}
        <Snackbar
          open={!!snackbar}
          message={snackbar}
          autoHideDuration={4000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Box>
    </ProtectRoute>
  );
}
