import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, CircularProgress,
  Typography, Box, Divider, Paper, Stack
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { RootState } from '@/store/store';
import { capitalizeFirstLetter } from '@/utils/functions.utils';
import { fetchPreparedOrders, fetchScheduledOrders } from '@/store/slices/orderSlice';
import { Order, OrderStatus } from '@/types/order';

interface OrdersDialogProps {
  open: boolean;
  onClose: () => void;
  type: string;
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  title?: string;
}

const OrdersDialog: React.FC<OrdersDialogProps> = ({ open, onClose, type, orders, loading = false, error = null, title = 'Prepared orders' }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (open) {
      if (type === 'prepared') {
        dispatch(fetchPreparedOrders());
      } else if (type === 'scheduled') {
        dispatch(fetchScheduledOrders());
      }
    }
  }, [open, dispatch]);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  // Keyboard navigation
  useEffect(() => {
    if (!open || !orders.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      let nextIndex = selectedIndex;
      if (e.key === 'ArrowDown') {
        nextIndex = selectedIndex < orders.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(nextIndex);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        nextIndex = selectedIndex > 0 ? selectedIndex - 1 : orders.length - 1;
        setSelectedIndex(nextIndex);
        e.preventDefault();
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        // Action sur la commande sélectionnée (ex: ouvrir un détail, à implémenter si besoin)
      }
      // Scroll automatique sur la sélection
      setTimeout(() => {
        const el = document.getElementById(`order-item-${nextIndex}`);
        if (el) {
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, orders, selectedIndex]);

  // Reset selection when dialog opens/closes or list changes
  useEffect(() => {
    if (open) setSelectedIndex(orders.length ? 0 : -1);
    else setSelectedIndex(-1);
  }, [open, orders]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{
      sx: {
        borderRadius: 4,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        boxShadow: 8,
      }
    }}>
      <DialogTitle sx={{
        fontWeight: 'bold',
        fontSize: 24,
        color: '#263238',
        letterSpacing: 1,
        background: 'linear-gradient(90deg, #e0eafc 0%, #cfdef3 100%)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        pb: 2,
        pr: 7
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <span>{title}</span>
          <Button
            onClick={onClose}
            sx={{ minWidth: 0, p: 1, color: '#607d8b', '&:hover': { color: '#d32f2f', background: 'transparent' } }}
          >
            <span style={{ fontSize: 28, fontWeight: 'bold', lineHeight: 1 }}>&times;</span>
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress size={40} thickness={4} sx={{ color: '#607d8b' }} />
          </Box>
        ) : error ? (
          <Typography color="error" textAlign="center">{error}</Typography>
        ) : orders.length === 0 ? (
          <Typography textAlign="center" color="text.secondary" fontStyle="italic">
            No orders.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {orders.map((order, idx) => (
              <Paper
                key={order._id}
                id={`order-item-${idx}`}
                elevation={3}
                sx={{
                  background: selectedIndex === idx
                    ? 'linear-gradient(90deg, #d0f5e8 0%, #b2ebf2 100%)'
                    : 'linear-gradient(90deg, #f8fafc 0%, #e0eafc 100%)',
                  p: 2.5,
                  borderRadius: 3,
                  boxShadow: selectedIndex === idx
                    ? '0 4px 24px 0 rgba(44,62,80,0.18)'
                    : '0 2px 12px 0 rgba(44,62,80,0.07)',
                  border: selectedIndex === idx ? '2px solid #26a69a' : '1px solid #e3eafc',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0 4px 24px 0 rgba(44,62,80,0.13)',
                    border: '2px solid #26a69a',
                  },
                }}
                onClick={() => setSelectedIndex(idx)}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight="bold" color="#388e3c">
                    {formatTime(order.scheduledFor || order.createdAt)} {capitalizeFirstLetter(order.orderType)}
                  </Typography>
                  <Typography variant="subtitle2" color="#607d8b" fontWeight="bold">
                    #{order._id.slice(-4)}
                  </Typography>
                </Box>
                {order.deliveryAddress && (
                  <Typography variant="body2" color="#607d8b" mb={1}>
                    {capitalizeFirstLetter(order.deliveryAddress.street)} {order.deliveryAddress.streetNumber}
                  </Typography>
                )}
                <Divider sx={{ my: 1.2 }} />
                <Stack spacing={0.5} ml={0.5}>
                  {order.items.map((item, index) => (
                    <Box key={index} display="flex" alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#388e3c', mr: 1 }} />
                      <Typography variant="body2" color="#263238">
                        <b>{item.quantity}</b> {item.size ? <span style={{ color: '#607d8b' }}>({item.size})</span> : null} {capitalizeFirstLetter(item.name)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrdersDialog;
