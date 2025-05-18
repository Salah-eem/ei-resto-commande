'use client'

import React, { useEffect, useState } from 'react'
import { fetchLiveOrders } from '@/store/slices/orderSlice'
import { Box, CircularProgress, Typography, Grid } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LiveOrderList from '@/components/LiveOrderList'
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks'
import { RootState } from '@/store/store'
import useLiveOrdersSocket from '@/hooks/useLiveOrdersSocket'

import ScheduledOrdersDialog from '@/components/ScheduledOrdersDialog'

export default function LiveOrdersPage() {
  const dispatch = useAppDispatch()
  const { orders, scheduledOrders, loading, error } = useAppSelector((state: RootState) => state.orders)

  useLiveOrdersSocket()

  // Dialog state
  const [scheduledDialogOpen, setScheduledDialogOpen] = React.useState(false)

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

  // Rafraîchir toutes les 30s pour faire apparaître les scheduled qui deviennent live
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const dueScheduled = (scheduledOrders || []).filter(
        o => o.scheduledFor && new Date(o.scheduledFor) <= now
      )
      const liveIds = new Set(orders.map(o => o._id))
      const merged = [...orders, ...dueScheduled.filter(o => !liveIds.has(o._id))]
      setDisplayedOrders(merged)
    }, 30000)
    return () => clearInterval(interval)
  }, [orders, scheduledOrders])

  useEffect(() => {
    const handleF2 = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        setScheduledDialogOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleF2)
    return () => window.removeEventListener('keydown', handleF2)
  }, [])

  useEffect(() => {
    dispatch(fetchLiveOrders())
  }, [dispatch])

  return (
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
      <ScheduledOrdersDialog open={scheduledDialogOpen} onClose={() => setScheduledDialogOpen(false)} />
    </Box>
  )
}
