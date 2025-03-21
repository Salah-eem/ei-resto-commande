'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Stack, Chip } from '@mui/material';
import axios from 'axios';
import io from 'socket.io-client';

const DeliveryDashboard = () => {
  const [orderId, setOrderId] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!);
    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  const fetchOrderStatus = async () => {
    if (!orderId) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL!}/order/${orderId}`);
      setCurrentStatus(res.data.orderStatus);
    } catch (err) {
      console.error(err);
      setCurrentStatus('Order not found');
    }
  };

  const updateOrderStatus = async (status: string) => {
    if (!orderId) return;
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL!}/order/${orderId}/status`, { status });

      // Emit status update via socket
      socket.emit('statusUpdate', { orderId, status });

      setCurrentStatus(status);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" mb={3}>Livreur / Admin Dashboard</Typography>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Order ID"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <Button variant="contained" onClick={fetchOrderStatus}>
          Fetch Status
        </Button>
      </Stack>

      {currentStatus && (
        <Chip label={`Current Status: ${currentStatus}`} color="primary" sx={{ mb: 3 }} />
      )}

      <Stack direction="row" spacing={2}>
        <Button variant="outlined" onClick={() => updateOrderStatus('in_progress')}>
          Mark as Out for Delivery
        </Button>
        <Button variant="outlined" color="success" onClick={() => updateOrderStatus('delivered')}>
          Mark as Delivered
        </Button>
      </Stack>
    </Box>
  );
};

export default DeliveryDashboard;
