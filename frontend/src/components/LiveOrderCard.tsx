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

type Props = {
  order: { 
    _id: string
    createdAt: string
    items: OrderItem[]
  }
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
          <Typography variant="h6" fontWeight="bold">
            order #{order._id.slice(-4)}
          </Typography>
          <OrderTimer startTime={new Date(order.createdAt)} />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List dense>
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
                  primary={`🍽️ ${item.quantity - (item.preparedQuantity || 0)}× ${item.name}`}
                />
              </ListItem>
            )
          })}
        </List>
      </CardContent>
    </Card>
  )
}
