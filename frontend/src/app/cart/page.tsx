"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCart, updateCartQuantity, removeFromCart } from "@/store/slices/cartSlice";
import { RootState } from "@/store/store";
import { 
  Box, Typography, Grid, Paper, IconButton, Button, Divider, CircularProgress, Alert, 
  Card, CardContent, ToggleButton, ToggleButtonGroup, Avatar 
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import { useRouter } from "next/navigation";

const DELIVERY_FEE = 3.99; // 🚚 Frais de livraison

const CartPage: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.user.userId)!;
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const loading = useSelector((state: RootState) => state.cart.loading);
  const error = useSelector((state: RootState) => state.cart.error);

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("pickup");

  // ✅ Charger le panier uniquement si `userId` est disponible
  useEffect(() => {
    if (userId) {
      dispatch(fetchCart(userId) as any);
    }
  }, [userId, dispatch]);

  // ✅ Calcul du total du panier
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalPrice = orderType === "delivery" ? subtotal + DELIVERY_FEE : subtotal;

  // ✅ Mise à jour de la quantité
  const handleQuantityChange = (productId: string, size: string | undefined, quantity: number) => {
    if (!userId) return;
    if (quantity > 0) {
      dispatch(updateCartQuantity({ userId, productId, size, quantity }) as any);
    } else {
      dispatch(removeFromCart({ userId, productId, size }) as any);
    }
  };

  // ✅ Fonction pour passer au paiement
  const handleCheckout = () => {
    router.push("/checkout");
  };

  // ✅ Changer entre "Livraison" et "À emporter"
  const handleOrderTypeChange = (_event: React.MouseEvent<HTMLElement>, newOrderType: "delivery" | "pickup") => {
    if (newOrderType !== null) {
      setOrderType(newOrderType);
    }
  };

  // ✅ Afficher un loader pendant le chargement
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // ✅ Gérer les erreurs
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
        🛍️ Mon Panier
      </Typography>

      {cartItems.length === 0 ? (
        <Typography variant="h6" align="center">Votre panier est vide.</Typography>
      ) : (
        <Grid container spacing={4}>
          {/* ✅ Colonne gauche - Liste des produits */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h5" fontWeight="bold" mb={3}>
                🛒 Articles dans votre panier
              </Typography>
              {cartItems.map((item) => (
                <Paper
                  key={`${item.productId}-${item.size || "default"}`}
                  sx={{ p: 2, display: "flex", alignItems: "center", gap: 2, mb: 2, borderRadius: 2 }}
                >
                  <Avatar
                    src={`http://localhost:3001/${item.image_url}`}
                    alt={item.name}
                    sx={{ width: 64, height: 64 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
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
              ))}
            </Paper>
          </Grid>

          {/* ✅ Colonne droite - Récapitulatif et paiement */}
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 4, borderRadius: 3, backgroundColor: "#f9f9f9" }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" mb={2}>
                  💰 Récapitulatif de commande
                </Typography>
                
                {/* ✅ Bouton toggle entre "Livraison" et "À emporter" */}
                <ToggleButtonGroup
                  value={orderType}
                  exclusive
                  onChange={handleOrderTypeChange}
                  sx={{ width: "100%", mb: 3 }}
                >
                  <ToggleButton value="pickup" sx={{ flex: 1 }}>
                    <StorefrontIcon /> À emporter
                  </ToggleButton>
                  <ToggleButton value="delivery" sx={{ flex: 1 }}>
                    <LocalShippingIcon /> Livraison
                  </ToggleButton>
                </ToggleButtonGroup>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6">Sous-total : {subtotal.toFixed(2)}€</Typography>
                {orderType === "delivery" && (
                  <Typography variant="h6">🚚 Livraison : {DELIVERY_FEE.toFixed(2)}€</Typography>
                )}
                <Typography variant="h5" fontWeight="bold" mt={1}>
                  Total : {totalPrice.toFixed(2)}€
                </Typography>

                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ mt: 3, width: "100%", borderRadius: 2 }}
                  onClick={handleCheckout}
                >
                  💳 Payer maintenant
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CartPage;
