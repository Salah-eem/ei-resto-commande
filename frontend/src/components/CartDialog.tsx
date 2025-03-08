"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { fetchCart, updateCartQuantity, removeFromCart } from "@/store/slices/cartSlice";
import { RootState } from "@/store/store";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Grid, Paper, Button, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
}

const CartDialog: React.FC<CartDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const dispatch = useDispatch();
  
  // ✅ Récupération du `userId` depuis Redux
  const userId = useSelector((state: RootState) => state.user.userId)!;
  const cartItems = useSelector((state: RootState) => state.cart.items);

  // ✅ Calcul du total
  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  // ✅ Charger le panier uniquement si `open === true`
  useEffect(() => {
    if (open && userId) {
      dispatch(fetchCart(userId) as any);
    }
  }, [open, userId, dispatch]);

  // ✅ Fonction pour mettre à jour ou supprimer un produit
  const handleQuantityChange = (productId: string, size: string | undefined, quantity: number) => {
    if (!userId) return; // Sécurité si `userId` est absent

    if (quantity > 0) {
      dispatch(updateCartQuantity({ userId, productId, size, quantity }) as any);
    } else {
      dispatch(removeFromCart({ userId, productId, size }) as any);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Mon Panier
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {cartItems.length === 0 ? (
          <Typography align="center">Votre panier est vide.</Typography>
        ) : (
          <Grid container spacing={2}>
            {cartItems.map((item) => (
              <Grid item xs={12} key={`${item.productId}-${item.size || "default"}`}>
                <Paper sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="h6">{item.name}</Typography>
                    <Typography>Prix : {item.price.toFixed(2)}€ x {item.quantity}</Typography>
                    {item.size && <Typography>Taille : {item.size}</Typography>}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <IconButton onClick={() => handleQuantityChange(item.productId, item.size, item.quantity - 1)}>
                      <RemoveIcon />
                    </IconButton>
                    <Typography>{item.quantity}</Typography>
                    <IconButton onClick={() => handleQuantityChange(item.productId, item.size, item.quantity + 1)}>
                      <AddIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => dispatch(removeFromCart({ userId, productId: item.productId, size: item.size }) as any)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="h6">Total : {totalPrice.toFixed(2)}€</Typography>
          <Button onClick={() => router.push("/cart")} variant="contained" sx={{ mt: 1 }}>
            Voir le panier
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CartDialog;
