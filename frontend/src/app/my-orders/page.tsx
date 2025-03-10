"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "@/store/slices/orderSlice";
import { RootState } from "@/store/store";
import { Box, Typography, CircularProgress, Alert } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import OrderList from "@/components/OrderList";

const MyOrders: React.FC = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.user.userId)!;
  const { orders, loading, error } = useSelector((state: RootState) => state.orders);

  useEffect(() => {
    if (userId) {
      dispatch(fetchOrders(userId) as any);
    }
  }, [userId, dispatch]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center" mb={3}>
        <ShoppingBagIcon sx={{ fontSize: 32, mr: 1 }} /> Mes Commandes
      </Typography>
      <OrderList orders={orders} />
    </Box>
  );
};

export default MyOrders;
