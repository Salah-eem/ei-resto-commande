"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Container, Typography, Grid, Paper, Box, Button, IconButton, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const mockCartItems = [
  { id: '1', name: 'Produit 1', price: 20.99, quantity: 2 },
  { id: '2', name: 'Produit 2', price: 35.50, quantity: 1 },
];

const CartPage: React.FC = () => {
  const router = useRouter();
  const [cartItems, setCartItems] = React.useState(mockCartItems);

  const handleQuantityChange = (id: string, quantity: number) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
    ));
  };

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 3, fontWeight: 'bold' }}>🛒 Mon Panier</Typography>

      {cartItems.length === 0 ? (
        <Typography variant="body1" align="center">Votre panier est vide.</Typography>
      ) : (
        <Grid container spacing={2}>
          {cartItems.map((item) => (
            <Grid item xs={12} key={item.id}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 3, boxShadow: 2 }}>
                <Box>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography variant="body2">Prix : {item.price.toFixed(2)}€ x {item.quantity}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="small" onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}><RemoveIcon /></IconButton>
                  <Typography>{item.quantity}</Typography>
                  <IconButton size="small" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}><AddIcon /></IconButton>
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{(item.price * item.quantity).toFixed(2)}€</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {cartItems.length > 0 && (
        <Box mt={4} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Divider />
          <Typography variant="h6">Total : {totalPrice.toFixed(2)}€</Typography>
          <Button variant="contained" color="primary" size="large">Passer à la commande</Button>
          <Button variant="outlined" color="secondary" size="large" onClick={() => router.back()}>Continuer les achats</Button>
        </Box>
      )}
    </Container>
  );
};

export default CartPage;
