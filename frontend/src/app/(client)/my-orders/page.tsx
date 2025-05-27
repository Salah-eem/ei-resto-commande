"use client";
import React, { useEffect } from "react";
import { fetchOrders } from "@/store/slices/orderSlice";
import { RootState } from "@/store/store";
import { Box, Typography, CircularProgress, Alert, Button, Container, Stack } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import OrderList from "@/components/OrderList";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { fetchRestaurantInfo } from "@/store/slices/restaurantSlice";

const MyOrders: React.FC = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state: RootState) => state.auth.token);
  const userId = useAppSelector((state: RootState) => state.user.userId);
  const { orders, loading, error } = useAppSelector((state: RootState) => state.orders);
  const { restaurantAddress, deliveryFee } = useAppSelector((state: RootState) => state.restaurant);

  useEffect(() => {
    dispatch(fetchRestaurantInfo() as any);
  }, [dispatch]);
  
  
  useEffect(() => {
    if (userId) {
      dispatch(fetchOrders(userId) as any);
    }
  }, [userId, dispatch]);

  if (!token) {
    return (
      <Box
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
        }}
      >
        <Alert severity="info">To view your orders, you must log in.</Alert>
        <Link href="/login" passHref>
          <Button variant="contained" sx={{ mt: 2 }}>
            Log In
          </Button>
        </Link>
      </Box>
    );
  }

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
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Stack direction="column" alignItems="center" spacing={2} mb={4}>
        <ShoppingBagIcon sx={{ fontSize: 50, color: "primary.main" }} />
        <Typography variant="h4" fontWeight="bold">My Orders</Typography>
        <Typography variant="subtitle1" color="text.secondary">Track and review all your recent orders.</Typography>
      </Stack>

      <OrderList orders={orders} deliveryFee={deliveryFee || 0} />
    </Container>
  );
};

export default MyOrders;
