"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { Box, Typography, Chip, Snackbar, Paper } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { fetchRestaurantInfo } from '@/store/slices/restaurantSlice';
import { RootState } from '@/store/store';
import { fetchOrder } from '@/store/slices/orderSlice';

// 📌 Icônes personnalisées
const deliveryIcon = new L.Icon({
  iconUrl: '/scooter-icon.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const restaurantIcon = new L.Icon({
  iconUrl: '/restaurant-icon.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const clientIcon = new L.Icon({
  iconUrl: '/house-icon.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// 📌 FitBounds pour zoomer sur tout le trajet
const FitBoundsMap = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds]);
  return null;
};

// 📌 Récupération de l'itinéraire OpenRouteService
const fetchRoute = async (start: [number, number], end: [number, number]) => {
  try {
    const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
      },
      body: JSON.stringify({
        coordinates: [
          [start[1], start[0]],
          [end[1], end[0]],
        ],
      }),
    });

    const data = await res.json();
    const routeCoords = data.features[0].geometry.coordinates.map((coord: any) => [coord[1], coord[0]]);
    return routeCoords;
  } catch (err) {
    console.error('Error fetching ORS route:', err);
    return [];
  }
};

const OrderTrackingPage = () => {
  const dispatch = useAppDispatch();
  const { orderId } = useParams();

  const { order } = useAppSelector((state: RootState) => state.order);
  const { restaurantAddress } = useAppSelector((state: RootState) => state.restaurant);
  
  const [restaurantPosition, setRestaurantPosition] = useState<[number, number] | null>(null);
  const [deliveryPosition, setDeliveryPosition] = useState<[number, number] | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<[number, number][]>([]);
  const [clientPosition, setClientPosition] = useState<[number, number] | null>(null);
  const [status, setStatus] = useState(order?.orderStatus || 'Loading...');
  const [eta, setEta] = useState<string>('Calculating...');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const markerRef = useRef<any>(null);

  // 📌 Charger infos restaurant une seule fois
  useEffect(() => {
    dispatch(fetchRestaurantInfo() as any);
  }, [dispatch]);

  // 📌 Charger la commande
  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrder(orderId as string) as any);
    }
  }, [orderId, dispatch]);

  // 📌 Dès que restaurant & order chargés → préparer positions
  useEffect(() => {
    const setupPositions = async () => {
      if (restaurantAddress && order && order.deliveryAddress) {
        setStatus(order.orderStatus);

        const restaurantPos: [number, number] = [restaurantAddress.lat, restaurantAddress.lng];
        const clientPos: [number, number] = [order.deliveryAddress.lat, order.deliveryAddress.lng];
        setRestaurantPosition(restaurantPos);
        setClientPosition(clientPos);

        // Position du livreur
        if (order.positionHistory.length > 0) {
          const lastPos = order.positionHistory[order.positionHistory.length - 1];
          setDeliveryPosition([lastPos.lat, lastPos.lng]);
        } else {
          setDeliveryPosition(restaurantPos);
        }

        // Itinéraire initial
        const route = await fetchRoute(restaurantPos, clientPos);
        setPolylineCoords(route);
      }
    };

    setupPositions();
  }, [restaurantAddress, order]);

  // 📌 Notifications
  const notifyDelivered = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("🎉 Your order has been delivered!");
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("🎉 Your order has been delivered!");
        }
      });
    }
  };

  // 📌 Socket.IO : mise à jour position et statut
  useEffect(() => {
    if (!orderId || !clientPosition) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL!);
    socket.emit('joinOrder', orderId);

    socket.on('locationUpdate', async (data: { lat: number; lng: number }) => {
      const newPos: [number, number] = [data.lat, data.lng];

      if (markerRef.current) markerRef.current.setLatLng(newPos);
      setDeliveryPosition(newPos);

      const route = await fetchRoute(newPos, clientPosition);
      setPolylineCoords(route);

      // Estimation du temps
      const clientLatLng = L.latLng(clientPosition[0], clientPosition[1]);
      const deliveryLatLng = L.latLng(newPos[0], newPos[1]);
      const distance = deliveryLatLng.distanceTo(clientLatLng);
      const speedMps = 5;
      const etaMinutes = Math.ceil(distance / speedMps / 60);
      setEta(`~${etaMinutes} min`);
    });

    socket.on('statusUpdate', (data: { status: string }) => {
      setStatus(data.status);
      if (data.status === "delivered") {
        notifyDelivered();
        setShowSnackbar(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, clientPosition]);

  const bounds = clientPosition && restaurantPosition && deliveryPosition
    ? L.latLngBounds([restaurantPosition, clientPosition, deliveryPosition])
    : null;

  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      <Typography variant="h5" mb={2}>Live Delivery Tracking</Typography>
      <Chip label={`Status: ${status}`} color="primary" sx={{ mb: 2 }} />

      {restaurantPosition && deliveryPosition && (
        <MapContainer
          center={deliveryPosition}
          zoom={13}
          style={{ height: "500px", width: "100%", borderRadius: 8 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='© OpenStreetMap, © CartoDB'
          />
          {bounds && <FitBoundsMap bounds={bounds} />}

          {/* Marqueurs */}
          <Marker position={restaurantPosition} icon={restaurantIcon}>
            <Popup>Restaurant</Popup>
          </Marker>

          {clientPosition && (
            <Marker position={clientPosition} icon={clientIcon}>
              <Popup>Your location</Popup>
            </Marker>
          )}

          <Marker position={deliveryPosition} icon={deliveryIcon} ref={markerRef}>
            <Popup>Delivery in progress...</Popup>
          </Marker>

          {polylineCoords.length > 0 && (
            <Polyline positions={polylineCoords} color="blue" weight={4} opacity={0.7} />
          )}
        </MapContainer>
      )}

      {/* ETA Badge */}
      <Paper elevation={3} sx={{
        position: 'absolute',
        top: 20,
        right: 20,
        padding: '8px 16px',
        borderRadius: 2,
        backgroundColor: '#1976d2',
        color: 'white'
      }}>
        ETA: {eta}
      </Paper>

      <Snackbar
        open={showSnackbar}
        message="Order Delivered!"
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
      />
    </Box>
  );
};

export default OrderTrackingPage;
