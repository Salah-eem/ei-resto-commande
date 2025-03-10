import React from "react";
import { Stack, Avatar, Typography } from "@mui/material";

const OrderItem: React.FC<{ item: any }> = ({ item }) => {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar src={`http://localhost:3001/${item.image_url}` || "/default-food.png"} sx={{ width: 50, height: 50 }} />
        <Typography>
          {item.name} {item.size ? `(${item.size})` : ""}
        </Typography>
      </Stack>
      <Typography>{item.quantity} x {item.price.toFixed(2)}€</Typography>
    </Stack>
  );
};

export default OrderItem;
