"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Stack,
  Divider,
} from "@mui/material";
import { Remove, ShoppingCart, ArrowBackIosNew } from "@mui/icons-material";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker }      from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns }      from '@mui/x-date-pickers/AdapterDateFns';
import { fetchProducts } from "@/store/slices/productSlice";
import { fetchCategories } from "@/store/slices/categorySlice";
import {
  createOrder,
  fetchOrder,
  updateOrder,
} from "@/store/slices/orderSlice";
import { fetchRestaurantInfo } from "@/store/slices/restaurantSlice";
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { useParams } from "next/navigation";

import { Order, OrderType, PaymentMethod, PaymentStatus } from "@/types/order";
import { Address } from "@/types/address";
import { CartItem } from "@/types/cartItem";
import { Product, ProductType } from "@/types/product";
import { Category } from "@/types/category";
import NominatimAutocomplete from "@/components/NominatimAutocomplete";
import { get } from "lodash";
import GeoapifyAutocomplete from "@/components/GeoapifyAutocomplete";
import { OrderItem } from "@/types/orderItem";
import { isSameDay } from "date-fns";
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";

// 🎯 Type uniquement pour les valeurs du formulaire
type OrderFormValues = {
  customerName: string;
  phoneNumber: string;
  orderType: OrderType;
  deliveryAddress: Partial<Address>;
  orderItems: OrderItem[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  scheduledFor?: string | null;
};

// ✅ Validation Yup
const validationSchema = Yup.object().shape({
  customerName: Yup.string().required("Customer Name is Required"),
  phoneNumber: Yup.string().required("Phone Number is Required"),
  orderType: Yup.mixed<OrderType>().oneOf(Object.values(OrderType)).required(),
  deliveryAddress: Yup.object().when("orderType", {
    is: OrderType.DELIVERY,
    then: (schema) =>
      schema.shape({
        street: Yup.string().required("Street is Required"),
        streetNumber: Yup.string().required("Street Number is Required"),
        city: Yup.string().required("City is Required"),
        postalCode: Yup.string().required("Postal Code is Required"),
        // country: Yup.string().required("Required"),
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
  scheduledFor: Yup.string()
    .nullable()
    .test(
      'scheduledFor-required-if-filled',
      'Scheduled date/time is required if set',
      function (value) {
        // Autorise null ou string non vide (pour DELIVERY ou PICKUP)
        if (value === null || value === undefined || value === '') return true;
        // Vérifie que c'est une date valide (format datetime-local)
        return !isNaN(Date.parse(value));
      }
    ),
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
  scheduledFor: null,
};

const TakeOrderPage: React.FC = () => {
  const { orderId } = useParams() as { orderId: string };
  const isCreateMode = orderId === "new";

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const dispatch = useAppDispatch();
  const {
    deliveryFee,
    loading: feeLoading,
    error,
  } = useAppSelector((state) => state.restaurant);
  const products = useAppSelector((state) => state.products.items) as Product[];
  const categories = useAppSelector(
    (state) => state.categories.items
  ) as Category[];
  const isLoading = useAppSelector((state) => state.products.loading);
  const order = useAppSelector((state) => state.orders.order) as Order;

  // const [formValues, setFormValues] = useState(initialFormValues);
  const [tab, setTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const productsPerPage = 6;

  const getInitialFormValues = (): OrderFormValues => {
    if (!isCreateMode && order) {
      return {
        customerName: order.customer.name || "",
        phoneNumber: order.customer.phone || "",
        orderType: order.orderType,
        deliveryAddress: {
          street: order.deliveryAddress?.street || "",
          streetNumber: order.deliveryAddress?.streetNumber || 0,
          city: order.deliveryAddress?.city || "",
          postalCode: order.deliveryAddress?.postalCode || "",
          country: order.deliveryAddress?.country || "",
          lat: order.deliveryAddress?.lat,
          lng: order.deliveryAddress?.lng,
        },
        orderItems: order.items || [],
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        scheduledFor: order.scheduledFor
          ? new Date(order.scheduledFor).toLocaleString('sv-SE', { hour12: false }).replace(' ', 'T').slice(0, 16)
          : null,
      };
    }
    return initialFormValues;
  };

  // récupère l’info restaurant
  useEffect(() => {
    dispatch(fetchRestaurantInfo());
  }, [dispatch]);

  // Charge une commande si l'ID est présent dans l'URL
  useEffect(() => {
    if (!isCreateMode && orderId) {
      dispatch(fetchOrder(orderId));
    }
  }, [dispatch, orderId, isCreateMode]);

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

  const calculateTotal = (items: OrderItem[], orderType: OrderType) =>
    items
      .reduce(
        (sum, item) => sum + item.price * item.quantity,
        orderType === OrderType.DELIVERY ? deliveryFee ?? 0 : 0
      )
      .toFixed(2);

  const handleSubmit = async (values: OrderFormValues, { resetForm }: any) => {
    setIsSubmitting(true); // ⏳ Démarre le loader
    try {
      const payload: Partial<Order> = {
        customer: {
          name: values.customerName,
          phone: values.phoneNumber,
        },
        items: values.orderItems,
        totalAmount: values.orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
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
        scheduledFor:
          values.scheduledFor //&& isCreateMode
            ? values.scheduledFor // string locale du champ input (YYYY-MM-DDTHH:mm)
            : undefined,
      };

      let result;
      if (isCreateMode) {
        result = await dispatch(createOrder(payload) as any);
      } else {
        result = await dispatch(updateOrder({ orderId, orderData: payload }) as any);
        await dispatch(fetchOrder(orderId) as any);
      }      
      // Simplified error extraction
      const getErrorMessage = (res: any) => {
        return (
          res?.error?.data?.message ||
          res?.payload?.message ||
          (typeof res?.error === 'string' && res.error !== 'rejected' && res.error) ||
          (typeof res?.payload === 'string' && res.payload !== 'rejected' && res.payload) ||
          res?.error?.message ||
          res?.error?.statusText ||
          res?.error?.status ||
          res?.meta?.rejectedWithValue ||
          null
        );
      };
      const errorMsg = getErrorMessage(result);
      if (result?.error || result?.payload?.message) {
        setAlert({ type: "error", message: errorMsg || '❌ An error occurred.' });
        return;
      }

      setAlert({
        type: "success",
        message: isCreateMode
          ? "Order taked successfully!"
          : "Order updated successfully!",
      });
      resetForm();
      setTab(0);
    } catch (err: any) {
      // Fallback for unexpected errors
      let errorMsg = err?.response?.data?.message || err?.message || '❌ An error occurred.';
      setAlert({ type: "error", message: errorMsg });
    } finally {
      setIsSubmitting(false); // ✅ Stoppe le loader quoi qu’il arrive
    }
  };

  //  Fonction de retour en arrière
  const handleBack = () => {
    if (from) {
      // si on a un param ?from=…
      router.push(from);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      // sinon on revient d’où on vient
      router.back();
    } else {
      // fallback
      router.push("/view-orders");
    }
  };

  return (
    <ProtectRoute allowedRoles={[Role.Employee, Role.Admin]}>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIosNew />
          </IconButton>
          <Typography variant="h4" sx={{ ml: 1 }}>
            {isCreateMode ? "Take an order" : "Order details"}
          </Typography>
        </Box>
        <Paper sx={{ mt: 3, p: 3 }}>
          <Tabs value={tab} onChange={(_, newTab) => setTab(newTab)} centered>
            <Tab label="Client" />
            <Tab label="Products" />
            <Tab label="Payment" />
          </Tabs>

          {!isCreateMode && !order ? (
            <Box sx={{ p: 4 }}>
              <Typography>Loading order details...</Typography>
              <CircularProgress />
            </Box>
          ) : (
            <Formik
              key={orderId} // 🔑 Force un nouveau Formik à chaque changement d'ID
              initialValues={getInitialFormValues()}
              enableReinitialize
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, setFieldValue }) => (
                <Form>                   
                  {Object.keys(errors).length > 0 && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {Object.entries(errors).map(([field, message]) => (
                              <li key={field}>
                              {typeof message === "object" ? (
                                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {Object.entries(message).map(([subField, subMessage]) => (
                                      <li key={subField}>
                                          <strong>{subMessage}</strong>
                                      </li>
                                  ))}
                                  </ul>
                              ) : (
                                  <strong>{message}</strong>
                              )}
                              </li>
                          ))}
                          </ul>
                      </Alert>
                  )}
                  {/* 👤 Onglet Client */}
                  {tab === 0 && (
                    <Box sx={{ mt: 3 }}>
                      <TextField
                        label="Client Name"
                        name="customerName"
                        value={values.customerName || ""}
                        onChange={handleChange}
                        fullWidth
                        error={!!(errors.customerName && touched.customerName)}
                        helperText={touched.customerName && errors.customerName}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        label="Phone Number"
                        name="phoneNumber"
                        type="tel"
                        value={values.phoneNumber || ""}
                        onChange={handleChange}
                        fullWidth
                        error={!!(errors.phoneNumber && touched.phoneNumber)}
                        helperText={touched.phoneNumber && errors.phoneNumber}
                        sx={{ mb: 2 }}
                      />
                        <TextField
                          label="Scheduled for"
                          name="scheduledFor"
                          type="datetime-local"
                          value={values.scheduledFor || ""}
                          onChange={handleChange}
                          fullWidth
                          error={!!(errors.scheduledFor && touched.scheduledFor)}
                          helperText={touched.scheduledFor && errors.scheduledFor}
                          sx={{ mt: 2, mb: 2 }}
                          InputLabelProps={{ shrink: true }}
                          inputProps={{ min: new Date().toISOString().substring(0, 16) }}
                        />
                      {/* <LocalizationProvider dateAdapter={AdapterDateFns}>
  <DateTimePicker
    label="Scheduled for"
    value={values.scheduledFor ? new Date(values.scheduledFor) : null}
    onChange={newValue => {
      if (newValue) {
        const iso = newValue.toISOString().substring(0, 16);
        setFieldValue('scheduledFor', iso);
      } else {
        setFieldValue('scheduledFor', null);
      }
    }}
    disablePast
    minDateTime={new Date()}
    shouldDisableDate={date => date < new Date(new Date().setHours(0,0,0,0))}
    shouldDisableTime={(timeValue, viewType) => {
      const now = new Date();
      if (values.scheduledFor) {
        const pickerDate = new Date(values.scheduledFor);
        if (isSameDay(pickerDate, now)) {
          if (viewType === 'hours') {
            return timeValue.getHours() < now.getHours();
          }
          if (viewType === 'minutes') {
            return (
              pickerDate.getHours() === now.getHours() &&
              timeValue.getMinutes() < now.getMinutes()
            );
          }
        }
      }
      return false;
    }}
    skipDisabled
    slotProps={{
      day: {
        sx: {
          '&.Mui-disabled': {
            display: 'none',
          },
        },
      },
      digitalClockItem: {
        sx: {
          '&.Mui-disabled': {
            display: 'none',
          },
        },
      },
      textField: {
        fullWidth: true,
        error: !!(errors.scheduledFor && touched.scheduledFor),
        helperText: touched.scheduledFor && errors.scheduledFor,
        sx: { mt: 2, mb: 2 },
      },
    }}
  />
</LocalizationProvider> */}


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
                              <GeoapifyAutocomplete
                                value={values.deliveryAddress.street || ""}
                                onSelect={(
                                  address,
                                  city,
                                  postalCode,
                                  lat,
                                  lng,
                                  country
                                ) => {
                                  setFieldValue("deliveryAddress", {
                                    ...values.deliveryAddress,
                                    street: address,
                                    city: city,
                                    postalCode: postalCode,
                                    country: country,
                                    lat: lat,
                                    lng: lng,
                                  });
                                }}
                                error={!!(errors.deliveryAddress as any)?.street}
                                helperText={
                                  (errors.deliveryAddress as any)?.street
                                }
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                label="Number"
                                name="deliveryAddress.streetNumber"
                                type="number"
                                value={values.deliveryAddress.streetNumber || ""}
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
                                value={values.deliveryAddress.city || ""}
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
                                value={values.deliveryAddress.postalCode || ""}
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
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  md={4}
                                  key={product._id}
                                >
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
                                        const newItem: OrderItem = {
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
                                          category: {
                                            _id: product.category._id,
                                            name: product.category.name,
                                            idx: product.category.idx,
                                          },
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
                                            const updated = [
                                              ...values.orderItems,
                                            ];
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
                    <Paper elevation={2} sx={{ mt: 3, p: 3 }}>
                      <Grid container spacing={4}>
                        {/* Colonne Paiement */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <FormControl component="fieldset">
                              <FormLabel component="legend">
                                Payment Method
                              </FormLabel>
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
                            </FormControl>

                            <FormControl component="fieldset">
                              <FormLabel component="legend">Paid?</FormLabel>
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
                            </FormControl>
                          </Stack>
                        </Grid>

                        {/* Colonne Récapitulatif */}
                        <Grid item xs={12} md={6}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1">
                              Order Summary
                            </Typography>
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                              <Typography>Sub-total</Typography>
                              <Typography>
                                {values.orderItems
                                  .reduce(
                                    (sum, item) =>
                                      sum + item.price * item.quantity,
                                    0
                                  )
                                  .toFixed(2)}{" "}
                                €
                              </Typography>
                            </Stack>
                            {values.orderType === OrderType.DELIVERY && (
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Typography>Delivery Fee</Typography>
                                <Typography>
                                  {(deliveryFee ?? 0).toFixed(2)} €
                                </Typography>
                              </Stack>
                            )}
                            <Divider />
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="h6">Total to Pay</Typography>
                              <Typography variant="h6">
                                {calculateTotal(
                                  values.orderItems,
                                  values.orderType
                                )}{" "}
                                €
                              </Typography>
                            </Stack>
                          </Stack>
                        </Grid>
                      </Grid>

                      {/* Bouton de validation centré */}
                      <Box textAlign="center" mt={4}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="success"
                          disabled={
                            isSubmitting ||
                            !values.customerName ||
                            !values.phoneNumber ||
                            values.orderItems.length === 0 ||
                            (values.orderType === OrderType.DELIVERY &&
                              feeLoading)
                          }
                          startIcon={
                            isSubmitting ? <CircularProgress size={20} /> : null
                          }
                        >
                          {isCreateMode ? "Confirm Order" : "Update Order"}
                        </Button>
                      </Box>
                    </Paper>
                  )}
                </Form>
              )}
            </Formik>
          )}
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
    </ProtectRoute>
  );
};

export default TakeOrderPage;
