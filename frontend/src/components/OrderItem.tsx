import React from "react";
import { Stack, Avatar, Typography } from "@mui/material";

const OrderItem: React.FC<{ item: any }> = ({ item }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Avatar src={`${API_URL}/${item.image_url}` || "/default-food.png"} sx={{ width: 50, height: 50 }} />
        <Typography>
          {item.name} {item.size ? `(${item.size})` : ""}
        </Typography>
      </Stack>
      <Typography>{item.quantity} x {item.price.toFixed(2)}€</Typography>
    </Stack>
  );
};

export default OrderItem;
