import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Button, CircularProgress,
  Typography, Box, Divider, Paper, Stack
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { fetchScheduledOrders } from '@/store/slices/orderSlice';
import { RootState } from '@/store/store';
import { capitalizeFirstLetter } from '@/utils/functions.utils';

interface ScheduledOrdersDialogProps {
  open: boolean;
  onClose: () => void;
}

const ScheduledOrdersDialog: React.FC<ScheduledOrdersDialogProps> = ({ open, onClose }) => {
  const dispatch = useAppDispatch();
  const { scheduledOrders, loading, error } = useAppSelector((state: RootState) => state.orders);

  useEffect(() => {
    if (open) {
      dispatch(fetchScheduledOrders());
    }
  }, [open, dispatch]);

  const now = new Date();
  const upcomingOrders = scheduledOrders.filter(
    o => o.scheduledFor && new Date(o.scheduledFor) >= now
  );

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
          <span>Scheduled orders for Today, {now.toLocaleDateString()}</span>
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
        ) : upcomingOrders.length === 0 ? (
          <Typography textAlign="center" color="text.secondary" fontStyle="italic">
            No scheduled orders for today.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {upcomingOrders.map(order => (
              <Paper key={order._id} elevation={3} sx={{
                background: 'linear-gradient(90deg, #f8fafc 0%, #e0eafc 100%)',
                p: 2.5,
                borderRadius: 3,
                boxShadow: '0 2px 12px 0 rgba(44,62,80,0.07)',
                border: '1px solid #e3eafc',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: '0 4px 24px 0 rgba(44,62,80,0.13)' }
              }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="h6" fontWeight="bold" color="#1976d2">
                    {formatTime(order.scheduledFor)} {capitalizeFirstLetter(order.orderType)}
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
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#1976d2', mr: 1 }} />
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

export default ScheduledOrdersDialog;
