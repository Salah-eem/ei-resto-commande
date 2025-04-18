'use client'

import { useEffect } from 'react'
import { fetchLiveOrders } from '@/store/slices/orderSlice'
import { Box, CircularProgress, Typography, Grid } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LiveOrderList from '@/components/LiveOrderList'
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks'
import { RootState } from '@/store/store'
import useLiveOrdersSocket from '@/hooks/useLiveOrdersSocket'

export default function LiveOrdersPage() {
  const dispatch = useAppDispatch()
  const { orders, loading, error } = useAppSelector((state: RootState) => state.orders)

  useLiveOrdersSocket();
  return (
    <Box p={{ xs: 2, md: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <AccessTimeIcon color="primary" />
        <Typography variant="h4" fontWeight="bold">
          Commandes en cours
        </Typography>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      )}

      {!loading && !error && orders.length === 0 && (
        <Typography variant="body1" color="textSecondary">
          Aucune commande en cours.
        </Typography>
      )}

      {!loading && !error && orders.length > 0 && <LiveOrderList orders={orders} />}
    </Box>
  )
}
