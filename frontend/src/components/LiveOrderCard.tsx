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
  // 1) Construire la liste des items non préparés
  const unprepared = order.items
    .map((item, idx) => ({
      item,
      originalIdx: idx,
      quantity: item.quantity,
      preparedQuantity: item.preparedQuantity,
    }))
    .filter(({ item }) => !item.isPrepared)

  // 2) S’il n’y a plus rien à préparer, ne rien rendre
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
              #{order._id.slice(-4)}{' '}
              {order.orderType && (
                <span
                  style={{
                    color:
                      order.orderType === OrderType.DELIVERY
                        ? '#1976d2'
                        : '#43a047',
                    fontWeight: 'bold',
                  }}
                >
                  {capitalizeFirstLetter(order.orderType)}
                </span>
              )}
            </Typography>

            {/* Adresse de livraison si applicable */}
            {order.orderType === OrderType.DELIVERY && order.deliveryAddress && (
              <Typography variant="body2" color="text.primary">
                <span style={{ fontWeight: 'bold' }}>
                  {capitalizeFirstLetter(order.deliveryAddress.street)}{' '}
                  {order.deliveryAddress.streetNumber}
                </span>
              </Typography>
            )}

            {/* Source de la commande */}
            {order.source && (
              <Typography variant="body2" color="text.secondary">
                {capitalizeFirstLetter(order.source)}
              </Typography>
            )}
          </Box>
          <OrderTimer
            startTime={
              order.scheduledFor &&
              new Date(order.scheduledFor) > new Date(order.createdAt)
                ? new Date(order.scheduledFor)
                : new Date(order.createdAt)
            }
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <List key={order._id} dense>
          {unprepared.map(({ item, originalIdx }, unpreparedIdx) => {
            // Déterminer si cet item est “sélectionné”
            const isSelected = unpreparedIdx === selectedItemIndex

            // Récupérer les arrays côté backend
            const baseIngredients = item.baseIngredients || []
            const customIngredients = item.ingredients || []

            // 1) Bases supprimées = celles qui ne figurent plus dans customIngredients
            const removedBases = baseIngredients.filter((b) => {
              return !customIngredients.some((ci) => ci._id === b._id)
            })

            // 2) Bases “en extra” = si quantity > 1
            const extraBases = baseIngredients
              .map((b: any) => {
                const found = customIngredients.find((ci) => ci._id === b._id)
                if (found && found.quantity > 1) {
                  // On affiche juste le nom, éventuellement double
                  const label =
                    found.quantity === 2
                      ? `double ${b.name}`
                      : `${b.name} x${found.quantity}`
                  return label
                }
                return null
              })
              .filter((x) => x !== null) as string[]

            // 3) Vrais extras = dans customIngredients mais pas dans baseIngredients
            const trulyExtraIngredients = customIngredients
              .filter((ci) => {
                return !baseIngredients.some((b) => b._id === ci._id)
              })
              .map((ci: any) => {
                if (ci.quantity === 1) {
                  // quantité = 1  → “extra {nom}”
                  return `extra ${ci.name}`
                } else if (ci.quantity === 2) {
                  // quantité = 2 → “double {nom}”
                  return `double ${ci.name}`
                } else {
                  // quantité > 2 → “{nom} x{quantité}”
                  return `${ci.name} x${ci.quantity}`
                }
              })

            // Combiner tous les extras dans une même liste de chaînes
            const allExtras = [...extraBases, ...trulyExtraIngredients]

            // Construire la chaîne «With X and Y»
            let extrasString = ''
            if (allExtras.length > 0) {
              if (allExtras.length === 1) {
                extrasString = `With ${allExtras[0]}`
              } else if (allExtras.length === 2) {
                extrasString = `With ${allExtras[0]} and ${allExtras[1]}`
              } else {
                // 3 ou plus : «A, B, and C»
                const last = allExtras.pop()
                extrasString = `With ${allExtras.join(', ')} and ${last}`
              }
            }

            // Construire les suppressions sous forme d’un tableau de spans individuels
            const removalSpans = removedBases.map((b: any) => (
              <span
                key={`rem-${b._id}`}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  fontWeight: 'bold',
                  marginLeft: 4,
                  padding: '2px 4px',
                  borderRadius: 4,
                }}
              >
                No {b.name}
              </span>
            ))

            // Déterminer s’il y a au moins une modification
            const hasAnyChanges =
              removedBases.length > 0 || allExtras.length > 0

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
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
                onClick={() => onItemClick(orderIndex, unpreparedIdx)}
              >
                <Box width="100%" display="flex" justifyContent="space-between">
                  <ListItemText
                    primaryTypographyProps={{
                      fontSize: 15,
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                    primary={
                      <Box component="span">
                        {`${item.quantity - (item.preparedQuantity || 0)}× ${
                          item.size ? `(${item.size}) ` : ''
                        }${capitalizeFirstLetter(item.name)}`}

                        {/* Si des suppressions, on les affiche après le nom */}
                        {hasAnyChanges && removalSpans}

                        {/* Si des extras, on affiche la chaîne unique */}
                        {extrasString && (
                          <span
                            style={{
                              backgroundColor: 'lightgreen',
                              color: 'black',
                              fontWeight: 'bold',
                              marginLeft: 4,
                              padding: '2px 4px',
                              borderRadius: 4,
                            }}
                          >
                            {extrasString}
                          </span>
                        )}
                      </Box>
                    }
                  />
                </Box>
              </ListItem>
            )
          })}
        </List>
      </CardContent>
    </Card>
  )
}
