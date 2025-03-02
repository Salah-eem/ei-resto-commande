"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppBar, Toolbar, Button, Container, Box, IconButton, Badge } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CartDialog from './CartDialog';
import { Product } from '@/types';

const Header = () => {
  const [isCartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Fonction pour ajouter un produit au panier
  const handleAddToCart = (product: Product, size: string, price: number, quantity: number) => {
    setCartItems((prevItems) => {
      // Vérifier si l'article existe déjà dans le panier
      const existingItem = prevItems.find(
        (item) => item.id === product._id && item.size === size
      );

      if (existingItem) {
        // Mettre à jour la quantité de l'article existant
        return prevItems.map((item) =>
          item.id === product._id && item.size === size
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Ajouter un nouvel article
        return [
          ...prevItems,
          {
            id: product._id,
            name: `${product.name} (${size})`,
            price,
            quantity,
          },
        ];
      }
    });
  };

  // Mettre à jour la quantité dans le panier
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <AppBar position="fixed" sx={{ backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', zIndex: 1000 }}>
      <Container maxWidth="lg">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Link href="/">
            <Image src="/logo.png" alt="RestoCommande Logo" width={120} height={40} />
          </Link>
          <Box>
            <Link href="/menu"><Button sx={{ color: 'black', fontWeight: 'bold' }}>Menu</Button></Link>
            <Link href="/orders"><Button sx={{ color: 'black', fontWeight: 'bold' }}>Commandes</Button></Link>
            <Link href="/login"><Button sx={{ color: 'black', fontWeight: 'bold' }}>Connexion</Button></Link>
            <IconButton onClick={() => setCartOpen(true)}>
              <Badge badgeContent={totalItems} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Passer la fonction addToCart et les autres props au CartDialog */}
      <CartDialog
        open={isCartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onQuantityChange={handleQuantityChange}
      />
    </AppBar>
  );
};

export default Header;
