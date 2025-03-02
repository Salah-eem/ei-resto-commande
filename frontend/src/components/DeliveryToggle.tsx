// DeliveryToggle.tsx
"use client";
import React, { useState } from "react";
import { ToggleButtonGroup, ToggleButton, Box } from "@mui/material";
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StoreIcon from '@mui/icons-material/Store';

const DeliveryToggle = () => {
  const [mode, setMode] = useState<string>("delivery");

  const handleChange = (_event: any, newMode: string) => {
    if (newMode !== null) setMode(newMode);
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        mt: 3,
        transition: "all 0.3s ease-in-out"
      }}
    >
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleChange}
        sx={{
          backgroundColor: "#f0f0f0",
          borderRadius: "30px",
          p: "5px",
          display: "flex",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease"
        }}
      >
        <ToggleButton
          value="delivery"
          sx={{
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: "bold",
            backgroundColor: mode === "delivery" ? "#007bff" : "transparent",
            color: mode === "delivery" ? "#fff" : "#333",
            px: 4,
            display: "flex",
            alignItems: "center",
            gap: 1,
            transition: "all 0.3s ease",
            '&:hover': { backgroundColor: mode === "delivery" ? "#0056b3" : "#e0e0e0" }
          }}
        >
          <LocalShippingIcon /> Livraison
        </ToggleButton>
        <ToggleButton
          value="pickup"
          sx={{
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: "bold",
            backgroundColor: mode === "pickup" ? "#007bff" : "transparent",
            color: mode === "pickup" ? "#fff" : "#333",
            px: 4,
            display: "flex",
            alignItems: "center",
            gap: 1,
            transition: "all 0.3s ease",
            '&:hover': { backgroundColor: mode === "pickup" ? "#0056b3" : "#e0e0e0" }
          }}
        >
          <StoreIcon /> À emporter
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default DeliveryToggle;
