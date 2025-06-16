"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { fetchRestaurantInfo } from '@/store/slices/restaurantSlice';
import { fetchOrder } from '@/store/slices/orderSlice';
import { RootState } from '@/store/store';

import {
  Box,
  Typography,
  Chip,
  Snackbar,
  Paper,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';

import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';

import {
  Restaurant as RestaurantIcon,
  DeliveryDining as DeliveryIcon,
  Home as HomeIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';

import { keyframes } from '@mui/system';
import { motion } from 'framer-motion';

import L from 'leaflet';
import io from 'socket.io-client';

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(25,118,210,0.7); }
  70% { box-shadow: 0 0 0 10px rgba(25,118,210,0); }
  100% { box-shadow: 0 0 0 0 rgba(25,118,210,0); }
`;

const DELIVERY_STATUSES = [
  { key: 'confirmed',         label: 'Confirmed',         icon: <RestaurantIcon /> },
  { key: ['in preparation', 'prepared', 'ready for delivery'],    label: 'Preparing',         icon: <RestaurantIcon /> },
  // { key: 'ready for delivery',label: 'Ready',             icon: <CheckIcon /> },
  { key: 'out for delivery',  label: 'Out for Delivery',  icon: <DeliveryIcon /> },
  { key: 'delivered',         label: 'Delivered',         icon: <HomeIcon /> },
  { key: 'canceled',          label: 'Canceled',          icon: <ErrorIcon /> },
];

const PICKUP_STATUSES = [
  { key: 'confirmed',         label: 'Confirmed',         icon: <RestaurantIcon /> },
  { key: ['in preparation', 'prepared'],    label: 'Preparing',         icon: <RestaurantIcon /> },
  { key: 'ready for pickup',  label: 'Ready',             icon: <CheckIcon /> },
  { key: 'picked up',         label: 'Picked Up',         icon: <CheckIcon /> },
  { key: 'canceled',          label: 'Canceled',          icon: <ErrorIcon /> },
];

function getStatuses(type: string) {
  return type === 'pickup' ? PICKUP_STATUSES : DELIVERY_STATUSES;
}

function getStatusIndex(status: string, type: string) {
  const statuses = getStatuses(type);
  for (let i = 0; i < statuses.length; i++) {
    const k = statuses[i].key;
    if (Array.isArray(k) && k.includes(status)) return i;
    if (k === status) return i;
  }
  return -1;
}

const FitBounds = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [bounds, map]);
  return null;
};

async function fetchRoute(start: [number, number], end: [number, number]) {
  try {
    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
      {
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
      }
    );
    const json = await res.json();
    return json.features[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
  } catch {
    return [];
  }
}

export default function OrderTrackingPage() {
  const { orderId }: { orderId: string } = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { order } = useAppSelector((s: RootState) => s.order);
  const { restaurantAddress } = useAppSelector((s: RootState) => s.restaurant);

  const [restaurantPos, setRestaurantPos] = useState<[number, number] | null>(null);
  const [clientPos,     setClientPos]     = useState<[number, number] | null>(null);
  const [deliveryPos,   setDeliveryPos]   = useState<[number, number] | null>(null);
  const [routeCoords,   setRouteCoords]   = useState<[number, number][]>([]);
  const [eta,           setEta]           = useState<string>('');
  const [status,        setStatus]        = useState<string>('loading...');
  const [snackbar,      setSnackbar]      = useState(false);

  // load restaurant info once
  useEffect(() => {
    dispatch(fetchRestaurantInfo() as any);
  }, [dispatch]);

  // load order data
  useEffect(() => {
    if (orderId) dispatch(fetchOrder(orderId as string) as any);
  }, [orderId, dispatch]);

  // when order arrives, set positions + initial route if needed
  useEffect(() => {
    if (!order || !restaurantAddress) return;

    setStatus(order.orderStatus);

    if (!order.deliveryAddress) return;

    const r: [number, number] = [restaurantAddress.lat, restaurantAddress.lng];
    const c: [number, number] = [order.deliveryAddress.lat, order.deliveryAddress.lng];
    setRestaurantPos(r);
    setClientPos(c);

    const last = order.positionHistory.length
      ? order.positionHistory.at(-1)!
      : { lat: r[0], lng: r[1] };
    setDeliveryPos([last.lat, last.lng]);

    // only fetch the route before delivery
    if (order.orderType === 'delivery') {
      fetchRoute(r, c).then(setRouteCoords);
    }
  }, [order, restaurantAddress]);

  // socket updates: location & status
  useEffect(() => {
    if (!orderId) return;
    const socket = io(process.env.NEXT_PUBLIC_API_URL! + '/delivery', {
      transports: ['websocket'],
    });
    socket.emit('joinOrder', orderId);

    socket.on('locationUpdate', async ({ lat, lng }) => {
      const pos: [number, number] = [lat, lng];
      setDeliveryPos(pos);

      if (order?.orderType === 'delivery' && clientPos) {
        const coords = await fetchRoute(pos, clientPos);
        setRouteCoords(coords);

        // simple ETA calc à 5 m/s
        const d1 = L.latLng(pos[0], pos[1]);
        const d2 = L.latLng(clientPos[0], clientPos[1]);
        const dist = d1.distanceTo(d2);
        const minutes = Math.ceil(dist / 5 / 60);
        setEta(`~${minutes} min`);
      } else {
        // setEta('');
      }
    });

    // Listen for status updates and update the order state
    socket.on('statusUpdate', ({ status: s }) => {
      setStatus(s);
      // Optionally, you can refetch the order to get all new data
      dispatch(fetchOrder(orderId as string) as any);
      if (s === 'delivered') {
        setSnackbar(true);
        new Audio('/notification.mp3').play();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, clientPos, order?.orderType, dispatch]);

  // loader initial
  if (!order) {
    return (
      <Box textAlign="center" pt={10}>
        <CircularProgress />
        <Typography mt={2}>Loading order…</Typography>
      </Box>
    );
  }

  const type       = order.orderType;
  const statuses   = getStatuses(type);
  const currentIdx = getStatusIndex(status, type);

  // Determine what content to show based on order status
  const isPreparingPhase = ['confirmed', 'in preparation', 'prepared', 'ready for delivery'].includes(status);
  const isReadyForPickup = status === 'ready for pickup' && type === 'pickup';
  const isOutForDelivery = status === 'out for delivery';
  const isDeliveryType = type === 'delivery';
  const isReceived = ['picked up', 'delivered'].includes(status);

  // Bounds for map (only used when showing map)
  const bounds =
    restaurantPos && clientPos && deliveryPos
      ? L.latLngBounds([restaurantPos, clientPos, deliveryPos])
      : null;

  // Function to render the timeline
  const renderTimeline = () => (
    <Timeline
      position={'alternate'}
      sx={{
        bgcolor: '#f9fafb',
        borderRadius: 2,
        py: 2,
        px: 1,
        display: 'flex',
        flexDirection: 'row',
        overflowX: 'auto',
        mb: 3
      }}
    >
      {statuses
        .filter(s => s.key !== 'canceled')
        .map((step, i) => {
          const active = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const prevActive = i - 1 <= currentIdx;
          const stepKey = Array.isArray(step.key) ? step.key.join('-') : step.key;
          return (
            <motion.div
              key={stepKey}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, type: 'spring', stiffness: 80 }}
            >
              <TimelineItem
                sx={{
                  alignItems: 'center',
                  mx: 1,
                  my: 0
                }}
              >
                <TimelineSeparator
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: active ? 1.2 : 1, boxShadow: active ? `${pulse} 1.5s infinite` : 'none' }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <TimelineDot
                      sx={{
                        background: active
                          ? 'linear-gradient(135deg,#1976d2, #42a5f5)'
                          : '#ddd',
                        boxShadow: 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {step.icon}
                    </TimelineDot>
                  </motion.div>
                  {i < statuses.filter(s => s.key !== 'canceled').length - 1 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: active ? 32 : 32, backgroundColor: prevActive ? '#1976d2' : '#ddd' }}
                      transition={{ delay: i * 0.15 + 0.1, duration: 0.5 }}
                      style={{ height: 3, margin: '0 8px', borderRadius: 2 }}
                    >
                      <TimelineConnector
                        sx={{
                          bgcolor: 'transparent',
                          width: '100%',
                          flex: 1,
                          height: 'auto',
                          mx: 0,
                          my: 0,
                          minWidth: 32
                        }}
                      />
                    </motion.div>
                  )}
                </TimelineSeparator>
                <TimelineContent
                  sx={{
                    textAlign: 'center',
                    pt: 2,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.18 + 0.2 }}
                  >
                    <Typography
                      fontWeight={active ? 700 : 400}
                      color={active ? 'primary.main' : 'text.secondary'}
                      variant="body2"
                    >
                      {step.label}
                    </Typography>
                  </motion.div>
                </TimelineContent>
              </TimelineItem>
            </motion.div>
          );
        })}
    </Timeline>
  );

  // Function to render preparation content
  const renderPreparationContent = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h5" fontWeight={600} color="primary.main" gutterBottom>
            {isPreparingPhase ? 'Your order is being prepared...' : 
            isReadyForPickup ? 'Your order is ready for pickup!' : isReceived ? 'Thank you for your order!' : ''}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {isPreparingPhase ? 'Our chefs are working hard to make your delicious meal!' : 
            isReadyForPickup ? 'You can pick it up at the restaurant!' : isReceived ? 'See you next time!' : ''}
          </Typography>

          {eta && (
            <Box display="flex" justifyContent="center" alignItems="center" mb={3}>
              <Typography variant="body2" color="text.secondary">
                Estimated {isDeliveryType ? 'delivery' : 'pickup'}: {eta}
              </Typography>
              <InfoIcon fontSize="small" color="action" sx={{ ml: 0.5 }} />
            </Box>
          )}

          {/* Animation de préparation de pizza */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 220,
              mb: 2
            }}
          >
            {isPreparingPhase && (
              <video
                src="/pizza-making.mp4"
                autoPlay
                loop
                muted
                style={{
                  maxWidth: 300,
                  width: '100%',
                  height: '100%',
                  borderRadius: 16,
                }}
              />
            )}
            {isReadyForPickup && (
              <video
                src="/pizza-ready.mp4"
                autoPlay
                loop
                muted
                style={{
                  maxWidth: 300,
                  width: '100%',
                  height: '100%',
                  borderRadius: 16,
                }}
              />
            )}
            {isReceived && (
              <video
                src="/pizza-received.mp4"
                autoPlay
                loop
                muted
                style={{
                  maxWidth: 300,
                  width: '100%',
                  height: '100%',
                  borderRadius: 16,
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Function to render map content
  const renderMapContent = () => (
    bounds && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
          <CardContent sx={{ p: 0 }}>
            <MapContainer
              bounds={bounds}
              style={{ height: 400, width: '100%' }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <FitBounds bounds={bounds} />

              <Marker position={restaurantPos!}
                icon={new L.Icon({
                  iconUrl: '/restaurant-icon.png',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
                >
                <Popup>Restaurant</Popup>
              </Marker>
              <Marker position={clientPos!}
                icon={new L.Icon({
                  iconUrl: '/house-icon.png',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
                >
                <Popup>Your Location</Popup>
              </Marker>
              <Marker
                position={deliveryPos!}
                icon={new L.Icon({
                  iconUrl: '/scooter-icon.png',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
              >
                <Popup>Delivery Driver</Popup>
              </Marker>

              <Polyline positions={routeCoords} weight={4} color="#1976d2" />
            </MapContainer>
          </CardContent>
        </Card>
      </motion.div>
    )
  );

  return (
    <Box p={3} position="relative">
      {/* Header with back button */}
      <Box display="flex" alignItems="center" mb={3}>
        <ArrowBackIcon
          onClick={() => router.back()}
          sx={{ cursor: 'pointer', mr: 1, fontSize: 28 }}
        />
        <Typography variant="h4" fontWeight={600}>
          Order Tracking
        </Typography>
      </Box>

      {/* Status chip */}
      <Chip
        label={`Status: ${statuses[currentIdx]?.label || 'Unknown'}`}
        color={
          ['delivered', 'picked up'].includes(status) ? 'success'
            : status === 'canceled' ? 'error'
            : 'primary'
        }
        sx={{ mb: 3, fontSize: '1rem', py: 3 }}
      />

      {/* Always show timeline */}
      {renderTimeline()}

      {/* Conditional content based on status */}
      {isDeliveryType && isOutForDelivery && renderMapContent()}
      {(isPreparingPhase || isReadyForPickup || isReceived) && renderPreparationContent()}

      {/* ETA badge */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
          bgcolor: 'primary.main',
          color: '#fff',
          px: 2,
          py: 1,
          borderRadius: 2,
          zIndex: 1000
        }}
      >
        <Typography variant="body2" fontWeight={600}>
          ETA:{' '}
          {!isDeliveryType
            ? status === 'prepared' || status === 'ready for pickup'
              ? 'Ready for pickup'
              : 'Preparing…'
            : eta || 'Calculating...'}
        </Typography>
      </Paper>

      {/* Success notification */}
      <Snackbar
        open={snackbar}
        message="Order delivered! 🎉"
        autoHideDuration={4000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
