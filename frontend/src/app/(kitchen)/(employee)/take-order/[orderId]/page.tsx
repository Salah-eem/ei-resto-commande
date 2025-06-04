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
import { Product, ProductType } from "@/types/product";
import { Category } from "@/types/category";
import GeoapifyAutocomplete from "@/components/GeoapifyAutocomplete";
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";
import IngredientDialog from "@/components/IngredientDialog";
import { Ingredient } from "@/types/ingredient";
import { OrderItem } from "@/types/orderItem";
import { fetchIngredients } from "@/store/slices/ingredientSlice";

// 🎯 Type pour les valeurs du formulaire
type OrderFormValues = {
  customerName: string;
  phoneNumber: string;
  orderType: OrderType;
  deliveryAddress: Partial<Address>;
  orderItems: Array<
    OrderItem & {
      baseIngredients: Ingredient[];
      removedBaseIds: string[];
      extraIngredientIds: string[];
    }
  >;
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
        streetNumber: Yup.number().required("Street Number is Required"),
        city: Yup.string().required("City is Required"),
        postalCode: Yup.string().required("Postal Code is Required"),
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
        baseIngredients: Yup.array().of(
          Yup.object().shape({
            _id: Yup.string().required(),
            name: Yup.string().required(),
            price: Yup.number().required(),
          })
        ),
        removedBaseIds: Yup.array().of(Yup.string()),
        extraIngredientIds: Yup.array().of(Yup.string()),
      })
    )
    .min(1, "Add at least one product"),
  paymentMethod: Yup.mixed<PaymentMethod>()
    .oneOf(Object.values(PaymentMethod))
    .required(),
  scheduledFor: Yup.string()
    .nullable()
    .test(
      "scheduledFor-required-if-filled",
      "Scheduled date/time is required if set",
      function (value) {
        if (value === null || value === undefined || value === "") return true;
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
  const { deliveryFee, loading: feeLoading } = useAppSelector(
    (state) => state.restaurant
  );
  const products = useAppSelector((state) => state.products.items) as Product[];
  const categories = useAppSelector(
    (state) => state.categories.items
  ) as Category[];
  const isLoadingProducts = useAppSelector((state) => state.products.loading);
  const order = useAppSelector((state) => state.orders.order) as Order;

  // États pour pagination, filtres, etc.
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

  // États pour le dialog d'ingrédients
  const [openDialogForIndex, setOpenDialogForIndex] = useState<number | null>(
    null
  );
  const [dialogRemovedBaseIds, setDialogRemovedBaseIds] = useState<string[]>(
    []
  );
  const [dialogExtraIds, setDialogExtraIds] = useState<string[]>([]);

  // all ingredients global (pour priceCalculator et pour afficher tout)
  const allIngredients = useAppSelector(
    (state) => state.ingredients.items
  ) as Ingredient[];

  // Récupère l’info restaurant
  useEffect(() => {
    dispatch(fetchRestaurantInfo());
  }, [dispatch]);

  // Charge une commande si on est en mode édition
  useEffect(() => {
    if (!isCreateMode && orderId) {
      dispatch(fetchOrder(orderId));
    }
  }, [dispatch, orderId, isCreateMode]);

  // Charge produits et catégories
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
    dispatch(fetchIngredients());
  }, [dispatch]);

  // Initialise la première catégorie par défaut
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]._id);
    }
  }, [categories]);

  // Valeurs initiales dynamiques (édition ou création)
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
        orderItems: order.items.map((oi) => ({
          productId: oi.productId,
          name: oi.name,
          price: oi.price,
          quantity: oi.quantity,
          size: oi.size,
          category: oi.category,
          image_url: oi.image_url,
          // on récupère la liste des ingrédients de base venant du backend
          baseIngredients: (oi.baseIngredients || []).map((b: any) => ({
            _id: b._id,
            ingredient: {
              _id: b._id,
              name: b.name,
              price: b.price,
              stock: b.stock ?? 0,
            },
            quantity: b.quantity ?? 1,
          })),
          removedBaseIds: (oi.baseIngredients || [])
            .filter(base => {
              const ingQty = (oi.ingredients || []).find(i => i._id === base._id)?.quantity || 0;
              const baseQty = base.quantity || 1;
              return ingQty < baseQty;
            })
            .map((ing) => ing._id),
          extraIngredientIds: (() => {
            const ingredientCounts: Record<string, number> = {};
            (oi.ingredients || []).forEach((ing) => {
              ingredientCounts[ing._id] = (ingredientCounts[ing._id] || 0) + (ing.quantity || 1);
            });
            (oi.baseIngredients || []).forEach((b) => {
              ingredientCounts[b._id] = (ingredientCounts[b._id] || 0) - (b.quantity || 1);
            });
            return Object.entries(ingredientCounts)
              .filter(([_, qty]) => qty > 0)
              .flatMap(([id, qty]) => Array(qty).fill(id));
          })(),
          ingredients: oi.ingredients,
        })),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        scheduledFor: order.scheduledFor
          ? new Date(order.scheduledFor).toISOString().substring(0, 16)
          : null,
      };
    }
    return initialFormValues;
  };

  // Filtrage & pagination des produits
  const filteredProducts = products
    .filter((p) => p.category._id === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * productsPerPage,
    page * productsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Calcul du total (incluant hypothétique deliveryFee)
 const calculateTotal = (
  items: OrderFormValues["orderItems"],
  orderType: OrderType
) =>
  (
    items.reduce((sum, item) => {
      // 1) on calcule le coût des extras pour 1 unité
      const extrasCost = item.extraIngredientIds.reduce((acc, id) => {
        const ing = allIngredients.find((i) => i._id === id);
        return acc + (ing?.price ?? 0);
      }, 0);

      // 2) on calcule le coût unitaire (prix de base + extras)
      const unitTotal = item.price + extrasCost;

      // 3) on multiplie par la quantité
      return sum + unitTotal * item.quantity;
    }, 0) + (orderType === OrderType.DELIVERY ? deliveryFee ?? 0 : 0)
  ).toFixed(2);


  // Soumission du formulaire
  const handleSubmit = async (values: OrderFormValues, { resetForm }: any) => {
    setIsSubmitting(true);
    try {
      // Prépare le payload en transformant nos champs en ce que le backend attend
      const payload: Partial<Order> = {
        customer: {
          name: values.customerName,
          phone: values.phoneNumber,
        },
        items: values.orderItems.map((item) => {
          // 1) Construire un map { [ingId]: quantité_totale }
          const ingredientCountMap: Record<string, number> = {};

          // – On ajoute chaque base non retirée
          item.baseIngredients
            .filter((b) => !item.removedBaseIds.includes(b._id))
            .forEach((b) => {
              ingredientCountMap[b._id] = (ingredientCountMap[b._id] || 0) + 1;
            });

          // – On ajoute chaque extra sélectionné
          item.extraIngredientIds.forEach((id) => {
            ingredientCountMap[id] = (ingredientCountMap[id] || 0) + 1;
          });

          // 2) Transformer le map en tableau [{ _id, quantity }, …]
          const mergedIngredients = Object.entries(ingredientCountMap).map(
            ([id, qty]) => ({
              _id: id,
              quantity: qty,
            })
          );

          // 3) Envoyer ce tableau dans le champ que le backend attend
          return {
            productId: item.productId,
            name: item.name,
            price: item.price,      
            quantity: item.quantity,
            size: item.size,
            category: item.category,
            image_url: item.image_url,
            baseIngredients: item.baseIngredients,
            ingredients: mergedIngredients,
          };
        }),
        totalAmount: parseFloat(
          calculateTotal(values.orderItems, values.orderType)
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
        scheduledFor: values.scheduledFor || undefined,
      };

      let result;
      if (isCreateMode) {
        result = await dispatch(createOrder(payload) as any);
      } else {
        result = await dispatch(
          updateOrder({ orderId, orderData: payload }) as any
        );
        await dispatch(fetchOrder(orderId) as any);
      }

      // Gestion simple des erreurs
      const getErrorMessage = (res: any) => {
        return (
          res?.error?.data?.message ||
          res?.payload?.message ||
          (typeof res?.error === "string" &&
            res.error !== "rejected" &&
            res.error) ||
          (typeof res?.payload === "string" &&
            res.payload !== "rejected" &&
            res.payload) ||
          res?.error?.message ||
          res?.error?.statusText ||
          res?.error?.status ||
          res?.meta?.rejectedWithValue ||
          null
        );
      };
      const errorMsg = getErrorMessage(result);
      if (result?.error || result?.payload?.message) {
        setAlert({
          type: "error",
          message: errorMsg || "❌ An error occurred.",
        });
        return;
      }

      setAlert({
        type: "success",
        message: isCreateMode
          ? "Order taken successfully!"
          : "Order updated successfully!",
      });
      resetForm();
      setTab(0);
    } catch (err: any) {
      let errorMsg =
        err?.response?.data?.message || err?.message || "❌ An error occurred.";
      setAlert({ type: "error", message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction Retour
  const handleBack = () => {
    if (from) {
      router.push(from);
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
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
            {isCreateMode ? "Take an Order" : "Order Details"}
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
              key={orderId}
              initialValues={getInitialFormValues()}
              enableReinitialize
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, setFieldValue }) => (
                <Form>
                  {/* Affichage des erreurs globales */}
                  {Object.keys(errors).length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {Object.entries(errors).map(([field, message]: any) => (
                          <li key={field}>
                            {typeof message === "object" ? (
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {Object.entries(message).map(
                                  ([subField, subMessage]) => (
                                    <li key={subField}>
                                      <strong>{subMessage as string}</strong>
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <strong>{message as string}</strong>
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
                        inputProps={{
                          min: new Date().toISOString().substring(0, 16),
                        }}
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
                                    city,
                                    postalCode,
                                    country,
                                    lat,
                                    lng,
                                  });
                                }}
                                error={
                                  !!(errors.deliveryAddress as any)?.street
                                }
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
                                value={
                                  values.deliveryAddress.streetNumber || ""
                                }
                                onChange={handleChange}
                                fullWidth
                                error={
                                  !!(errors.deliveryAddress as any)
                                    ?.streetNumber
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
                                helperText={
                                  (errors.deliveryAddress as any)?.city
                                }
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
                      {/* Liste des produits à ajouter */}
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

                        {isLoadingProducts ? (
                          <Box textAlign="center" mt={4}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} mt={2}>
                            {paginatedProducts.map((product) => {
                              const selectedSize =
                                selectedSizes[product._id] ||
                                (product.sizes?.[0]?.name ?? "");
                              const price =
                                product.productType ===
                                ProductType.MULTIPLE_SIZES
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
                                        // À chaque ajout, on initialise removedBaseIds et extraIngredientIds à vide
                                        const newItem: OrderItem & {
                                          baseIngredients: Ingredient[];
                                          removedBaseIds: string[];
                                          extraIngredientIds: string[];
                                        } = {
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
                                          // on initialise la liste des bases tirée du produit
                                          baseIngredients: (
                                            product.ingredients || []
                                          ).map((ing) => ({
                                            _id: ing._id,
                                            name: ing.name,
                                            price: ing.price,
                                            stock: ing.stock ?? 0,
                                            quantity: 1,
                                          })),
                                          removedBaseIds: [],
                                          extraIngredientIds: [],
                                        };

                                        const existingIndex = values.orderItems.findIndex((item) => 
                                          item.productId === newItem.productId &&
                                          item.size === newItem.size &&
                                          item.removedBaseIds.length === 0 &&
                                          item.extraIngredientIds.length === 0
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
                                    <Box
                                      key={idx}
                                      sx={{
                                        mb: 2,
                                        p: 2,
                                        border: "1px solid #ddd",
                                        borderRadius: 1,
                                      }}
                                    >
                                      <Grid
                                        container
                                        alignItems="center"
                                        spacing={1}
                                      >
                                        <Grid item xs={8}>
                                          <Typography>{item.name}</Typography>
                                          {/* Calculer le coût des extras */}
                                          {(() => {
                                            const extrasCost = item.extraIngredientIds.reduce((acc, id) => {
                                              const ing = allIngredients.find((i) => i._id === id);
                                              return acc + (ing?.price ?? 0);
                                            }, 0);
                                            const unitPrice = item.price + extrasCost;
                                            return (
                                              <Typography variant="caption">
                                                {unitPrice.toFixed(2)} € × {item.quantity}
                                              </Typography>
                                            );
                                          })()}

                                          {/* Affichage des modifications déjà enregistrées */}
                                          <Box sx={{ mt: 0.5, pl: 1 }}>
                                            {item.removedBaseIds.length > 0 && (
                                              <Typography variant="caption" color="error">
                                                No{" "}
                                                {item.baseIngredients
                                                  .filter((b) => item.removedBaseIds.includes(b._id))
                                                  .map((b) => {
                                                    // Supporte Ingredient ou IngredientWithQuantity
                                                    const name = b.name || (b.ingredient && b.ingredient.name) || b._id;
                                                    return name;
                                                  })
                                                  .join(", ")}
                                              </Typography>
                                            )}
                                            {item.extraIngredientIds.length > 0 && (
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  color: "green",
                                                  display: "block",
                                                  mt: 0.3,
                                                }}
                                              >
                                                With{" "}
                                                {(() => {
                                                  const counts = item.extraIngredientIds.reduce(
                                                    (acc: Record<string, number>, id) => {
                                                      acc[id] = (acc[id] || 0) + 1;
                                                      return acc;
                                                    },
                                                    {}
                                                  );
                                                  const parts = Object.entries(counts).map(([id, qty]) => {
                                                    const ing = allIngredients.find((i) => i._id === id);
                                                    const name = ing ? ing.name : id;
                                                    if (qty === 1) return `extra ${name}`;
                                                    if (qty === 2) return `double ${name}`;
                                                    return `${qty}× ${name}`;
                                                  });
                                                  return parts.join(" and ");
                                                })()}
                                              </Typography>
                                            )}
                                          </Box>
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
                                              setFieldValue(
                                                "orderItems",
                                                updated
                                              );
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

                                      {/* Bouton « Edit Ingredients » */}
                                      <Box sx={{ mt: 1 }}>
                                        <Button
                                          size="small"
                                          onClick={() => {
                                            // Initialise les states du dialog
                                            setDialogRemovedBaseIds([
                                              ...item.removedBaseIds,
                                            ]);
                                            setDialogExtraIds([
                                              ...item.extraIngredientIds,
                                            ]);
                                            setOpenDialogForIndex(idx);
                                          }}
                                        >
                                          Edit Ingredients
                                        </Button>
                                      </Box>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                            </FieldArray>
                          )}

                          {/* IngredientDialog sans modification du composant */}
                          {openDialogForIndex !== null && (
                            <IngredientDialog
                              open={true}
                              onClose={() => setOpenDialogForIndex(null)}
                              onBack={() => setOpenDialogForIndex(null)}
                              allIngredients={allIngredients}
                              // pour que IngredientDialog considère ces IDs comme "de base"
                              product={
                                {
                                  _id: values.orderItems[openDialogForIndex]
                                    .productId,
                                  name: values.orderItems[openDialogForIndex]
                                    .name,
                                  ingredients: values.orderItems[
                                    openDialogForIndex
                                  ].baseIngredients.map((b: any) => ({
                                    _id: b._id,
                                    name: b.name,
                                    price: b.price,
                                  })),
                                } as Product
                              }
                              // crossedOut doit être un objet { [id]: true } pour chaque base barrée
                              crossedOut={dialogRemovedBaseIds.reduce(
                                (acc, id) => {
                                  acc[id] = true;
                                  return acc;
                                },
                                {} as Record<string, boolean>
                              )}
                              // setCrossedOut doit gérer un updater fonctionnel
                              setCrossedOut={(newMapOrUpdater) => {
                                setDialogRemovedBaseIds((prevIds) => {
                                  // construit l'ancien map à partir de prevIds
                                  const prevMap = prevIds.reduce((acc, id) => {
                                    acc[id] = true;
                                    return acc;
                                  }, {} as Record<string, boolean>);
                                  // si newMapOrUpdater est une fonction, on l'appelle
                                  const newMap =
                                    typeof newMapOrUpdater === "function"
                                      ? newMapOrUpdater(prevMap)
                                      : newMapOrUpdater;
                                  // on extrait uniquement les clés dont la valeur est true
                                  return Object.entries(newMap)
                                    .filter(([, v]) => v)
                                    .map(([id]) => id);
                                });
                              }}
                              // selectedExtras / setSelectedExtras gère directement la liste des IDs d'extras
                              selectedExtras={[...dialogExtraIds]}
                              setSelectedExtras={(ids) =>
                                setDialogExtraIds([...ids])
                              }
                              sizeLabel={
                                values.orderItems[openDialogForIndex].size
                              }
                              priceCalculator={(selected) =>
                                selected.reduce((sum, id) => {
                                  const ing = allIngredients.find(
                                    (i) => i._id === id
                                  );
                                  return sum + (ing?.price ?? 0);
                                }, 0)
                              }
                              onSave={() => {
                                // Au clic sur Save, on réinjecte dans Formik
                                const updatedItems = [...values.orderItems];
                                updatedItems[openDialogForIndex] = {
                                  ...updatedItems[openDialogForIndex],
                                  removedBaseIds: [...dialogRemovedBaseIds],
                                  extraIngredientIds: [...dialogExtraIds],
                                };
                                setFieldValue("orderItems", updatedItems);
                                setOpenDialogForIndex(null);
                              }}
                            />
                          )}
                        </Paper>
                      </Box>
                    </Box>
                  )}

                  {/* 💰 Onglet Paiement */}
                  {tab === 2 && (
                    <Paper elevation={2} sx={{ mt: 3, p: 3 }}>
                      <Grid container spacing={4}>
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

                        <Grid item xs={12} md={6}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle1">
                              Order Summary
                            </Typography>
                            <Divider />
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                            >
                              <Typography>Sub-total</Typography>
                              <Typography>
                                {values.orderItems
                                  .reduce((sum, item) => {
                                    // calcul du coût des extras pour 1 unité
                                    const extrasCost = item.extraIngredientIds.reduce((acc, id) => {
                                      const ing = allIngredients.find((i) => i._id === id);
                                      return acc + (ing?.price ?? 0);
                                    }, 0);

                                    // coût unitaire total (base + extras)
                                    const unitTotal = item.price + extrasCost;

                                    // on ajoute unitTotal × quantité
                                    return sum + unitTotal * item.quantity;
                                  }, 0)
                                  .toFixed(2)} €
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
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                            >
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
