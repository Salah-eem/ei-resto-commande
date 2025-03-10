import React from "react";
import { Paper, Typography, Stack, Divider, Chip } from "@mui/material";
import OrderItem from "./OrderItem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import EuroIcon from "@mui/icons-material/Euro";

const OrderCard: React.FC<{ order: any }> = ({ order }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight="bold">
          Commande #{order._id.slice(-6).toUpperCase()}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={order.orderStatus.toUpperCase()} color="warning" />
          <Chip label={order.paymentStatus.toUpperCase()} color="success" />
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Passée le {new Date(order.createdAt).toLocaleDateString()} |
        {order.orderType === "pickup" ? <StorefrontIcon sx={{ ml: 1 }} /> : <LocalShippingIcon sx={{ ml: 1 }} />}
        <strong> {order.orderType === "pickup" ? "À emporter" : "Livraison"} </strong>
      </Typography>

      <Divider sx={{ my: 2 }} />

      {order.items.map((item: any) => (
        <OrderItem key={item.productId} item={item} />
      ))}

      <Divider sx={{ my: 2 }} />

      {order.orderType === "delivery" && (
        <Typography variant="body2" color="text.secondary" textAlign="right">
          <EuroIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Frais de livraison : {order.deliveryFee ? `${order.deliveryFee.toFixed(2)}€` : "0.00€"}
        </Typography>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          <AccessTimeIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Estimation : {order.estimatedDelivery} min
        </Typography>
        <Typography variant="h6" fontWeight="bold" textAlign="right">
          <RestaurantMenuIcon sx={{ verticalAlign: "middle", mr: 1 }} />
          Total : {(order.totalAmount + (order.deliveryFee || 0)).toFixed(2)}€
        </Typography>
      </Stack>
    </Paper>
  );
};

export default OrderCard;
