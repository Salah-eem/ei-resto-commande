"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { Box, Typography, Button, Stack, Alert, CircularProgress } from '@mui/material';
import ProtectRoute from '@/components/ProtectRoute';
import { Role } from '@/types/user';

const statuses = [
  'in preparation',
  'ready for pickup',
  'ready for delivery',
  'picked up',
  'out for delivery',
  'delivered',
  'canceled'
];

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/order/${orderId}`);
        setOrder(res.data);
      } catch (err) {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const updateStatus = async (newStatus: string) => {
    try {
      setUpdating(true);
      await axios.put(`http://localhost:3001/order/${orderId}/status`, { orderStatus: newStatus });
      setOrder({ ...order, orderStatus: newStatus });
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center"><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <ProtectRoute allowedRoles={[Role.Employee, Role.Admin]}>
      <Box p={4}>
        <Typography variant="h5" mb={2}>Order Status Management</Typography>
        <Typography variant="subtitle1" mb={1}>Order ID: {order._id}</Typography>
        <Typography variant="body1" mb={3}>Current Status: <strong>{order.orderStatus}</strong></Typography>

        <Stack spacing={2} direction="row" flexWrap="wrap">
          {statuses.map((status) => (
            <Button
              key={status}
              variant={status === order.orderStatus ? 'contained' : 'outlined'}
              color="primary"
              disabled={updating}
              onClick={() => updateStatus(status)}
            >
              {status.toUpperCase()}
            </Button>
          ))}
        </Stack>

        {updating && <Typography mt={2}>Updating status...</Typography>}
      </Box>
    </ProtectRoute>
  );
};

export default OrderStatusPage;
