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
    <Box minHeight="100vh" sx={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', py: { xs: 2, md: 6 } }}>
      <Box maxWidth="md" mx="auto">
        {error && (
          <Typography color="error" variant="h6" textAlign="center" mb={2}>
            {error}
          </Typography>
        )}

        {orders.length === 0 && !loading && !error && (
          <Typography variant="body1" color="textSecondary" textAlign="center">
            No live orders.
          </Typography>
        )}

        {orders.length > 0 && (
          <Box position="relative" boxShadow={4} borderRadius={3} bgcolor="#fff" p={{ xs: 1, md: 3 }}>
            <LiveOrderList orders={orders} />
            {loading && (
              <Box position="absolute" top={0} left={0} width="100%" height="100%" display="flex" justifyContent="center" alignItems="center" bgcolor="rgba(255,255,255,0.5)" zIndex={2}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
