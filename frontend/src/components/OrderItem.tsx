import React from "react";
import { Stack, Avatar, Typography, Box } from "@mui/material";

const OrderItem: React.FC<{ item: any }> = ({ item }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            src={`${API_URL}/${item.image_url}` || "/default-food.png"}
            sx={{ width: 50, height: 50, borderRadius: 2 }}
            variant="rounded"
          />
          <Box>
            <Typography fontWeight="bold">{item.name}</Typography>
            {item.size && (
              <Typography variant="caption" color="text.secondary">
                Taille: {item.size}
              </Typography>
            )}
          </Box>
        </Stack>

        <Typography>
          {item.quantity} x {item.price.toFixed(2)}€
        </Typography>
      </Stack>
    </Box>
  );
};

export default OrderItem;
