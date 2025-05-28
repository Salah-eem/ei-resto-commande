"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  List,
  ListItem,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import loadDynamic from "next/dynamic";

import { Order, OrderStatus } from "@/types/order";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { RootState } from "@/store/store";
import { fetchRestaurantInfo } from "@/store/slices/restaurantSlice";
import { fetchDeliveryOrders, updateOrder } from "@/store/slices/orderSlice";

// Import dynamique du composant de carte (Leaflet)
const DeliveryMap = loadDynamic(() => import("@/components/DeliveryMap"), {
  ssr: false,
});

// Fonction simulée de récupération de route (à remplacer par l’API ORS si besoin)
// Fetch route using openrouteservice (same as client tracking)
async function fetchRoute(start: [number, number], end: [number, number]) {
  /*try {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
        },
        body: JSON.stringify({
          coordinates: [
            [start[1], start[0]],
            [end[1], end[0]],
          ],
        }),
      }
    );
    const json = await res.json();
    return json.features[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
  } catch {
    return [];
  }*/
  // Utilisation de données GeoJSON simulées pour éviter d'épuiser les requêtes API
  // Voir la structure de la réponse simulée ci-dessous
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      resolve({
        type: "FeatureCollection",
        bbox: [4.3599, 50.892927, 4.365099, 50.901398],
        features: [
          {
            bbox: [4.3599, 50.892927, 4.365099, 50.901398],
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [4.360623, 50.90125],
                [4.360621, 50.901362],
                [4.360584, 50.901395],
                [4.360541, 50.901398],
                [4.360492, 50.901372],
                [4.360407, 50.901238],
                [4.360432, 50.90118],
                [4.360484, 50.901134],
                [4.36058, 50.900921],
                [4.360565, 50.90055],
                [4.360473, 50.900276],
                [4.36021, 50.899653],
                [4.360104, 50.899407],
                [4.359994, 50.899411],
                [4.359912, 50.899365],
                [4.3599, 50.89931],
                [4.359979, 50.899246],
                [4.360078, 50.89924],
                [4.360158, 50.899277],
                [4.361434, 50.898854],
                [4.361408, 50.898814],
                [4.361422, 50.898751],
                [4.361465, 50.898717],
                [4.361526, 50.898697],
                [4.361629, 50.898702],
                [4.361706, 50.898745],
                [4.362498, 50.898618],
                [4.362648, 50.898562],
                [4.362805, 50.898417],
                [4.362678, 50.89786],
                [4.362667, 50.897537],
                [4.362696, 50.89719],
                [4.362718, 50.896988],
                [4.362791, 50.896825],
                [4.363003, 50.896373],
                [4.363201, 50.896049],
                [4.36312, 50.896014],
                [4.362954, 50.895848],
                [4.363165, 50.895829],
                [4.363165, 50.895779],
                [4.36323, 50.895718],
                [4.363308, 50.895699],
                [4.363428, 50.895719],
                [4.363478, 50.895757],
                [4.363496, 50.895805],
                [4.363737, 50.895809],
                [4.364332, 50.895771],
                [4.364567, 50.895767],
                [4.364572, 50.895714],
                [4.364598, 50.895699],
                [4.365099, 50.895628],
                [4.365007, 50.893949],
                [4.364956, 50.893069],
                [4.364857, 50.89293],
                [4.364661, 50.892927],
                [4.364452, 50.892976],
                [4.36396, 50.893157],
                [4.363482, 50.893404],
              ],
            },
          },
        ],
      });
    }, 1000);
  });
}

