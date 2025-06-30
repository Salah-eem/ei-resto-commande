import React from "react";
import { Paper, Typography, Stack, Divider, Chip, Button, Box } from "@mui/material";
import OrderItem from "./OrderItem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import EuroIcon from "@mui/icons-material/Euro";
import Link from "next/link";
import { Order, OrderStatus, PaymentStatus } from "@/types/order";

const OrderCard: React.FC<{ order: Order, deliveryFee: number }> = ({ order, deliveryFee }) => {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        transition: "0.3s",
        "&:hover": { boxShadow: 6 },
        display: "flex",
        flexDirection: "column",
        height: "100%", // prend tout l'espace dispo du Grid
        minHeight: 400, // Hauteur fixe
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          Order #{order._id.slice(-6).toUpperCase()}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={order.orderStatus.toUpperCase()} color="primary" />
          {order.paymentStatus === PaymentStatus.COMPLETED ? 
            <Chip label="Payed" color="info" size="small"/> : 
            <Chip label="Not Payed" color="warning" size="small"/>}
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={1}>
        Passed {new Date(order.createdAt).toLocaleDateString()} |
        {order.orderType === "pickup" ? <StorefrontIcon sx={{ ml: 1, verticalAlign: "middle" }} /> : <LocalShippingIcon sx={{ ml: 1, verticalAlign: "middle" }} />}
        <strong> {order.orderType === "pickup" ? "Pickup" : "Delivery"} </strong>
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Zone scrollable pour les items */}
      <Box sx={{ maxHeight: 150, overflowY: "auto", pr: 1 }}>
        {order.items.map((item: any) => (
          <OrderItem key={item._id} item={item} />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {order.orderType === "delivery" && (
        <Typography variant="body2" color="text.secondary" textAlign="right" mb={1}>
          <EuroIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Delivery Fee : {`${deliveryFee.toFixed(2)}€` || "0.00€"}
        </Typography>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt="auto">
        <Typography variant="h6" fontWeight="bold" textAlign="right">
          <RestaurantMenuIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Total : {order.totalAmount.toFixed(2)}€
        </Typography>
      </Stack>

      {order.orderStatus !== OrderStatus.DELIVERED && order.orderStatus !== OrderStatus.CANCELED && (
        <Box mt={2}>
          <Link href={`/order-tracking/${order._id}`} passHref>
            <Button variant="outlined" fullWidth>
              Track Order
            </Button>
          </Link>
        </Box>
      )}
    </Paper>
  );
};

export default OrderCard;
