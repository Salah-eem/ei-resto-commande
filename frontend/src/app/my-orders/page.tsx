"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "@/store/slices/orderSlice";
import { RootState } from "@/store/store";
import { Box, Typography, CircularProgress, Alert, Button } from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import OrderList from "@/components/OrderList";
import Link from "next/link";

const MyOrders: React.FC = () => {
  const dispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.user.userId);
  const { orders, loading, error } = useSelector((state: RootState) => state.orders);

  // If user is not logged in, show a message with a link to the login page
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
        <Alert severity="info">
          To view your orders, you must log in.
        </Alert>
        <Link href="/login" passHref>
          <Button variant="contained" sx={{ mt: 2 }}>
            Log In
          </Button>
        </Link>
      </Box>
    );
  }

  // If user is logged in, fetch orders using the userId
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
        <ShoppingBagIcon sx={{ fontSize: 32, mr: 1 }} /> My Orders
      </Typography>
      <OrderList orders={orders} />
    </Box>
  );
};

export default MyOrders;
