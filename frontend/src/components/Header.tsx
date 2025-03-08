"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppBar, Toolbar, Button, Container, Box, IconButton, Badge } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CartDialog from "./CartDialog";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

const Header = () => {
  const [isCartOpen, setCartOpen] = useState(false);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <AppBar position="fixed" sx={{ backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", zIndex: 1000 }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/">
            <Image src="/logo.png" alt="RestoCommande Logo" width={120} height={40} />
          </Link>
          <Box>
            <Link href="/menu">
              <Button sx={{ color: "black", fontWeight: "bold" }}>Menu</Button>
            </Link>
            <Link href="/orders">
              <Button sx={{ color: "black", fontWeight: "bold" }}>Commandes</Button>
            </Link>
            <Link href="/login">
              <Button sx={{ color: "black", fontWeight: "bold" }}>Connexion</Button>
            </Link>
            <IconButton onClick={() => setCartOpen(true)}>
              <Badge badgeContent={totalItems} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
    </AppBar>
  );
};

export default Header;
