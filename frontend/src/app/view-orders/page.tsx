'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import { format, isSameDay, parseISO } from 'date-fns';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { Role } from '@/types/user';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import OrderDialog from '@/components/OrderDialog';

interface Order {
  _id: string;
  customerName: string;
  status: string;
  createdAt: string;
  totalPrice: number;
  items?: {
    name: string;
    quantity: number;
    price: number;
  }[];
}

const ViewOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const userProfile = useSelector((state: RootState) => state.user.profile);
  const today = new Date();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      // Remplace par un appel API réel
      const mockData: Order[] = [
        {
          _id: '1',
          customerName: 'Ali',
          status: 'Pending',
          createdAt: new Date().toISOString(),
          totalPrice: 45.5,
          items: [
            { name: 'Pizza Margherita', quantity: 2, price: 10 },
            { name: 'Boisson', quantity: 1, price: 5.5 },
          ],
        },
        {
          _id: '2',
          customerName: 'Fatima',
          status: 'Delivered',
          createdAt: new Date('2024-12-25T10:00:00Z').toISOString(),
          totalPrice: 30,
          items: [{ name: 'Sandwich', quantity: 2, price: 15 }],
        },
      ];

      const todayOrders = mockData.filter((order) =>
        isSameDay(parseISO(order.createdAt), today)
      );

      setOrders(todayOrders);
      setLoading(false);
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Preparing':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        <ListAltIcon sx={{ mr: 1 }} />
        Commandes du jour
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} md={6} lg={4} key={order._id}>
              <Paper
                elevation={3}
                sx={{ p: 2, cursor: 'pointer' }}
                onClick={() => setSelectedOrder(order)}
              >
                <Typography variant="h6">{order.customerName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Commandé le {format(parseISO(order.createdAt), 'dd/MM/yyyy à HH:mm')}
                </Typography>
                <Chip label={order.status} color={getStatusColor(order.status)} sx={{ mt: 1 }} />
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Total : {order.totalPrice.toFixed(2)} €
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {selectedOrder && (
        <OrderDialog
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
        //   editable={userProfile?.role === Role.Admin || userProfile?.role === Role.Employee}
           editable={true}
        />
      )}
    </Box>
  );
};

export default ViewOrdersPage;
