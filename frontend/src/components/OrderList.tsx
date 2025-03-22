import React from "react";
import { Grid, Typography, Box } from "@mui/material";
import OrderCard from "./OrderCard";
import { Restaurant } from "@/types/restaurant";
import { Order } from "@/types/order";

const OrderList: React.FC<{ orders: Order[], deliveryFee: number }> = ({ orders, deliveryFee }) => {
  if (orders.length === 0) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          You didn't passe any order yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={4}>
      {orders.map((order) => (
        <Grid item xs={12} md={6} key={order._id}>
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <OrderCard order={order} deliveryFee={deliveryFee || 0} />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};

export default OrderList;
