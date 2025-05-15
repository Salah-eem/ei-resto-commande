'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { RootState } from '@/store/store';
import { fetchTodayOrders } from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { Order, OrderStatus, OrderType, PaymentStatus } from '@/types/order';
import { useRouter } from 'next/navigation';

type OrderKey = keyof Pick<Order, 'orderStatus' | 'totalAmount' | 'orderType' | 'createdAt'> | 'customer.name' | 'customer.phone';

const ViewOrdersPage = () => {
  const dispatch = useAppDispatch();
  const { orders, loading } = useAppSelector((state: RootState) => state.orders);

  const [orderBy, setOrderBy] = useState<OrderKey>('createdAt');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    dispatch(fetchTodayOrders());
  }, [dispatch]);

  const handleSort = (property: OrderKey) => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderBy(property);
    setOrderDirection(isAsc ? 'desc' : 'asc');
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.CONFIRMED:
      case OrderStatus.IN_PREPARATION:
        return 'warning';
      case OrderStatus.DELIVERED:
      case OrderStatus.PREPARED:
        return 'success';
      case OrderStatus.CANCELED:
        return 'error';
      default:
        return 'default';
    }
  };

  const getShortId = (id: string) => id?.slice(-5)?.toUpperCase();

  // 🔍 Recherche filtrée sur ID, nom, téléphone, adresse
  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    const id = order._id?.toLowerCase() || '';
    const name = order.customer?.name?.toLowerCase() || '';
    const phone = order.customer?.phone || '';
    const address = `${order.deliveryAddress?.street || ''} ${order.deliveryAddress?.city || ''} ${order.deliveryAddress?.postalCode || ''}`.toLowerCase();
    const totalAmount = order.totalAmount.toString();

    return (
      id.includes(query) ||
      name.includes(query) ||
      phone.includes(query) ||
      address.includes(query) ||
      totalAmount.includes(query)
    );
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let valA: any;
    let valB: any;

    switch (orderBy) {
      case 'customer.name':
        valA = a.customer?.name || '';
        valB = b.customer?.name || '';
        break;
      case 'customer.phone':
        valA = a.customer?.phone || '';
        valB = b.customer?.phone || '';
        break;
      case 'orderStatus':
        valA = a.orderStatus;
        valB = b.orderStatus;
        break;
      case 'orderType':
        valA = a.orderType;
        valB = b.orderType;
        break;
      case 'totalAmount':
        valA = a.totalAmount;
        valB = b.totalAmount;
        break;
      case 'createdAt':
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
      default:
        valA = '';
        valB = '';
    }

    if (valA < valB) return orderDirection === 'asc' ? -1 : 1;
    if (valA > valB) return orderDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Today's Orders
      </Typography>

      <TextField
        label="Search by ID, name, phone, address or total amount"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        variant="outlined"
        fullWidth
        sx={{ my: 2 }}
      />

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : sortedOrders.length === 0 ? (
        <Typography sx={{ mt: 4 }}>No matching orders found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'customer.name'}
                    direction={orderBy === 'customer.name' ? orderDirection : 'asc'}
                    onClick={() => handleSort('customer.name')}
                  >
                    Client
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'customer.phone'}
                    direction={orderBy === 'customer.phone' ? orderDirection : 'asc'}
                    onClick={() => handleSort('customer.phone')}
                  >
                    Phone
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'orderStatus'}
                    direction={orderBy === 'orderStatus' ? orderDirection : 'asc'}
                    onClick={() => handleSort('orderStatus')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'totalAmount'}
                    direction={orderBy === 'totalAmount' ? orderDirection : 'asc'}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'orderType'}
                    direction={orderBy === 'orderType' ? orderDirection : 'asc'}
                    onClick={() => handleSort('orderType')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Taked By</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'createdAt'}
                    direction={orderBy === 'createdAt' ? orderDirection : 'asc'}
                    onClick={() => handleSort('createdAt')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.map((order: Order) => (
                <TableRow
                  key={order._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/take-order/${order._id}`)}
                >
                  <TableCell>{getShortId(order._id)}</TableCell>
                  <TableCell>{order.customer?.name || '—'}</TableCell>
                  <TableCell>{order.customer?.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip label={order.orderStatus} color={getStatusColor(order.orderStatus)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={order.paymentStatus} color={order.paymentStatus === PaymentStatus.COMPLETED ? 'success' : 'error'} size="small" />
                  </TableCell>
                  <TableCell>{order.totalAmount.toFixed(2)} €</TableCell>
                  <TableCell>{order.orderType === OrderType.PICKUP ? 'Pickup' : 'Delivery'}</TableCell>
                  <TableCell>
                    {order.deliveryAddress
                      ? `${order.deliveryAddress.street || ''} ${order.deliveryAddress.streetNumber || ''}, ${order.deliveryAddress.city || ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>{order.source}</TableCell>
                  <TableCell>{format(parseISO(order.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
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
