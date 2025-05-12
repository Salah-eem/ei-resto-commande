"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { Remove, ShoppingCart } from "@mui/icons-material";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";

import { fetchProducts } from "@/store/slices/productSlice";
import { fetchCategories } from "@/store/slices/categorySlice";
import { createOrder } from "@/store/slices/orderSlice";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";

import { Order, OrderType, PaymentMethod, PaymentStatus } from "@/types/order";
import { Address } from "@/types/address";
import { CartItem } from "@/types/cartItem";
import { Product, ProductType } from "@/types/product";
import { Category } from "@/types/category";
import NominatimAutocomplete from "@/components/NominatimAutocomplete";

// 🎯 Type uniquement pour les valeurs du formulaire
type OrderFormValues = {
  customerName: string;
  phoneNumber: string;
  orderType: OrderType;
  deliveryAddress: Partial<Address>;
  orderItems: CartItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
};

// ✅ Validation Yup
const validationSchema = Yup.object().shape({
  customerName: Yup.string().required("Required"),
  phoneNumber: Yup.string().required("Required"),
  orderType: Yup.mixed<OrderType>().oneOf(Object.values(OrderType)).required(),
  deliveryAddress: Yup.object().when("orderType", {
    is: OrderType.DELIVERY,
    then: (schema) =>
      schema.shape({
        street: Yup.string().required("Required"),
        streetNumber: Yup.string().required("Required"),
        city: Yup.string().required("Required"),
        postalCode: Yup.string().required("Required"),
        country: Yup.string().required("Required"),
      }),
    otherwise: (schema) => schema.notRequired(),
  }),
  orderItems: Yup.array()
    .of(
      Yup.object().shape({
        productId: Yup.string().required(),
        name: Yup.string().required(),
        price: Yup.number().required(),
        quantity: Yup.number().min(1).required(),
        size: Yup.string().optional(),
        category: Yup.object().shape({
          _id: Yup.string().required(),
          name: Yup.string().required(),
        }),
      })
    )
    .min(1, "Add at least one product"),
  paymentMethod: Yup.mixed<PaymentMethod>()
    .oneOf(Object.values(PaymentMethod))
    .required(),
});

// 🧾 Valeurs initiales
const initialFormValues: OrderFormValues = {
  customerName: "",
  phoneNumber: "",
  orderType: OrderType.PICKUP,
  deliveryAddress: {
    street: "",
    streetNumber: 0,
    city: "",
    postalCode: "",
    country: "",
  },
  orderItems: [],
  paymentMethod: PaymentMethod.CASH,
  paymentStatus: PaymentStatus.PENDING,
};

const TakeOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products.items) as Product[];
  const categories = useAppSelector(
    (state) => state.categories.items
  ) as Category[];
  const isLoading = useAppSelector((state) => state.products.loading);

  const [tab, setTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const productsPerPage = 6;

  // ▶️ Charge produits et catégories
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  // ⬅️ Par défaut, sélectionne la première catégorie
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]._id);
    }
  }, [categories]);

  const filteredProducts = products
    .filter((p) => p.category._id === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * productsPerPage,
    page * productsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const calculateTotal = (items: CartItem[]) =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  const handleSubmit = async (values: OrderFormValues, { resetForm }: any) => {
    setIsSubmitting(true); // ⏳ Démarre le loader
    try {
      const payload: Partial<Order> = {
        customer: {
          name: values.customerName,
          phone: values.phoneNumber,
        },
        items: values.orderItems,
        orderType: values.orderType,
        deliveryAddress:
          values.orderType === OrderType.DELIVERY
            ? {
                street: values.deliveryAddress.street || "",
                streetNumber: values.deliveryAddress.streetNumber || 0,
                city: values.deliveryAddress.city || "",
                postalCode: values.deliveryAddress.postalCode || "",
                country: values.deliveryAddress.country || "",
                lat: values.deliveryAddress.lat || 0,
                lng: values.deliveryAddress.lng || 0,
              }
            : undefined,
        paymentMethod: values.paymentMethod,
        paymentStatus: values.paymentStatus,
      };
  
      await dispatch(createOrder(payload) as any);
  
      setAlert({ type: "success", message: "Order taken successffully !" });
      resetForm();
      setTab(0);
    } catch (err) {
      console.error("Error while creation :", err);
      setAlert({ type: "error", message: "❌ An error was occured." });
    } finally {
      setIsSubmitting(false); // ✅ Stoppe le loader quoi qu’il arrive
    }
  };  
  
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">Take an order</Typography>

      <Paper sx={{ mt: 3, p: 3 }}>
        <Tabs value={tab} onChange={(_, newTab) => setTab(newTab)} centered>
          <Tab label="Client" />
          <Tab label="Products" />
          <Tab label="Payment" />
        </Tabs>

        <Formik
          initialValues={initialFormValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, setFieldValue }) => (
            <Form>
              {/* 👤 Onglet Client */}
              {tab === 0 && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    label="Client Name"
                    name="customerName"
                    value={values.customerName}
                    onChange={handleChange}
                    fullWidth
                    error={!!(errors.customerName && touched.customerName)}
                    helperText={touched.customerName && errors.customerName}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Phone Number"
                    name="phoneNumber"
                    value={values.phoneNumber}
                    onChange={handleChange}
                    fullWidth
                    error={!!(errors.phoneNumber && touched.phoneNumber)}
                    helperText={touched.phoneNumber && errors.phoneNumber}
                    sx={{ mb: 2 }}
                  />
                  <FormLabel>Order Type</FormLabel>
                  <RadioGroup
                    row
                    name="orderType"
                    value={values.orderType}
                    onChange={handleChange}
                  >
                    <FormControlLabel
                      value={OrderType.PICKUP}
                      control={<Radio />}
                      label="Pickup"
                    />
                    <FormControlLabel
                      value={OrderType.DELIVERY}
                      control={<Radio />}
                      label="Delivery"
                    />
                  </RadioGroup>

                  {/* sans auto completion */}
                  {/* {values.orderType === OrderType.DELIVERY && (
                    <Box sx={{ mt: 2 }}>
                      {Object.keys(values.deliveryAddress).map((key) => (
                        <TextField
                          key={key}
                          label={key}
                          name={`deliveryAddress.${key}`}
                          value={(values.deliveryAddress as any)[key]}
                          onChange={handleChange}
                          fullWidth
                          error={!!(errors.deliveryAddress as any)?.[key]}
                          helperText={(errors.deliveryAddress as any)?.[key]}
                          sx={{ mb: 2 }}
                        />
                      ))}
                    </Box>
                  )} */}
                  {values.orderType === OrderType.DELIVERY && (
                    <Box sx={{ mt: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <NominatimAutocomplete
                            label="Street"
                            onSelect={(selected) => {
                              setFieldValue("deliveryAddress", {
                                ...values.deliveryAddress,
                                street: selected.street,
                                city: selected.city,
                                postalCode: selected.postalCode,
                                country: selected.country,
                                lat: selected.lat,
                                lng: selected.lng,
                              });
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Number"
                            name="deliveryAddress.streetNumber"
                            type="number"
                            value={values.deliveryAddress.streetNumber}
                            onChange={handleChange}
                            fullWidth
                            error={
                              !!(errors.deliveryAddress as any)?.streetNumber
                            }
                            helperText={
                              (errors.deliveryAddress as any)?.streetNumber
                            }
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="City"
                            name="deliveryAddress.city"
                            value={values.deliveryAddress.city}
                            onChange={handleChange}
                            fullWidth
                            error={!!(errors.deliveryAddress as any)?.city}
                            helperText={(errors.deliveryAddress as any)?.city}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Postal Code"
                            name="deliveryAddress.postalCode"
                            value={values.deliveryAddress.postalCode}
                            onChange={handleChange}
                            fullWidth
                            error={
                              !!(errors.deliveryAddress as any)?.postalCode
                            }
                            helperText={
                              (errors.deliveryAddress as any)?.postalCode
                            }
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}

              {/* 🛒 Onglet Produits */}
              {tab === 1 && (
                <Box sx={{ mt: 3, display: "flex", gap: 3 }}>
                  {/* 🎯 Produits */}
                  <Box sx={{ flex: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Category</InputLabel>
                          <Select
                            value={selectedCategory}
                            label="Category"
                            onChange={(e) => {
                              setSelectedCategory(e.target.value);
                              setPage(1);
                            }}
                          >
                            {categories.map((cat) => (
                              <MenuItem key={cat._id} value={cat._id}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          label="Search"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          fullWidth
                        />
                      </Grid>
                    </Grid>

                    {isLoading ? (
                      <Box textAlign="center" mt={4}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <Grid container spacing={2} mt={2}>
                        {paginatedProducts.map((product) => {
                          const selectedSize =
                            selectedSizes[product._id] ||
                            product.sizes?.[0]?.name ||
                            "";
                          const price =
                            product.productType === ProductType.MULTIPLE_SIZES
                              ? product.sizes?.find(
                                  (s) => s.name === selectedSize
                                )?.price ?? 0
                              : product.basePrice ?? 0;

                          return (
                            <Grid item xs={12} sm={6} md={4} key={product._id}>
                              <Paper
                                sx={{
                                  p: 2,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  height: "100%",
                                }}
                              >
                                <Typography fontWeight="bold">
                                  {product.name}
                                </Typography>
                                <Typography variant="body2">
                                  {product.description}
                                </Typography>

                                {product.productType ===
                                  ProductType.MULTIPLE_SIZES && (
                                  <FormControl
                                    fullWidth
                                    size="small"
                                    sx={{ mt: 1 }}
                                  >
                                    <Select
                                      value={selectedSize}
                                      onChange={(e) =>
                                        setSelectedSizes((prev) => ({
                                          ...prev,
                                          [product._id]: e.target.value,
                                        }))
                                      }
                                    >
                                      {product.sizes?.map((size) => (
                                        <MenuItem
                                          key={size.name}
                                          value={size.name}
                                        >
                                          {size.name} - {size.price} €
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                )}

                                <Button
                                  sx={{ mt: 2 }}
                                  variant="contained"
                                  onClick={() => {
                                    const newItem: CartItem = {
                                      productId: product._id,
                                      name:
                                        product.productType ===
                                        ProductType.MULTIPLE_SIZES
                                          ? `${product.name} (${selectedSize})`
                                          : product.name,
                                      price,
                                      quantity: 1,
                                      size:
                                        product.productType ===
                                        ProductType.MULTIPLE_SIZES
                                          ? selectedSize
                                          : undefined,
                                      category: product.category,
                                      image_url: product.image_url,
                                    };

                                    const existingIndex =
                                      values.orderItems.findIndex(
                                        (item) =>
                                          item.productId ===
                                            newItem.productId &&
                                          item.size === newItem.size
                                      );

                                    const updated = [...values.orderItems];
                                    if (existingIndex !== -1) {
                                      updated[existingIndex].quantity += 1;
                                    } else {
                                      updated.push(newItem);
                                    }

                                    setFieldValue("orderItems", updated);
                                  }}
                                >
                                  Add - {price} €
                                </Button>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}

                    {/* Pagination */}
                    <Box
                      sx={{
                        mt: 3,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Button
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        ⬅️
                      </Button>
                      <Typography>
                        Page {page} / {totalPages || 1}
                      </Typography>
                      <Button
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        ➡️
                      </Button>
                    </Box>
                  </Box>

                  {/* 🧺 Panier */}
                  <Box sx={{ flex: 1 }}>
                    <Paper
                      elevation={4}
                      sx={{ p: 2, position: "sticky", top: 100 }}
                    >
                      <Typography variant="h6">
                        <ShoppingCart sx={{ mr: 1 }} /> Selected Products
                      </Typography>
                      {values.orderItems.length === 0 ? (
                        <Typography>No products selected</Typography>
                      ) : (
                        <FieldArray name="orderItems">
                          {({ remove }) => (
                            <Box>
                              {values.orderItems.map((item, idx) => (
                                <Grid
                                  key={idx}
                                  container
                                  alignItems="center"
                                  spacing={1}
                                  sx={{ mb: 2 }}
                                >
                                  <Grid item xs={8}>
                                    <Typography>{item.name}</Typography>
                                    <Typography variant="caption">
                                      {item.price} € x {item.quantity}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={3}>
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const updated = [...values.orderItems];
                                        updated[idx].quantity = parseInt(
                                          e.target.value,
                                          10
                                        );
                                        setFieldValue("orderItems", updated);
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={1}>
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(idx)}
                                    >
                                      <Remove />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              ))}
                            </Box>
                          )}
                        </FieldArray>
                      )}
                    </Paper>
                  </Box>
                </Box>
              )}

              {/* 💰 Onglet Paiement */}
              {tab === 2 && (
                <Box sx={{ mt: 3 }}>
                  <FormLabel>Payment methode</FormLabel>
                  <RadioGroup
                    row
                    name="paymentMethod"
                    value={values.paymentMethod}
                    onChange={handleChange}
                  >
                    <FormControlLabel
                      value={PaymentMethod.CASH}
                      control={<Radio />}
                      label="Cash"
                    />
                    <FormControlLabel
                      value={PaymentMethod.CARD}
                      control={<Radio />}
                      label="Card"
                    />
                  </RadioGroup>

                  <FormLabel sx={{ mt: 2 }}>Paid ?</FormLabel>
                  <RadioGroup
                    row
                    name="paymentStatus"
                    value={values.paymentStatus}
                    onChange={handleChange}
                  >
                    <FormControlLabel
                      value={PaymentStatus.COMPLETED}
                      control={<Radio />}
                      label="Yes"
                    />
                    <FormControlLabel
                      value={PaymentStatus.PENDING}
                      control={<Radio />}
                      label="No"
                    />
                  </RadioGroup>

                  <Typography sx={{ mt: 3 }} variant="h6">
                    Total to pay : {calculateTotal(values.orderItems)} €
                  </Typography>

                  <Button
                    type="submit"
                    variant="contained"
                    color="success"
                    sx={{ mt: 3 }}
                    disabled={
                      isSubmitting || !values.customerName.trim() || !values.phoneNumber.trim() || values.orderItems.length === 0
                    }
                  >
                    {isSubmitting ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Confirm Order"
                    )}
                  </Button>
                </Box>
              )}
            </Form>
          )}
        </Formik>
      </Paper>

      <Snackbar
        open={!!alert}
        autoHideDuration={5000}
        onClose={() => setAlert(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={alert?.type}
          onClose={() => setAlert(null)}
          sx={{ width: "100%" }}
        >
          {alert?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TakeOrderPage;
