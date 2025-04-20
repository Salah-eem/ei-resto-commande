'use client'

import { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/types/order'
import LiveOrderCard from './LiveOrderCard'
import { Grid } from '@mui/material'
import { useAppDispatch } from '@/store/slices/hooks';
import { updateOrderStatus } from '@/store/slices/orderSlice';

type Props = {
  orders: Order[]
}

export default function LiveOrderList({ orders }: Props) {
  const [ordersState, setOrdersState] = useState(
    orders.map((order) => ({ ...order, items: [...order.items] }))
  )

  const [selected, setSelected] = useState({ orderIndex: 0, itemIndex: 0 })
  const dispatch = useAppDispatch();

  const moveSelection = (direction: 'up' | 'down') => {
    let { orderIndex, itemIndex } = selected
    if (direction === 'down') {
      if (itemIndex < ordersState[orderIndex].items.length - 1) {
        setSelected({ orderIndex, itemIndex: itemIndex + 1 })
      } else {
        // aller à la commande suivante si elle existe
        if (orderIndex < ordersState.length - 1) {
          setSelected({ orderIndex: orderIndex + 1, itemIndex: 0 })
        }
      }
    } else if (direction === 'up') {
      if (itemIndex > 0) {
        setSelected({ orderIndex, itemIndex: itemIndex - 1 })
      } else {
        // aller à la commande précédente si elle existe
        if (orderIndex > 0) {
          const prevItems = ordersState[orderIndex - 1].items.length
          setSelected({ orderIndex: orderIndex - 1, itemIndex: prevItems - 1 })
        }
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') moveSelection('down')
      if (e.key === 'ArrowUp') moveSelection('up')

      if (e.key === 'Enter') {
        setOrdersState((prev) => {
          const updated = [...prev]
          const { orderIndex, itemIndex } = selected

          if (!updated[orderIndex]) return prev

          const newItems = [...updated[orderIndex].items]
          newItems.splice(itemIndex, 1)

          if (newItems.length === 0) {
            // Dispatch Redux action to update order status
            dispatch(updateOrderStatus({ orderId: updated[orderIndex]._id, status: OrderStatus.PREPARED }));

            updated.splice(orderIndex, 1)
            // reset sélection
            return updated.length > 0
              ? (setSelected({ orderIndex: 0, itemIndex: 0 }), updated)
              : []
          } else {
            updated[orderIndex].items = newItems
            // ajuster l'index si besoin
            const newItemIndex = Math.min(itemIndex, newItems.length - 1)
            setSelected({ orderIndex, itemIndex: newItemIndex })
            return updated
          }
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, ordersState])

  const handleItemClick = (orderIndex: number, itemIndex: number) => {
    setSelected({ orderIndex, itemIndex })
  }

  return (
    <Grid container spacing={3}>
      {ordersState.map((order, index) => (
        <Grid item xs={12} key={order._id}>
          <LiveOrderCard
            order={order}
            orderIndex={index}
            selectedItemIndex={selected.orderIndex === index ? selected.itemIndex : -1}
            onItemClick={handleItemClick}
          />
        </Grid>
      ))}
    </Grid>
  )
}
