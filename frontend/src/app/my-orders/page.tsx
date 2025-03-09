"use client";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrders } from "@/store/slices/orderSlice";
import { RootState } from "@/store/store";
import { 
  Box, Typography, Grid, Paper, CircularProgress, Alert, Divider, Chip 
} from "@mui/material";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";

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

      {orders.length === 0 ? (
        <Typography variant="h6" align="center">Vous n'avez encore passé aucune commande.</Typography>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} key={order._id}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Commande #{order._id.slice(-6).toUpperCase()} -{" "}
                  <Chip
                    label={order.status.toUpperCase()}
                    color={order.status === "paid" ? "primary" : order.status === "delivered" ? "success" : "warning"}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Passée le {new Date(order.createdAt).toLocaleDateString()}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {order.items.map((item) => (
                  <Box key={item.productId} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                    <Typography>{item.name} {item.size ? `(${item.size})` : ""}</Typography>
                    <Typography>{item.quantity} x {item.price.toFixed(2)}€</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" fontWeight="bold" textAlign="right">
                  Total : {order.totalAmount.toFixed(2)}€
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyOrders;
