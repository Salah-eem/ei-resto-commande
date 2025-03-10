"use client";
import React, { useEffect } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchProducts } from "@/store/slices/productSlice";
import { RootState } from "@/store/store";
import ProductList from "@/components/ProductList";
import DeliveryToggle from "@/components/DeliveryToggle";

const HomePage = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.products);

  useEffect(() => {
    dispatch(fetchProducts() as any);
  }, [dispatch]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <DeliveryToggle />
      <ProductList />
    </Box>
  );
};

export default HomePage;
