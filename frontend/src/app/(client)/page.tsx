"use client";
import React, { useEffect } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { fetchProducts } from "@/store/slices/productSlice";
import { RootState } from "@/store/store";
import ProductList from "@/components/ProductList";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";

const HomePage = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(
    (state: RootState) => state.products
  );

  useEffect(() => {
    dispatch(fetchProducts() as any);
  }, [dispatch]);
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: { xs: "50vh", sm: "100vh" },
          px: { xs: 2, sm: 0 },
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: { xs: "50vh", sm: "100vh" },
          px: { xs: 2, sm: 0 },
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <ProductList />
    </Box>
  );
};

export default HomePage;
