'use client'

import React, { useEffect, useState } from 'react'
import { fetchLiveOrders } from '@/store/slices/orderSlice'
import { Box, CircularProgress, Typography, Grid } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LiveOrderList from '@/components/LiveOrderList'
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks'
import { RootState } from '@/store/store'
import useLiveOrdersSocket from '@/hooks/useLiveOrdersSocket'

import OrdersDialog from '@/components/OrdersDialog'
import { OrderStatus } from '@/types/order'
import ProtectRoute from '@/components/ProtectRoute'
import { Role } from '@/types/user'

export default function LiveOrdersPage() {
  const dispatch = useAppDispatch()
  const { orders, loading, error } = useAppSelector((state: RootState) => state.orders)
  const { preparedOrders, loading: loadingPrepared, error: errorPrepared } = useAppSelector((state: RootState) => state.orders);
  const { scheduledOrders, loading: loadingScheduled, error: errorScheduled } = useAppSelector((state: RootState) => state.orders);

  useLiveOrdersSocket()

  // Dialog state
  const [ordersDialogOpen, setOrdersDialogOpen] = React.useState(false)
  const [ordersDialogType, setOrdersDialogType] = React.useState<'prepared' | 'scheduled'>('scheduled')

  // Combine live orders and scheduled orders that are due
  const [displayedOrders, setDisplayedOrders] = useState(orders)

  useEffect(() => {
    // Fonction pour filtrer les scheduledOrders à afficher
    const now = new Date()
    const dueScheduled = (scheduledOrders || []).filter(
      o => o.scheduledFor && new Date(o.scheduledFor) <= now
    )
    // On évite les doublons (si une commande est déjà dans orders)
    const liveIds = new Set(orders.map(o => o._id))
    const merged = [...orders, ...dueScheduled.filter(o => !liveIds.has(o._id))]
    setDisplayedOrders(merged)
  }, [orders, scheduledOrders])

  // Rafraîchir toutes les 10s pour faire apparaître les scheduled qui deviennent live
  useEffect(() => {
    const updateDisplayedOrders = () => {
      const now = new Date();
      const dueScheduled = (scheduledOrders || []).filter(
        o => o.scheduledFor && new Date(o.scheduledFor) <= now
      );
      const liveIds = new Set(orders.map(o => o._id));
      const merged = [...orders, ...dueScheduled.filter(o => !liveIds.has(o._id))];
      setDisplayedOrders(merged);
    };
    updateDisplayedOrders(); // Appel immédiat pour éviter le délai initial
    const interval = setInterval(updateDisplayedOrders, 10000);
    return () => clearInterval(interval);
  }, [orders, scheduledOrders]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setOrdersDialogType('scheduled');
        setOrdersDialogOpen(prev => !prev)
      }
      if (e.key === 'F3') {
        e.preventDefault();
        setOrdersDialogType('prepared');
        setOrdersDialogOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    dispatch(fetchLiveOrders())
  }, [dispatch])

  useEffect(() => {
    if (!ordersDialogOpen || ordersDialogType !== 'scheduled') return;

    // Liste des IDs des commandes live
    const liveIds = new Set(orders.map(o => o._id));

    const wasAnyScheduledNowLive = scheduledOrders.some(
      o => o.orderStatus === OrderStatus.SCHEDULED && liveIds.has(o._id)
    );
    if (wasAnyScheduledNowLive) {
      setOrdersDialogOpen(false);
    }
  }, [orders, scheduledOrders, ordersDialogOpen, ordersDialogType]);


  return (
    <ProtectRoute allowedRoles={[Role.Employee, Role.Admin]}>
      <Box minHeight="100vh" sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', py: { xs: 2, md: 6 } }}>
        <Box maxWidth="md" mx="auto">
          {error && (
            <Typography color="error" variant="h6" textAlign="center" mb={2}>
              {error}
            </Typography>
          )}

          {displayedOrders.length === 0 && !loading && !error && (
            <Typography variant="body1" color="textSecondary" textAlign="center">
              No live orders.
            </Typography>
          )}

          {displayedOrders.length > 0 && (
            <Box position="relative" boxShadow={4} borderRadius={3} bgcolor="#fff" p={{ xs: 1, md: 3 }}>
              <LiveOrderList orders={displayedOrders} />
              {loading && (
                <Box position="absolute" top={0} left={0} width="100%" height="100%" display="flex" justifyContent="center" alignItems="center" bgcolor="rgba(255,255,255,0.5)" zIndex={2}>
                  <CircularProgress />
                </Box>
              )}
            </Box>
          )}
        </Box>
        <OrdersDialog
          open={ordersDialogOpen}
          onClose={() => setOrdersDialogOpen(false)}
          type={ordersDialogType}
          orders={
            ordersDialogType === 'prepared'
              ? preparedOrders
              : (scheduledOrders || [])
                  .filter(o => o.orderStatus === OrderStatus.SCHEDULED)
                  .filter(o => !orders.some(live => live._id === o._id)) // <- exclusion ici
                  .filter(o => o.orderStatus === OrderStatus.SCHEDULED && new Date(o.scheduledFor || '') > new Date())
          }
          loading={ordersDialogType === 'prepared' ? loadingPrepared : loadingScheduled}
          error={ordersDialogType === 'prepared' ? errorPrepared : errorScheduled}
          title={ordersDialogType === 'prepared' ? 'Prepared orders' : 'Scheduled orders'}
        />
      </Box>
    </ProtectRoute>
  )
}
