// CartDialog.tsx
"use client";
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Grid, Paper, Button, Box, Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
  cartItems: any[];
  onQuantityChange: (id: string, quantity: number) => void;
}

const CartDialog: React.FC<CartDialogProps> = ({ open, onClose, cartItems, onQuantityChange }) => {
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Mon Panier
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
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
                    <IconButton size="small" onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}><RemoveIcon /></IconButton>
                    <Typography>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => onQuantityChange(item.id, item.quantity + 1)}><AddIcon /></IconButton>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{(item.price * item.quantity).toFixed(2)}€</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {cartItems.length > 0 && (
          <Box mt={4} sx={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column' }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2 }}>Total : {totalPrice.toFixed(2)}€</Typography>
            <Button variant="contained" color="primary" size="large">Passer à la commande</Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CartDialog;