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
import {
  Remove as RemoveIcon,
  ShoppingCart,
  ArrowBackIosNew,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";
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
import { IngredientWithQuantity } from "@/types/cartItem";

type OrderItemForm = {
  _id?: string; // pour l'édition
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  category: Category;
  image_url?: string;

  // on veut CE QUI VEUT le formulaire
  baseIngredients: IngredientWithQuantity[]; // <-- quantité + ingrédient
  removedBaseIds: string[];
  extraIngredientIds: string[];
  ingredients: IngredientWithQuantity[];
};

// 🎯 Type pour les valeurs du formulaire
type OrderFormValues = {
  customerName: string;
  phoneNumber: string;
  orderType: OrderType;
  deliveryAddress: Partial<Address>;
  orderItems: OrderItemForm[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  scheduledFor?: string | null;
};

// ✅ Validation Yup
const validationSchema = Yup.object().shape({
  customerName: Yup.string().required("Customer Name is Required").min(3, "Name must be at least 3 characters"),
  phoneNumber: Yup.string()
    .required("Phone Number is Required")
    .test("phone-validation", "Please enter a valid phone number", (value) => {
      if (!value) return false;
      try {
        // Essayer d'abord avec le code pays belge par défaut
        return isValidPhoneNumber(value, "BE");
      } catch {
        // Si ça échoue, essayer sans code pays spécifique
        try {
          return isValidPhoneNumber(value);
        } catch {
          return false;
        }
      }
    }),
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
        /*baseIngredients: Yup.array().of(
          Yup.object().shape({
            _id: Yup.string().required(),
            name: Yup.string().required(),
            price: Yup.number().required(),
          })
        ),*/
        removedBaseIds: Yup.array().of(Yup.string()),
        extraIngredientIds: Yup.array().of(Yup.string()),
      })
    )
    .min(1, "Add at least one product"),
  paymentMethod: Yup.mixed<PaymentMethod>()
    .oneOf(Object.values(PaymentMethod))
    .required(),  scheduledFor: Yup.string()
    .nullable()
    .test(
      "scheduledFor-validation",
      "Scheduled date/time must be at least 10 minutes in the future",
      function (value) {
        if (value === null || value === undefined || value === "") return true;
        
        const selectedDate = new Date(value);
        const now = new Date();
        const minDate = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes dans le futur
        
        // Vérifier si la date est valide
        if (isNaN(selectedDate.getTime())) {
          return false;
        }
        
        // Vérifier si la date est dans le futur (au moins 10 minutes)
        return selectedDate >= minDate;
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
  } | null>(null);  const [previousOrderItems, setPreviousOrderItems] = useState<OrderItemForm[]>(
    []
  );
  // État pour la date/heure minimum (mise à jour en temps réel)
  const [minDateTime, setMinDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10); // 10 minutes dans le futur
    return now.toISOString().substring(0, 16);
  });

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

  // Met à jour la date/heure minimum toutes les minutes
  useEffect(() => {
    const updateMinDateTime = () => {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 10); // 10 minutes dans le futur
      setMinDateTime(now.toISOString().substring(0, 16));
    };

    // Mettre à jour immédiatement
    updateMinDateTime();

    // Puis mettre à jour toutes les minutes
    const interval = setInterval(updateMinDateTime, 60000); // 60 secondes

    return () => clearInterval(interval);
  }, []);

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
        orderItems: order.items.map((oi) => {
          // Ici, oi.baseIngredients est déjà de type IngredientWithQuantity[]
          const baseIng: IngredientWithQuantity[] = Array.isArray(
            oi.baseIngredients
          )
            ? (oi.baseIngredients as any[]).map((b: any) => ({
                _id: b._id,
                ingredient: {
                  _id: b._id,
                  name: b.name,
                  price: b.price,
                  stock: b.stock ?? 0,
                },
                quantity: b.quantity ?? 1,
              }))
            : [];

          // oi.ingredients est déjà de type IngredientWithQuantity[]
          const allIng: IngredientWithQuantity[] = Array.isArray(oi.ingredients)
            ? (oi.ingredients as any[]).map((e: any) => ({
                _id: e._id,
                ingredient: {
                  _id: e._id,
                  name: e.name,
                  price: e.price,
                  stock: e.stock ?? 0,
                },
                quantity: e.quantity ?? 1,
              }))
            : [];

          // removedBaseIds : ceux dont la qty envoyée < qty de base
          const removedBaseIds: string[] = baseIng
            .filter((b) => {
              const ingInItem = allIng.find((i) => i._id === b._id);
              const ingQty = ingInItem?.quantity ?? 0;
              const baseQty = b.quantity;
              return ingQty < baseQty;
            })
            .map((b) => b._id);

          // extraIngredientIds : quantité supplémentaire au-delà de la base
          const ingredientCounts: Record<string, number> = {};
          allIng.forEach((i) => {
            ingredientCounts[i._id] =
              (ingredientCounts[i._id] || 0) + i.quantity;
          });
          baseIng.forEach((b) => {
            ingredientCounts[b._id] =
              (ingredientCounts[b._id] || 0) - b.quantity;
          });
          const extraIngredientIds: string[] = Object.entries(ingredientCounts)
            .filter(([_, qty]) => qty > 0)
            .flatMap(([id, qty]) => Array(qty).fill(id));

          return {
            _id: oi._id,
            productId: oi.productId,
            name: oi.name,
            price: oi.price,
            quantity: oi.quantity,
            size: oi.size,
            category: oi.category,
            image_url: oi.image_url,

            baseIngredients: baseIng, // type IngredientWithQuantity[]
            removedBaseIds: removedBaseIds, // type string[]
            extraIngredientIds: extraIngredientIds, // type string[]
            ingredients: allIng, // type IngredientWithQuantity[]
          };
        }),
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
    .filter((p) => { 
      if (!p.category) return false; // Ignore les produits sans catégorie
      return p.category._id === selectedCategory;
    })
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
  // Fonction pour gérer les changements de quantité
  const handleQuantityChange = (
    itemIndex: number,
    newQuantity: number,
    values: OrderFormValues,
    setFieldValue: (field: string, value: any) => void
  ) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemIndex, values, setFieldValue);
    } else {
      const updated = [...values.orderItems];
      updated[itemIndex].quantity = newQuantity;
      setFieldValue("orderItems", updated);
    }
  };

  // Fonction pour supprimer un item de manière sécurisée
  const handleRemoveItem = (
    index: number,
    values: OrderFormValues,
    setFieldValue: (field: string, value: any) => void
  ) => {
    // Sauvegarder l'état actuel avant suppression
    setPreviousOrderItems([...values.orderItems]);

    // Supprimer l'item
    const updatedItems = values.orderItems.filter((_, i) => i !== index);
    setFieldValue("orderItems", updatedItems);
  };

  // Fonction pour restaurer les items précédents
  const restorePreviousItems = (
    setFieldValue: (field: string, value: any) => void
  ) => {
    if (previousOrderItems.length > 0) {
      setFieldValue("orderItems", previousOrderItems);
      setPreviousOrderItems([]);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async (
    values: OrderFormValues,
    { resetForm, setFieldValue }: any
  ) => {
    setIsSubmitting(true);
    try {
      const payload: Partial<Order> = {
        customer: {
          name: values.customerName,
          phone: values.phoneNumber,
        },
        items: values.orderItems.map((item) => {
          // 1) Map { [ingId]: qtyTotal }
          const ingredientCountMap: Record<string, number> = {};
          item.baseIngredients
            .filter((b) => !item.removedBaseIds.includes(b._id))
            .forEach((b) => {
              ingredientCountMap[b._id] = (ingredientCountMap[b._id] || 0) + 1;
            });
          item.extraIngredientIds.forEach((id) => {
            ingredientCountMap[id] = (ingredientCountMap[id] || 0) + 1;
          });

          // 2) Transformer en [{ _id, quantity }]
          const mergedIngredients = Object.entries(ingredientCountMap).map(
            ([id, qty]) => ({
              _id: id,
              quantity: qty,
            })
          );

          // 3) Construire IngredientWithQuantity[] en joignant `ingredient` depuis allIngredients
          const mergedIngredientsWithDetails: IngredientWithQuantity[] =
            mergedIngredients.map(({ _id, quantity }) => {
              const found = allIngredients.find((i) => i._id === _id);
              return {
                _id,
                ingredient: found
                  ? {
                      _id: found._id,
                      name: found.name,
                      price: found.price,
                      stock: found.stock,
                    }
                  : { _id, name: "", price: 0, stock: 0 },
                quantity,
              };
            });

          return {
            _id: item._id,
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            category: item.category,
            image_url: item.image_url,
            baseIngredients: item.baseIngredients,
            ingredients: mergedIngredientsWithDetails,
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
        // Si l'erreur concerne la suppression d'items préparés, restaurer l'état précédent
        if (
          errorMsg &&
          errorMsg.includes("Cannot remove an item already prepared")
        ) {
          restorePreviousItems(setFieldValue);
          setAlert({
            type: "error",
            message: "Cannot remove items that are already being prepared.",
          });
        } else {
          setAlert({
            type: "error",
            message: errorMsg || "An error occurred.",
          });
        }
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
      setPreviousOrderItems([]); // Réinitialiser l'état précédent après succès
    } catch (err: any) {
      let catchErrorMsg =
        err?.response?.data?.message || err?.message || "An error occurred.";

      // Si l'erreur concerne la suppression d'items préparés, restaurer l'état précédent
      if (catchErrorMsg.includes("Cannot remove an item already prepared")) {
        restorePreviousItems(setFieldValue);
        catchErrorMsg = "Cannot remove items that are already being prepared.";
      }

      setAlert({ type: "error", message: catchErrorMsg });
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
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIosNew />
          </IconButton>
          <Typography
            variant="h4"
            sx={{ ml: 1, fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
          >
            {isCreateMode ? "Take an Order" : "Order Details"}
          </Typography>
        </Box>

        <Paper sx={{ mt: 3, p: { xs: 2, sm: 3 } }}>
          <Tabs
            value={tab}
            onChange={(_, newTab) => setTab(newTab)}
            centered={false}
            variant={window.innerWidth < 600 ? "scrollable" : "standard"}
            scrollButtons="auto"
          >
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
                      />{" "}
                      <TextField
                        label="Phone Number"
                        name="phoneNumber"
                        type="tel"
                        value={values.phoneNumber || ""}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Formatage automatique du numéro belge
                          try {
                            const phoneNumber = parsePhoneNumber(value, "BE");
                            if (phoneNumber) {
                              value = phoneNumber.formatInternational();
                            }
                          } catch {
                            // Garder la valeur originale si le parsing échoue
                          }
                          handleChange({
                            target: {
                              name: "phoneNumber",
                              value: value,
                            },
                          });
                        }}
                        fullWidth
                        error={!!(errors.phoneNumber && touched.phoneNumber)}
                        helperText={touched.phoneNumber && errors.phoneNumber}
                        placeholder="Ex: 04 12 34 56 78 ou +32 4 12 34 56 78"
                        sx={{ mb: 2 }}
                      />                      <TextField
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
                          min: minDateTime,
                          step: 300, // Pas de 5 minutes (300 secondes)
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
                                        // Ici, on crée un "OrderItemForm" plutôt que "OrderItem & { baseIngredients: Ingredient[] }"
                                        const newItem: {
                                          productId: string;
                                          name: string;
                                          price: number;
                                          quantity: number;
                                          size?: string;
                                          category: Category;
                                          image_url?: string;
                                          baseIngredients: IngredientWithQuantity[];
                                          removedBaseIds: string[];
                                          extraIngredientIds: string[];
                                          ingredients: IngredientWithQuantity[];
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

                                          // → On transforme product.ingredients (Ingredient[]) en IngredientWithQuantity[]
                                          baseIngredients: (
                                            product.ingredients || []
                                          ).map((ing) => ({
                                            _id: ing._id,
                                            ingredient: {
                                              _id: ing._id,
                                              name: ing.name,
                                              price: ing.price,
                                              stock: ing.stock ?? 0,
                                            },
                                            quantity: 1, // quantité par défaut = 1
                                          })),

                                          removedBaseIds: [],
                                          extraIngredientIds: [],

                                          // Pour la clé "ingredients", on met simplement un tableau vide au départ
                                          ingredients: [],
                                        };

                                        // Si le produit existe déjà sans modifications d'ingrédients, on incrémente la quantité
                                        const existingIndex =
                                          values.orderItems.findIndex(
                                            (item) =>
                                              item.productId ===
                                                newItem.productId &&
                                              item.size === newItem.size &&
                                              item.removedBaseIds.length ===
                                                0 &&
                                              item.extraIngredientIds.length ===
                                                0
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
                                      Add – {price} €
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
                          </Typography>{" "}
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
                                        {" "}
                                        <Grid item xs={6}>
                                          <Typography>{item.name}</Typography>
                                          {/* Calculer le coût des extras */}
                                          {(() => {
                                            const extrasCost =
                                              item.extraIngredientIds.reduce(
                                                (acc, id) => {
                                                  const ing =
                                                    allIngredients.find(
                                                      (i) => i._id === id
                                                    );
                                                  return (
                                                    acc + (ing?.price ?? 0)
                                                  );
                                                },
                                                0
                                              );
                                            const unitPrice =
                                              item.price + extrasCost;
                                            return (
                                              <Typography variant="caption">
                                                {unitPrice.toFixed(2)} € ×{" "}
                                                {item.quantity}
                                              </Typography>
                                            );
                                          })()}
                                          {/* Affichage des modifications déjà enregistrées */}
                                          <Box sx={{ mt: 0.5, pl: 1 }}>
                                            {item.removedBaseIds.length > 0 && (
                                              <Typography
                                                variant="caption"
                                                color="error"
                                              >
                                                No{" "}
                                                {item.baseIngredients
                                                  .filter((b) =>
                                                    item.removedBaseIds.includes(
                                                      b._id
                                                    )
                                                  )
                                                  .map((b: any) => {
                                                    // Supporte Ingredient ou IngredientWithQuantity
                                                    const name =
                                                      b.name ||
                                                      (b.ingredient &&
                                                        b.ingredient.name) ||
                                                      b._id;
                                                    return name;
                                                  })
                                                  .join(", ")}
                                              </Typography>
                                            )}
                                            {item.extraIngredientIds.length >
                                              0 && (
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
                                                  const counts =
                                                    item.extraIngredientIds.reduce(
                                                      (
                                                        acc: Record<
                                                          string,
                                                          number
                                                        >,
                                                        id
                                                      ) => {
                                                        acc[id] =
                                                          (acc[id] || 0) + 1;
                                                        return acc;
                                                      },
                                                      {}
                                                    );
                                                  const parts = Object.entries(
                                                    counts
                                                  ).map(([id, qty]) => {
                                                    const ing =
                                                      allIngredients.find(
                                                        (i) => i._id === id
                                                      );
                                                    const name = ing
                                                      ? ing.name
                                                      : id;
                                                    if (qty === 1)
                                                      return `extra ${name}`;
                                                    if (qty === 2)
                                                      return `double ${name}`;
                                                    return `${qty}× ${name}`;
                                                  });
                                                  return parts.join(" and ");
                                                })()}
                                              </Typography>
                                            )}
                                          </Box>{" "}
                                        </Grid>{" "}
                                        <Grid item xs={5}>
                                          <Stack
                                            direction="row"
                                            spacing={0.5}
                                            alignItems="center"
                                          >
                                            {/* - Button */}
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleQuantityChange(
                                                  idx,
                                                  item.quantity - 1,
                                                  values,
                                                  setFieldValue
                                                )
                                              }
                                              disabled={item.quantity <= 1}
                                              sx={{
                                                width: 32,
                                                height: 32,
                                                border: "1px solid #d0d0d0",
                                                borderRadius: 2,
                                                bgcolor: "#f7f7f7",
                                                "&:hover": {
                                                  bgcolor: "#eee",
                                                  borderColor: "#aaa",
                                                },
                                              }}
                                            >
                                              <RemoveIcon fontSize="small" />
                                            </IconButton>

                                            {/* Quantité (sans saisie clavier, centré, look badge) */}
                                            <Box
                                              sx={{
                                                minWidth: 38,
                                                height: 36,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 700,
                                                fontSize: "1.12rem",
                                                border: "1px solid #d0d0d0",
                                                borderRadius: 2,
                                                mx: 0.5,
                                                bgcolor: "#fafcff",
                                                color: "#1976d2",
                                                letterSpacing: 1,
                                                userSelect: "none",
                                                pointerEvents: "none", // Désactive la sélection/saisie
                                              }}
                                            >
                                              {item.quantity}
                                            </Box>

                                            {/* + Button */}
                                            <IconButton
                                              size="small"
                                              onClick={() =>
                                                handleQuantityChange(
                                                  idx,
                                                  item.quantity + 1,
                                                  values,
                                                  setFieldValue
                                                )
                                              }
                                              sx={{
                                                width: 32,
                                                height: 32,
                                                border: "1px solid #d0d0d0",
                                                borderRadius: 2,
                                                bgcolor: "#f7f7f7",
                                                "&:hover": {
                                                  bgcolor: "#eee",
                                                  borderColor: "#aaa",
                                                },
                                              }}
                                            >
                                              <AddIcon fontSize="small" />
                                            </IconButton>

                                            {/* Delete */}
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() =>
                                                handleRemoveItem(
                                                  idx,
                                                  values,
                                                  setFieldValue
                                                )
                                              }
                                              sx={{
                                                ml: 1,
                                                "&:hover": {
                                                  bgcolor:
                                                    "rgba(211, 47, 47, 0.06)",
                                                },
                                              }}
                                            >
                                              <DeleteIcon />
                                            </IconButton>
                                          </Stack>
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
                                    const extrasCost =
                                      item.extraIngredientIds.reduce(
                                        (acc, id) => {
                                          const ing = allIngredients.find(
                                            (i) => i._id === id
                                          );
                                          return acc + (ing?.price ?? 0);
                                        },
                                        0
                                      );

                                    // coût unitaire total (base + extras)
                                    const unitTotal = item.price + extrasCost;

                                    // on ajoute unitTotal × quantité
                                    return sum + unitTotal * item.quantity;
                                  }, 0)
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
