'use client';

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Button, Box, Typography } from '@mui/material';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { fetchOrder } from "@/store/slices/orderSlice";
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";
import { fetchRestaurantInfo } from '@/store/slices/restaurantSlice';

const DeliverySimulatorPage = () => {
  const dispatch = useAppDispatch();
  const { orderId } = useParams();
  const { restaurantAddress } = useAppSelector((state) => state.restaurant);
  const { order, loading, error } = useAppSelector((state) => state.order);
  const [socket, setSocket] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [positions, setPositions] = useState<{ lat: number; lng: number }[]>([]);

  // ➤ Charger la commande
  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      dispatch(fetchOrder(orderId));
      dispatch(fetchRestaurantInfo() as any);
    }
  }, [orderId, dispatch]);

  // ➤ Connexion socket
  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!+'/delivery', {
      transports: ['websocket'],
    });
    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // ➤ Générer les positions du trajet réel avec OpenRouteService
  useEffect(() => {
    const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
      try {
        const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car/geojson`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY!,
          },
          body: JSON.stringify({
            coordinates: [
              [start.lng, start.lat], // ORS → [lng, lat]
              [end.lng, end.lat],
            ],
          }),
        });
        const data = await res.json();
        const routeCoords = data.features[0].geometry.coordinates.map((coord: any) => ({
          lat: coord[1],
          lng: coord[0],
        }));
        setPositions(routeCoords);
      } catch (err) {
        setPositions([]);
        console.error('Erreur récupération ORS:', err);
      }
    };

    if (order && order.deliveryAddress && restaurantAddress) {
      const start = { lat: restaurantAddress.lat, lng: restaurantAddress.lng };
      const end = {
        lat: order.deliveryAddress.lat,
        lng: order.deliveryAddress.lng,
      };
      fetchRoute(start, end);
    }
  }, [order, restaurantAddress]);

  // ➤ Démarrer la simulation
  const startSimulation = () => {
    if (!socket || !orderId) return;

    socket.emit('joinOrder', orderId as string);
    setIsSimulating(true);

    let index = 0;
    const interval = setInterval(() => {
      if (index >= positions.length) {
        clearInterval(interval);
        socket.emit('updateStatus', { orderId, status: 'delivered' });
        setIsSimulating(false);
        return;
      }

      const currentPos = positions[index];
      console.log('📍 Envoi position:', currentPos);
      socket.emit('updatePosition', { orderId, lat: currentPos.lat, lng: currentPos.lng });
      index++;
    }, 5000); // tu peux ajuster la vitesse ici
  };

  return (
    <ProtectRoute allowedRoles={[Role.Employee, Role.Admin]}>
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" mb={3}>Delivery Simulator</Typography>
        <Typography variant="subtitle1" mb={1}>Order ID: {orderId}</Typography>

        {loading && <Typography>Loading order details...</Typography>}
        {error && <Typography color="error">{error}</Typography>}

        {order && order.deliveryAddress && (
          <Box mb={2}>
            <Typography variant="body1">Client Position:</Typography>
            <Typography variant="body2">
              Lat: {order.deliveryAddress.lat}, Lng: {order.deliveryAddress.lng}
            </Typography>
          </Box>
        )}

        <Button
          variant="contained"
          disabled={isSimulating }
          onClick={startSimulation}
        >
          {isSimulating ? 'Simulating...' : 'Start Delivery Simulation'}
        </Button>
      </Box>
    </ProtectRoute>
  );
};

export default DeliverySimulatorPage;
