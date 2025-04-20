'use client';
import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { RootState } from '@/store/store';
import { fetchTodayOrders } from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { OrderType, OrderStatus } from '@/types/order';

const ViewOrdersPage = () => {
  const dispatch = useAppDispatch();
  const { orders, loading } = useAppSelector((state: RootState) => state.orders);

  useEffect(() => {
    dispatch(fetchTodayOrders());
  }, [dispatch]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Commandes du Jour
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nom du Client</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Montant Total</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Adresse</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>{order._id.slice(0, 4)}</TableCell>
                  <TableCell>{order.customer?.name || 'N/A'}</TableCell>
                  <TableCell>{order.customer?.phone || 'N/A'}</TableCell>
                  <TableCell>{order.orderStatus}</TableCell>
                  <TableCell>{format(parseISO(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{order.totalAmount.toFixed(2)} €</TableCell>
                  <TableCell>{order.orderType === OrderType.PICKUP ? 'À emporter' : 'Livraison'}</TableCell>
                  <TableCell>{order.deliveryAddress ? order.deliveryAddress.street : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ViewOrdersPage;
