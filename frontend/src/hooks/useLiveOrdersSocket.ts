'use client'

import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppDispatch } from '@/store/slices/hooks'
import { fetchLiveOrders } from '@/store/slices/orderSlice'

let socket: Socket | null = null

export default function useLiveOrdersSocket() {
  const dispatch = useAppDispatch(); 

  useEffect(() => {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('[Socket] Connecté ✅');
      dispatch(fetchLiveOrders());
    })

    socket.on('live-orders:update', () => {
      console.log('[Socket] MAJ des commandes reçue');
      dispatch(fetchLiveOrders());
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Déconnecté ❌');
    })

    return () => {
      socket?.disconnect();
    }
  }, [dispatch])
}
