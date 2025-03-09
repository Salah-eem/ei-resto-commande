"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCart, updateCartQuantity, removeFromCart, clearCart } from "@/store/slices/cartSlice";
import { fetchProducts } from "@/store/slices/productSlice";
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Box, Typography, Grid, Paper, IconButton, Button, Divider, CircularProgress, Alert,
  Card, CardContent, ToggleButton, ToggleButtonGroup, Avatar, RadioGroup, FormControlLabel, Radio
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PaymentIcon from "@mui/icons-material/Payment";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { loadStripe } from "@stripe/stripe-js";

const DELIVERY_FEE = 3.99;
const STRIPE_PUBLIC_KEY = "pk_test_51R0USrC8GycP5SjONID25lxAZCuvL4YNYgIHuSVoFiPpmGYJVa1cofllPRvnvWcQ4yhxSnXxLKDrppCyHloQOmcN001VedX7ka"; // Remplace avec ta clé Stripe
const PAYPAL_CLIENT_ID = "your-paypal-client-id"; // Remplace avec ton client ID PayPal

const CartPage: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const userId = useSelector((state: RootState) => state.user.userId)!;
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const loading = useSelector((state: RootState) => state.cart.loading);
  const error = useSelector((state: RootState) => state.cart.error);
  const products = useSelector((state: RootState) => state.products.items);

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "cash">("card");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [errorPayment, setErrorPayment] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      dispatch(fetchCart(userId) as any);
    }
    if (products.length === 0) {
      dispatch(fetchProducts() as any);
    }
  }, [userId, dispatch, products.length]);

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalPrice = orderType === "delivery" ? subtotal + DELIVERY_FEE : subtotal;

  const handleQuantityChange = (productId: string, size: string | undefined, quantity: number) => {
    if (!userId) return;
    if (quantity > 0) {
      dispatch(updateCartQuantity({ userId, productId, size, quantity }) as any);
    } else {
      dispatch(removeFromCart({ userId, productId, size }) as any);
    }
  };

  const handleOrderTypeChange = (_event: React.MouseEvent<HTMLElement>, newOrderType: "delivery" | "pickup") => {
    if (newOrderType !== null) {
      setOrderType(newOrderType);
    }
  };

  const handlePaymentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(event.target.value as "card" | "paypal" | "cash");
  };

  const handleCheckout = async () => {
    setLoadingPayment(true);
    setErrorPayment(null);

    try {
      if (paymentMethod === "card") {
        // ✅ Paiement via Stripe
        const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
        const response = await axios.post("http://localhost:3001/payments/stripe", {
          userId,
          cartItems,
          totalPrice,
        });
        await stripe?.redirectToCheckout({ sessionId: response.data.sessionId });
      } else if (paymentMethod === "paypal") {
        // ✅ Paiement via PayPal
        const response = await axios.post("http://localhost:3001/payments/paypal", {
          userId,
          cartItems,
          totalPrice,
        });
        window.location.href = response.data.approvalUrl;
      } else {
        // ✅ Paiement en espèces
        await axios.post("http://localhost:3001/orders", {
          userId,
          cartItems,
          totalPrice,
          paymentMethod: "cash",
        });
        dispatch(clearCart(userId) as any);
        router.push("/order-confirmation");
      }
    } catch (err) {
      setErrorPayment("Erreur lors du paiement, veuillez réessayer.");
    } finally {
      setLoadingPayment(false);
    }
  };

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
        <ShoppingCartOutlinedIcon sx={{ fontSize: 32, mr: 1 }} /> Mon Panier
      </Typography>

      {cartItems.length === 0 ? (
        <Typography variant="h6" align="center">Votre panier est vide.</Typography>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h5" fontWeight="bold" mb={3}>
                🛒 Articles dans votre panier
              </Typography>
              {cartItems.map((item) => (
                <Paper key={item.productId} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography>Prix : {item.price.toFixed(2)}€ x {item.quantity}</Typography>
                  {item.size && <Typography>Taille : {item.size}</Typography>}
                </Paper>
              ))}
            </Paper>
          </Grid>

          {/* ✅ Paiement */}
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 4, borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" mb={2}>
                  💰 Récapitulatif de commande
                </Typography>

                <ToggleButtonGroup value={orderType} exclusive onChange={handleOrderTypeChange} sx={{ width: "100%", mb: 3 }}>
                  <ToggleButton value="pickup" sx={{ flex: 1 }}>
                    <StorefrontIcon /> À emporter
                  </ToggleButton>
                  <ToggleButton value="delivery" sx={{ flex: 1 }}>
                    <LocalShippingIcon /> Livraison
                  </ToggleButton>
                </ToggleButtonGroup>

                <Typography variant="h6">Total : {totalPrice.toFixed(2)}€</Typography>

                {/* ✅ Sélection du mode de paiement */}
                <RadioGroup value={paymentMethod} onChange={handlePaymentChange}>
                  <FormControlLabel value="card" control={<Radio />} label={<><CreditCardIcon /> Carte Bancaire</>} />
                  <FormControlLabel value="paypal" control={<Radio />} label={<><PaymentIcon /> PayPal</>} />
                  <FormControlLabel value="cash" control={<Radio />} label={<><AccountBalanceWalletIcon /> Espèces</>} />
                </RadioGroup>

                <Button variant="contained" sx={{ mt: 3, width: "100%" }} onClick={handleCheckout} disabled={loadingPayment}>
                  {loadingPayment ? <CircularProgress size={24} /> : "💳 Payer maintenant"}
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
