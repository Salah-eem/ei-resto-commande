'use client'

import { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/types/order'
import LiveOrderCard from './LiveOrderCard'
import { Grid } from '@mui/material'
import { useAppDispatch } from '@/store/slices/hooks';
import { updateOrderStatus, validateOrderItem } from '@/store/slices/orderSlice';

type Props = {
  orders: Order[]
}

// On gère la sélection comme un index dans la liste des non préparés
export default function LiveOrderList({ orders }: Props) {
  // Plus de state local pour la liste des commandes !
  // Sélection = { orderIndex, unpreparedIndex }
  const [selected, setSelected] = useState({ orderIndex: 0, unpreparedIndex: 0 })
  const dispatch = useAppDispatch();

  // Helper pour obtenir la liste des non préparés d'une commande
  const getUnprepared = (order: Order) => order.items.filter((i: any) => !i.isPrepared);

  const moveSelection = (direction: 'up' | 'down') => {
    let { orderIndex, unpreparedIndex } = selected;
    const unprepared = getUnprepared(orders[orderIndex]);
    if (direction === 'down') {
      if (unpreparedIndex < unprepared.length - 1) {
        setSelected({ orderIndex, unpreparedIndex: unpreparedIndex + 1 });
      } else if (orderIndex < orders.length - 1) {
        const nextUnprepared = getUnprepared(orders[orderIndex + 1]);
        setSelected({ orderIndex: orderIndex + 1, unpreparedIndex: nextUnprepared.length > 0 ? 0 : -1 });
      }
    } else if (direction === 'up') {
      if (unpreparedIndex > 0) {
        setSelected({ orderIndex, unpreparedIndex: unpreparedIndex - 1 });
      } else if (orderIndex > 0) {
        const prevUnprepared = getUnprepared(orders[orderIndex - 1]);
        setSelected({ orderIndex: orderIndex - 1, unpreparedIndex: prevUnprepared.length - 1 });
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        moveSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        moveSelection('up');
        return;
      }
      if (e.key === 'Enter') {
        const { orderIndex, unpreparedIndex } = selected;
        const order = orders[orderIndex];
        if (!order) return;
        const unprepared = getUnprepared(order);
        const item = unprepared[unpreparedIndex];
        if (!item) return;
        dispatch(validateOrderItem({
          orderId: order._id,
          itemId: item._id!
        }));
        // La sélection sera recalculée dans le useEffect suivant
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selected, orders, moveSelection]);

  // Vérifie la validité de la sélection à chaque changement de orders
  useEffect(() => {
    const { orderIndex, unpreparedIndex } = selected;
    // Si la commande sélectionnée n'existe plus
    if (!orders[orderIndex]) {
      // Sélectionner la première commande avec un item non préparé
      const firstOrderIdx = orders.findIndex(order => getUnprepared(order).length > 0);
      if (firstOrderIdx !== -1) {
        setSelected({ orderIndex: firstOrderIdx, unpreparedIndex: 0 });
      } else {
        setSelected({ orderIndex: 0, unpreparedIndex: 0 });
      }
      return;
    }
    // Si l'item sélectionné n'existe plus
    const unprepared = getUnprepared(orders[orderIndex]);
    if (unpreparedIndex >= unprepared.length) {
      if (unprepared.length > 0) {
        setSelected({ orderIndex, unpreparedIndex: 0 });
      } else {
        // Chercher la prochaine commande avec un item non préparé
        const nextOrderIdx = orders.findIndex((order, idx) => idx > orderIndex && getUnprepared(order).length > 0);
        if (nextOrderIdx !== -1) {
          setSelected({ orderIndex: nextOrderIdx, unpreparedIndex: 0 });
        } else {
          setSelected({ orderIndex: 0, unpreparedIndex: 0 });
        }
      }
    }
  }, [orders]);

  const handleItemClick = (orderIndex: number, unpreparedIndex: number) => {
    setSelected({ orderIndex, unpreparedIndex });
  };

  return (
    <Grid container spacing={3}>
      {orders.map((order, index) => {
        const unprepared = getUnprepared(order);
        return (
          <Grid item xs={12} key={order._id}>
            <LiveOrderCard
              order={order}
              orderIndex={index}
              selectedItemIndex={selected.orderIndex === index ? selected.unpreparedIndex : -1}
              onItemClick={handleItemClick}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}
