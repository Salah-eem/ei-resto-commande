"use client";

import React, { useEffect, useState } from "react";
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
  Stack,
  Avatar,
  RadioGroup,
  FormControl,
  FormLabel,
  FormControlLabel,
  Radio,
  TextField,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  LocalShipping as LocalShippingIcon,
  Storefront as StorefrontIcon,
  CreditCard as CreditCardIcon,
  Payment as PaymentIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  ShoppingCart as ShoppingCartIcon,
  DeliveryDining as DeliveryDiningIcon,
} from "@mui/icons-material";
import { loadStripe } from "@stripe/stripe-js";
import { useFormik } from "formik";
import * as yup from "yup";
import GeoapifyAutocomplete from "@/components/GeoapifyAutocomplete";

import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import {
  fetchCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
} from "@/store/slices/cartSlice";
import { fetchProducts } from "@/store/slices/productSlice";
import { fetchRestaurantInfo } from "@/store/slices/restaurantSlice";

import axios from "axios";
import { useRouter } from "next/navigation";
import { OrderType } from "@/types/order";
import { RootState } from "@/store/store";

const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const CartPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const userId = useAppSelector((s) => s.user.userId)!;
  const cartItems = useAppSelector((s) => s.cart.items);
  const cartLoading = useAppSelector((s) => s.cart.loading);
  const cartError = useAppSelector((s) => s.cart.error);

  const products = useAppSelector((s) => s.products.items);

  const {
    deliveryFee,
    loading: feeLoading,
    error: feeError,
  } = useAppSelector((s) => s.restaurant);

  // Local state
  const [orderType, setOrderType] = useState<OrderType>(OrderType.PICKUP);
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "paypal" | "cash"
  >("card");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [errorPayment, setErrorPayment] = useState<string | null>(null);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Fetch cart, products & restaurant info
  useEffect(() => {
    if (userId) dispatch(fetchCart(userId));
    dispatch(fetchProducts());
    dispatch(fetchRestaurantInfo());
  }, [dispatch, userId]);

  // Préremplir les champs si l'utilisateur est connecté
  const userProfile = useAppSelector((state: RootState) => state.user.profile);

  useEffect(() => {
    if (userProfile) {
      formik.setFieldValue("name", `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim());
      formik.setFieldValue("phone", userProfile.phone ?? "");
      if (orderType === OrderType.DELIVERY && userProfile.addresses.length > 0) {
        formik.setFieldValue("address", userProfile.addresses[0]?.street || "");
        formik.setFieldValue("streetNumber", userProfile.addresses[0]?.streetNumber ? String(userProfile.addresses[0]?.streetNumber) : "");
        formik.setFieldValue("city", userProfile.addresses[0]?.city || "");
        formik.setFieldValue("postalCode", userProfile.addresses[0]?.postalCode || "");
      }
    }
  }, [userProfile, orderType]);

  // Toujours fournir une valeur string par défaut pour tous les champs contrôlés
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: "",
      phone: "",
      address: "",
      streetNumber: "",
      city: "",
      postalCode: "",
      instructions: "",
    },
    validationSchema:
      orderType === "delivery"
        ? yup.object({
            name: yup.string().required("Name is required"),
            phone: yup.string().required("Phone is required"),
            address: yup.string().required("Address is required"),
            streetNumber: yup.string().required("Street number is required"),
            city: yup.string().required("City is required"),
            postalCode: yup.string().required("Postal code is required"),
            instructions: yup.string(),
          })
        : yup.object({
            name: yup.string().required("Name is required"),
            phone: yup.string().required("Phone number is required"),
            instructions: yup.string(),
          }),
    onSubmit: async (vals) => {
      setLoadingPayment(true);
      setErrorPayment(null);

      const address = {
        street: vals.address,
        streetNumber: vals.streetNumber,
        city: vals.city,
        postalCode: vals.postalCode,
        country: selectedCountry,
        lat: selectedLat,
        lng: selectedLng,
      };

      const payload = {
        userId,
        customer: {
          name: vals.name,
          phone: vals.phone,
        },
        cartItems,
        totalAmount: total,
        orderType,
        address: orderType === OrderType.DELIVERY ? address : null,
      };

      try {
        if (paymentMethod === "card") {
          const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
          const { data } = await axios.post(
            `${API_URL}/payment/stripe`,
            payload
          );
          await stripe?.redirectToCheckout({ sessionId: data.sessionId });
        } else if (paymentMethod === "paypal") {
          const { data } = await axios.post(
            `${API_URL}/payment/paypal`,
            payload
          );
          window.location.href = data.approvalUrl;
        } else {
          const { data } = await axios.post(`${API_URL}/payment/cash`, payload);
          if (data.success) {
            dispatch(clearCart(userId));
            router.push("/order-confirmation?success=true");
          } else {
            setErrorPayment("Order error.");
          }
        }
      } catch {
        setErrorPayment("Payment error.");
      } finally {
        setLoadingPayment(false);
      }
    },
  });

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const fee = orderType === "delivery" ? deliveryFee ?? 0 : 0;
  const total = subtotal + fee;

  const handleQuantityChange = (
    productId: string,
    size: string | undefined,
    qty: number
  ) => {
    if (!userId) return;
    if (qty > 0)
      dispatch(updateCartQuantity({ userId, productId, size, quantity: qty }));
    else dispatch(removeFromCart({ userId, productId, size }));
  };

  if (cartLoading && cartItems.length === 0)
    return (
      <Box
        sx={{
          height: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  if (cartError)
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {cartError}
      </Alert>
    );

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 1200,
        mx: "auto",
        position: "relative",
      }}
    >
      {cartLoading && cartItems.length > 0 && (
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          bgcolor="rgba(255,255,255,0.5)"
          zIndex={2}
        >
          <CircularProgress />
        </Box>
      )}
      <Typography variant="h4" textAlign="center" gutterBottom>
        <ShoppingCartIcon fontSize="large" /> Your Cart
      </Typography>

      {cartItems.length === 0 ? (
        <Typography textAlign="center" variant="h6">
          Your cart is empty.
        </Typography>
      ) : (
        <Grid container spacing={4}>
          {/* Liste des items */}
          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              {cartItems.map((item) => (
                <Paper
                  key={`${item.productId}-${item.size || "std"}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    borderRadius: 2,
                  }}
                >
                  <Avatar
                    src={`${API_URL}/${item.image_url}`}
                    variant="rounded"
                    sx={{ width: 80, height: 80, mr: 2 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight="bold">{item.name}</Typography>
                    {item.size && (
                      <Typography variant="body2">Size: {item.size}</Typography>
                    )}
                    <Typography variant="body2">
                      {item.price.toFixed(2)} € x {item.quantity}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      onClick={() =>
                        handleQuantityChange(
                          item.productId,
                          item.size,
                          item.quantity - 1
                        )
                      }
                    >
                      <RemoveIcon />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      inputProps={{ min: 1, style: { width: 50, textAlign: "center" } }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          handleQuantityChange(item.productId, item.size, val);
                        }
                      }}
                      onBlur={(e) => {
                        // Si l'utilisateur efface tout, on remet 1
                        if (!e.target.value || parseInt(e.target.value, 10) < 1) {
                          handleQuantityChange(item.productId, item.size, 1);
                        }
                      }}
                      sx={{ mx: 1 }}
                    />
                    <IconButton
                      onClick={() =>
                        handleQuantityChange(
                          item.productId,
                          item.size,
                          item.quantity + 1
                        )
                      }
                    >
                      <AddIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() =>
                        dispatch(
                          removeFromCart({
                            userId,
                            productId: item.productId,
                            size: item.size,
                          })
                        )
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Grid>

          {/* Récap & Formulaire */}
          <Grid item xs={12} md={5}>
            <Card
              sx={{
                p: 3,
                borderRadius: 2,
                position: { md: "sticky" },
                top: 80,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>

              <Stack spacing={2}>
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                  >
                    <FormControlLabel
                      value="pickup"
                      control={<Radio />}
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <StorefrontIcon /> Pickup
                        </Stack>
                      }
                    />
                    <FormControlLabel
                      value="delivery"
                      control={<Radio />}
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <DeliveryDiningIcon /> Delivery
                        </Stack>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography>Subtotal</Typography>
                  <Typography>{subtotal.toFixed(2)} €</Typography>
                </Stack>
                {orderType === "delivery" && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography>Delivery Fee</Typography>
                      {feeLoading ? (
                        <CircularProgress size={16} />
                      ) : feeError ? (
                        <Typography color="error">!</Typography>
                      ) : (
                        <Typography>{fee.toFixed(2)} €</Typography>
                      )}
                    </Stack>
                    <Divider />
                  </>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6">{total.toFixed(2)} €</Typography>
                </Stack>
              </Stack>

              <Box
                component="form"
                onSubmit={formik.handleSubmit}
                sx={{ mt: 3 }}
              >
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formik.values.phone}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.phone && Boolean(formik.errors.phone)}
                  helperText={formik.touched.phone && formik.errors.phone}
                  sx={{ mb: 2 }}
                />
                {orderType === "delivery" && (
                  <Stack spacing={2}>
                    <GeoapifyAutocomplete
                      value={formik.values.address}
                      onSelect={(addr, city, pc, lat, lng, country) => {
                        formik.setFieldValue("address", addr);
                        formik.setFieldValue("city", city);
                        formik.setFieldValue("postalCode", pc);
                        setSelectedLat(lat);
                        setSelectedLng(lng);
                        setSelectedCountry(country);
                      }}
                      error={Boolean(
                        formik.touched.address && formik.errors.address
                      )}
                      helperText={
                        formik.touched.address && formik.errors.address
                      }
                    />

                    <TextField
                      label="Street Number"
                      name="streetNumber"
                      fullWidth
                      value={formik.values.streetNumber}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={Boolean(
                        formik.touched.streetNumber &&
                          formik.errors.streetNumber
                      )}
                      helperText={
                        formik.touched.streetNumber &&
                        formik.errors.streetNumber
                      }
                    />

                    <TextField
                      label="City"
                      name="city"
                      fullWidth
                      value={formik.values.city}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={Boolean(formik.touched.city && formik.errors.city)}
                      helperText={formik.touched.city && formik.errors.city}
                    />

                    <TextField
                      label="Postal Code"
                      name="postalCode"
                      fullWidth
                      value={formik.values.postalCode}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      error={Boolean(
                        formik.touched.postalCode && formik.errors.postalCode
                      )}
                      helperText={
                        formik.touched.postalCode && formik.errors.postalCode
                      }
                    />
                  </Stack>
                )}

                <TextField
                  label="Instructions (opt.)"
                  name="instructions"
                  fullWidth
                  multiline
                  rows={2}
                  sx={{ mt: 2 }}
                  value={formik.values.instructions}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />

                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                  Payment Method
                </Typography>
                <RadioGroup
                  row
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <FormControlLabel
                    value="card"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CreditCardIcon /> Card
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value="paypal"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PaymentIcon /> PayPal
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value="cash"
                    control={<Radio />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <AccountBalanceWalletIcon /> Cash
                      </Stack>
                    }
                  />
                </RadioGroup>

                {errorPayment && <Alert severity="error">{errorPayment}</Alert>}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  disabled={loadingPayment || !formik.isValid}
                  startIcon={
                    loadingPayment ? <CircularProgress size={16} /> : undefined
                  }
                >
                  Confirm & Pay
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
