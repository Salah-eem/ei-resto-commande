"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Card,
  ToggleButton,
  ToggleButtonGroup,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Stack,
  Avatar,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { loadStripe } from "@stripe/stripe-js";
import { useFormik } from "formik";
import * as yup from "yup";
import {
  fetchCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from "@/store/slices/cartSlice";
import { fetchProducts } from "@/store/slices/productSlice";
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import axios from "axios";
import GeoapifyAutocomplete from "@/components/GeoapifyAutocomplete";

const DELIVERY_FEE = 3.99;
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!;

const CartPage: React.FC = () => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
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
  const [addressOptions, setAddressOptions] = useState<string[]>([]);

  useEffect(() => {
    if (userId) dispatch(fetchCart(userId) as any);
    if (products.length === 0) dispatch(fetchProducts() as any);
  }, [userId, dispatch, products.length]);

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalAmount = orderType === "delivery" ? subtotal + DELIVERY_FEE : subtotal;

  const handleQuantityChange = (productId: string, size: string | undefined, quantity: number) => {
    if (!userId) return;
    if (quantity > 0) dispatch(updateCartQuantity({ userId, productId, size, quantity }) as any);
    else dispatch(removeFromCart({ userId, productId, size }) as any);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      address: "",
      city: "",
      postalCode: "",
      streetNumber: "",
      phone: "",
      instructions: "",
    },
    validationSchema: orderType === "delivery"
    ? yup.object({
        address: yup.string().required("Address is required"),
        city: yup.string().required("City is required"),
        postalCode: yup.string().required("Postal code is required"),
        streetNumber: yup.string().required("Street number is required"),
        phone: yup.string().required("Phone number is required"),
        instructions: yup.string(),
      })
    : yup.object({
        instructions: yup.string(),
      }),

    onSubmit: async (values) => {
      setLoadingPayment(true);
      setErrorPayment(null);
      try {
        if (paymentMethod === "card") {
          const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
          const res = await axios.post(`${API_URL}/payment/stripe`, {
            userId,
            cartItems,
            totalAmount,
            orderType,
            orderDetails: values,
          });
          await stripe?.redirectToCheckout({ sessionId: res.data.sessionId });
        } else if (paymentMethod === "paypal") {
          const res = await axios.post(`${API_URL}/payment/paypal`, {
            userId,
            cartItems,
            totalAmount,
            orderType,
            orderDetails: values,
          });
          window.location.href = res.data.approvalUrl;
        } else if (paymentMethod === "cash") {
          const res = await axios.post(`${API_URL}/payment/cash`, {
            userId,
            cartItems,
            totalAmount,
            orderType,
            orderDetails: values,
          });
          if (res.data.success) {
            dispatch(clearCart(userId) as any);
            router.push("/order-confirmation?success=true");
          } else {
            setErrorPayment("Error processing order.");
          }
        }
      } catch (err) {
        setErrorPayment("Payment error. Try again.");
      } finally {
        setLoadingPayment(false);
      }
    },
  });

  const handleAddressInput = async (input: string) => {
    if (input.length < 3) {
      setAddressOptions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&addressdetails=1&limit=5`);
      const data = await res.json();
      const suggestions = data.map((item: any) => item.display_name);
      setAddressOptions(suggestions);
    } catch (error) {
      console.error("Error fetching address suggestions", error);
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: "1200px", mx: "auto" }}>
      <Typography variant="h4" fontWeight="bold" textAlign="center" mb={4}>
        <ShoppingCartIcon sx={{ fontSize: 32, mr: 1 }} /> Your Cart
      </Typography>

      {cartItems.length === 0 ? (
        <Typography variant="h6" align="center">Your cart is empty.</Typography>
      ) : (
        <Grid container spacing={4}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              {cartItems.map((item) => (
                <Paper
                  key={item.productId}
                  sx={{ p: 2, mb: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}
                >
                  <Avatar src={`${API_URL}/${item.image_url}`} variant="rounded" sx={{ width: 80, height: 80 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{item.name}</Typography>
                    {item.size && <Typography variant="body2">Size: {item.size}</Typography>}
                    <Typography variant="body2">Price: {item.price.toFixed(2)}€</Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <IconButton onClick={() => handleQuantityChange(item.productId, item.size, item.quantity - 1)}><RemoveIcon /></IconButton>
                    <Typography>{item.quantity}</Typography>
                    <IconButton onClick={() => handleQuantityChange(item.productId, item.size, item.quantity + 1)}><AddIcon /></IconButton>
                    <IconButton onClick={() => dispatch(removeFromCart({ userId, productId: item.productId, size: item.size }) as any)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ p: 3, borderRadius: 3, position: { md: "sticky" }, top: 80 }}>
              <Typography variant="h6" fontWeight="bold" mb={2}>Order Summary</Typography>

              <ToggleButtonGroup
                value={orderType}
                exclusive
                onChange={(_, val) => val && setOrderType(val)}
                sx={{ width: "100%", mb: 3 }}
              >
                <ToggleButton value="pickup" sx={{ flex: 1 }}><StorefrontIcon sx={{ mr: 1 }} /> Pickup</ToggleButton>
                <ToggleButton value="delivery" sx={{ flex: 1 }}><LocalShippingIcon sx={{ mr: 1 }} /> Delivery</ToggleButton>
              </ToggleButtonGroup>

              <Typography>Subtotal: {subtotal.toFixed(2)}€</Typography>
              {orderType === "delivery" && <Typography color="text.secondary">Delivery Fee: {DELIVERY_FEE.toFixed(2)}€</Typography>}
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Total: {totalAmount.toFixed(2)}€</Typography>

              <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 3 }}>
                {orderType === "delivery" && (
                  <>
                    <GeoapifyAutocomplete
                      value={formik.values.address || ""}
                      onSelect={(address, city, postalCode) => {
                        formik.setFieldValue("address", address);
                        formik.setFieldValue("city", city);
                        formik.setFieldValue("postalCode", postalCode);
                      }}
                      error={formik.touched.address && Boolean(formik.errors.address)}
                      helperText={formik.touched.address && formik.errors.address}
                    />


                    <TextField
                      fullWidth
                      id="streetNumber"
                      name="streetNumber"
                      label="Street Number"
                      value={formik.values.streetNumber || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.streetNumber && Boolean(formik.errors.streetNumber)}
                      helperText={formik.touched.streetNumber && formik.errors.streetNumber}
                      sx={{ mb: 2, mt: 2 }}
                    />

                    <TextField
                      fullWidth
                      id="city"
                      name="city"
                      label="City"
                      value={formik.values.city || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.city && Boolean(formik.errors.city)}
                      helperText={formik.touched.city && formik.errors.city}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      id="postalCode"
                      name="postalCode"
                      label="Postal Code"
                      value={formik.values.postalCode || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.postalCode && Boolean(formik.errors.postalCode)}
                      helperText={formik.touched.postalCode && formik.errors.postalCode}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      fullWidth
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={formik.values.phone || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={formik.touched.phone && Boolean(formik.errors.phone)}
                      helperText={formik.touched.phone && formik.errors.phone}
                      sx={{ mb: 2 }}
                    />
                  </>
                )}
                <TextField
                  fullWidth
                  id="instructions"
                  name="instructions"
                  label="Additional Instructions (optional)"
                  value={formik.values.instructions || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.instructions && Boolean(formik.errors.instructions)}
                  helperText={formik.touched.instructions && formik.errors.instructions}
                  sx={{ mb: 2 }}
                />
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Payment Method:</Typography>
                <RadioGroup value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                  <FormControlLabel value="card" control={<Radio />} label={<><CreditCardIcon sx={{ mr: 1 }} /> Credit Card</>} />
                  <FormControlLabel value="paypal" control={<Radio />} label={<><PaymentIcon sx={{ mr: 1 }} /> PayPal</>} />
                  <FormControlLabel value="cash" control={<Radio />} label={<><AccountBalanceWalletIcon sx={{ mr: 1 }} /> Cash</>} />
                </RadioGroup>

                {errorPayment && <Alert severity="error" sx={{ mt: 2 }}>{errorPayment}</Alert>}

                <Button variant="contained" fullWidth sx={{ mt: 3 }} type="submit" disabled={loadingPayment || !formik.isValid}>
                  {loadingPayment ? <CircularProgress size={24} color="inherit" /> : "Confirm & Pay"}
                </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default CartPage;
