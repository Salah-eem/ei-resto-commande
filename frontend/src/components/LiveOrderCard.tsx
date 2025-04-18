'use client'

import { Order } from '@/types/order'
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
  if (order.items.length === 0) return null

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        boxShadow: 3,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.01)',
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Commande #{order._id.slice(-4)}
          </Typography>
          <OrderTimer startTime={new Date(order.createdAt)} />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List dense>
          {order.items.map((item, index) => {
            const isSelected = index === selectedItemIndex
            return (
              <ListItem
                key={index}
                disableGutters
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  backgroundColor: isSelected ? '#e0f7fa' : 'transparent',
                  border: isSelected ? '2px solid #008f68' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onItemClick(orderIndex, index)}
              >
                <ListItemText
                  primaryTypographyProps={{
                    fontSize: 15,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  primary={`🍽️ ${item.quantity}× ${item.name}`}
                />
              </ListItem>
            )
          })}
        </List>
      </CardContent>
    </Card>
  )
}