export default function DeliveryMonitorPage() {
  const dispatch = useAppDispatch();
  const { orders, loading, error } = useAppSelector(
    (state: RootState) => state.orders
  );
  const { restaurantAddress } = useAppSelector((s: RootState) => s.restaurant);
  const user = useAppSelector((state: RootState) => state.user.profile);

  const [statusFilter, setStatusFilter] = useState<OrderStatus>(
    OrderStatus.READY_FOR_DELIVERY
  );
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [restaurantPos, setRestaurantPos] = useState<[number, number] | null>(
    null
  );
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [loadingGo, setLoadingGo] = useState(false);
  const [errorGo, setErrorGo] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchRestaurantInfo() as any);
    dispatch(fetchDeliveryOrders() as any);
  }, [dispatch]);

  useEffect(() => {
    if (restaurantAddress) {
      setRestaurantPos([restaurantAddress.lat, restaurantAddress.lng]);
    }
    if (selectedOrder && restaurantAddress) {
      const r: [number, number] = [
        restaurantAddress.lat,
        restaurantAddress.lng,
      ];
      const c: [number, number] = [
        selectedOrder.deliveryAddress!.lat,
        selectedOrder.deliveryAddress!.lng,
      ];
      fetchRoute(r, c).then((geojson) => {
        const coords = geojson?.features?.[0]?.geometry?.coordinates || [];
        setRouteCoords(coords.map((c: any) => [c[1], c[0]]));
      });
    } else {
      setRouteCoords([]);
    }
  }, [selectedOrder, restaurantAddress]);

  useEffect(() => {
    if (orders) {
      setFilteredOrders(orders.filter((o) => o.orderStatus === statusFilter));
    }
  }, [orders, statusFilter]);

  const handleStatusChange = (status: OrderStatus) => {
    setStatusFilter(status);
    setSelectedOrder(null);
  };

  const handleGoNow = async () => {
    if (!user) return setErrorGo("Driver not found.");
    if (!selectedOrder) return setErrorGo("No order selected.");
    setLoadingGo(true);
    setErrorGo(null);
    try {
      await dispatch(
        updateOrder({
          orderId: selectedOrder._id,
          orderData: {
            deliveryDriver: user,
            orderStatus: OrderStatus.OUT_FOR_DELIVERY,
          },
        }) as any
      );
      setOrderDialogOpen(false);
      dispatch(fetchDeliveryOrders() as any);

      if (
        selectedOrder.deliveryAddress &&
        restaurantAddress &&
        typeof window !== "undefined"
      ) {
        const from = encodeURIComponent(
          `${restaurantAddress.street} ${restaurantAddress.streetNumber}, ${restaurantAddress.city} ${restaurantAddress.postalCode}, ${restaurantAddress.country}`
        );
        const to = encodeURIComponent(
          `${selectedOrder.deliveryAddress.street} ${selectedOrder.deliveryAddress.streetNumber}, ${selectedOrder.deliveryAddress.city} ${selectedOrder.deliveryAddress.postalCode}, ${selectedOrder.deliveryAddress.country}`
        );
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}`,
          "_blank"
        );
      }
    } catch (e: any) {
      setErrorGo(e?.message || "Erreur lors de la prise en charge.");
    } finally {
      setLoadingGo(false);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100vh"
      >
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" height="100vh">
      {/* Sidebar */}
      <Box
        width={350}
        bgcolor="#f5f5f5"
        p={2}
        boxShadow={2}
        display="flex"
        flexDirection="column"
      >
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
          >
            <MenuItem value={OrderStatus.READY_FOR_DELIVERY}>
              Ready for Delivery
            </MenuItem>
            <MenuItem value={OrderStatus.OUT_FOR_DELIVERY}>
              Out for Delivery
            </MenuItem>
          </Select>
        </FormControl>
        {filteredOrders.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            mt={4}
          >
            Aucune commande trouvée.
          </Typography>
        ) : (
          <List sx={{ flex: 1, overflowY: "auto" }}>
            {filteredOrders.map((order) => (
              <ListItem key={order._id} disablePadding sx={{ mb: 2 }}>
                <Card
                  sx={{
                    width: "100%",
                    cursor: "pointer",
                    border:
                      selectedOrder && selectedOrder._id === order._id
                        ? "2px solid #1976d2"
                        : undefined,
                  }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {order.scheduledFor
                        ? new Date(order.scheduledFor).toLocaleTimeString()
                        : new Date(order.createdAt).toLocaleTimeString()}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} gutterBottom>
                      {order.deliveryAddress?.street}{" "}
                      {order.deliveryAddress?.streetNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Driver: {order.deliveryDriver?.firstName || "—"}
                    </Typography>
                    {selectedOrder &&
                      selectedOrder._id === order._id &&
                      selectedOrder.orderStatus ===
                        OrderStatus.READY_FOR_DELIVERY && (
                        <Box mt={1}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => setOrderDialogOpen(true)}
                            disabled={loadingGo}
                          >
                            {loadingGo ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              "Go"
                            )}
                          </Button>
                          {errorGo && (
                            <Typography color="error" mt={1}>
                              {errorGo}
                            </Typography>
                          )}
                        </Box>
                      )}
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Map */}
      <Box flex={1} position="relative">
        {restaurantPos ? (
          <DeliveryMap
            restaurantPos={restaurantPos}
            selectedOrder={selectedOrder}
            routeCoords={routeCoords}
          />
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Typography variant="h6" color="text.secondary">
              Sélectionnez une commande pour voir la carte
            </Typography>
          </Box>
        )}

        {/* DIALOG */}
        {selectedOrder && (
          <Dialog
            open={orderDialogOpen}
            onClose={() => setOrderDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <span>Commande #{selectedOrder._id.slice(0, 4)}</span>
                <Button
                  onClick={() => setOrderDialogOpen(false)}
                  sx={{ fontSize: 28 }}
                >
                  &times;
                </Button>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <List>
                {selectedOrder.items.map((item, idx) => (
                  <ListItem key={idx}>
                    <Typography>
                      {item.quantity} × {item.name}{" "}
                      {item.size && <span>({item.size})</span>}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </DialogContent>
            <DialogActions>
              {selectedOrder.orderStatus === OrderStatus.READY_FOR_DELIVERY && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGoNow}
                  disabled={loadingGo}
                >
                  {loadingGo ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Go now"
                  )}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  );
}
