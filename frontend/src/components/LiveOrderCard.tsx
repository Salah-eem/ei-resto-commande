'use client'

import { OrderItem } from '@/types/orderItem'
import OrderTimer from './OrderTimer'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@mui/material'
import { Order, OrderType } from '@/types/order'
import { capitalizeFirstLetter } from '@/utils/functions.utils'

type Props = {
  order: Order
  orderIndex: number
  selectedItemIndex: number 
  onItemClick: (orderIndex: number, itemIndex: number) => void
}

export default function LiveOrderCard({
  order,
  orderIndex,
  selectedItemIndex,
  onItemClick,
}: Props) {
  // 1️⃣ on prépare un tableau [ { item, originalIdx } ]
  const unprepared = order.items
    .map((item, idx) => ({ item, originalIdx: idx, quantity: item.quantity, preparedQuantity: item.preparedQuantity }))
    .filter(({ item }) => !item.isPrepared)

  // 2️⃣ si plus rien à faire, on ne rend rien
  if (unprepared.length === 0) return null

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        boxShadow: 3,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.01)' },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              #{order._id.slice(-4) +" "}
              {order.orderType && (
              <span style={{ color: order.orderType === OrderType.DELIVERY ? '#1976d2' : '#43a047', fontWeight: 'bold' }}>
                {capitalizeFirstLetter(order.orderType)}
              </span>
              )}
            </Typography>
            
            {/* Adresse de livraison si applicable */}
            {order.orderType === OrderType.DELIVERY && order.deliveryAddress && (
              <Typography variant="body2" color="text.primary">
                <span style={{ fontWeight: 'bold' }}>
                  {capitalizeFirstLetter(order.deliveryAddress.street)} {order.deliveryAddress.streetNumber}
                </span>
              </Typography>
            )}

            {/* Source of the order*/}
            {order.source && (
              <Typography variant="body2" color="text.secondary">
                {capitalizeFirstLetter(order.source)}
              </Typography>
            )}
          </Box>
          <OrderTimer 
            startTime={
              order.scheduledFor && new Date(order.scheduledFor) > new Date(order.createdAt)
                ? new Date(order.scheduledFor)
                : new Date(order.createdAt)
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List key={order._id} dense>
          {unprepared.map(({ item, originalIdx }, unpreparedIdx) => {
            // on checke la sélection par rapport à l'index dans la liste des non préparés
            const isSelected = unpreparedIdx === selectedItemIndex
            return (
              <ListItem
                key={item._id}
                disableGutters
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  backgroundColor: isSelected ? '#e0f7fa' : 'transparent',
                  border: isSelected ? '2px solid #008f68' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onItemClick(orderIndex, unpreparedIdx)}
              >
                <ListItemText
                  primaryTypographyProps={{
                    fontSize: 15,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  primary={`${item.quantity - (item.preparedQuantity || 0)}× ${item.size ? `(${item.size}) ` : ''}${capitalizeFirstLetter(item.name)}`}
                />
              </ListItem>
            )
          })}
        </List>
      </CardContent>
    </Card>
  )
}
