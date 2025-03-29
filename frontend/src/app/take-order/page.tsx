'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, IconButton, RadioGroup, FormControlLabel,
         Radio, FormLabel, Snackbar, Alert, Tabs, Tab, CircularProgress, MenuItem, Select, InputLabel, FormControl,
} from '@mui/material';
import { Remove, ShoppingCart } from '@mui/icons-material';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { fetchProducts } from '@/store/slices/productSlice';
import { fetchCategories } from '@/store/slices/categorySlice';
import { useAppDispatch, useAppSelector } from '@/store/slices/hooks';
import { OrderType, PaymentMethod } from '@/types/order';
import { Address } from '@/types/address';
import { CartItem } from '@/types/cartItem';
import { Product, ProductType } from '@/types/product';
import { Category } from '@/types/category';
import { createOrder } from '@/store/slices/orderSlice';

interface OrderFormValues {
  customerName: string;
  phoneNumber: string;
  orderType: OrderType;
  deliveryAddress: Address;
  orderItems: CartItem[];
  paymentMethod: PaymentMethod;
}

const validationSchema = Yup.object().shape({
  customerName: Yup.string().required('Champ requis'),
  phoneNumber: Yup.string().required('Champ requis'),
  orderType: Yup.mixed<OrderType>().oneOf(Object.values(OrderType)).required(),
  deliveryAddress: Yup.object().when('orderType', {
    is: (value: OrderType) => value === OrderType.DELIVERY,
    then: (schema) =>
      schema.shape({
        street: Yup.string().required('Champ requis'),
        streetNumber: Yup.number().typeError('Doit être un nombre').required('Champ requis'),
        city: Yup.string().required('Champ requis'),
        postalCode: Yup.string().required('Champ requis'),
        country: Yup.string().required('Champ requis'),
      }),
    otherwise: (schema) => schema.notRequired(),
  }),
  orderItems: Yup.array()
    .of(
      Yup.object({
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
    .min(1, 'Ajouter au moins un produit'),
  paymentMethod: Yup.mixed<PaymentMethod>().oneOf(Object.values(PaymentMethod)).required(),
});

const initialValues: OrderFormValues = {
  customerName: '',
  phoneNumber: '',
  orderType: OrderType.PICKUP,
  deliveryAddress: { lat: 0, lng: 0, street: '', streetNumber: 0, city: '', postalCode: '', country: '' },
  orderItems: [],
  paymentMethod: PaymentMethod.CASH,
};

const TakeOrderPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products.items as Product[]);
  const categories = useAppSelector((state) => state.categories.items as Category[]);
  const isLoadingProducts = useAppSelector((state) => state.products.loading);

  const [tabIndex, setTabIndex] = useState(0);
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]._id);
    }
  }, [categories]);

  const filteredProducts = products
    .filter((p) => p.category._id === selectedCategory)
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const calculateTotal = (items: CartItem[]) =>
    items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  const handleFormSubmit = async (values: OrderFormValues, { resetForm }: any) => {
    console.log('Commande envoyée :', values);
    dispatch(createOrder(values) as any);
    setSuccessSnackbarOpen(true);
    resetForm();
    setTabIndex(0);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Prendre une commande 📞
      </Typography>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Tabs value={tabIndex} onChange={(e, newIndex) => setTabIndex(newIndex)} centered>
          <Tab label="Client" />
          <Tab label="Produits" />
          <Tab label="Paiement" />
        </Tabs>

        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleFormSubmit}>
          {({ values, handleChange, setFieldValue, errors, touched, handleSubmit }) => (
            <Form onSubmit={handleSubmit}>
              {/* Onglet Client */}
              {tabIndex === 0 && (
                <Box sx={{ mt: 3 }}>
                  <TextField
                    label="Nom du client"
                    name="customerName"
                    value={values.customerName}
                    onChange={handleChange}
                    fullWidth
                    sx={{ mb: 2 }}
                    error={!!errors.customerName && !!touched.customerName}
                    helperText={touched.customerName && errors.customerName}
                  />
                  <TextField
                    label="Numéro de téléphone"
                    name="phoneNumber"
                    value={values.phoneNumber}
                    onChange={handleChange}
                    fullWidth
                    sx={{ mb: 2 }}
                    error={!!errors.phoneNumber && !!touched.phoneNumber}
                    helperText={touched.phoneNumber && errors.phoneNumber}
                  />
                  <FormLabel component="legend" sx={{ mt: 2 }}>Type de commande</FormLabel>
                  <RadioGroup
                    row
                    name="orderType"
                    value={values.orderType}
                    onChange={(e) => setFieldValue('orderType', e.target.value)}
                  >
                    <FormControlLabel value={OrderType.PICKUP} control={<Radio />} label="À emporter" />
                    <FormControlLabel value={OrderType.DELIVERY} control={<Radio />} label="Livraison" />
                  </RadioGroup>

                  {values.orderType === OrderType.DELIVERY && (
                    <Box sx={{ mt: 2 }}>
                      {['street', 'streetNumber', 'city', 'postalCode', 'country'].map((field) => (
                        <TextField
                          key={field}
                          label={field === 'streetNumber' ? 'Numéro' : field.charAt(0).toUpperCase() + field.slice(1)}
                          name={`deliveryAddress.${field}`}
                          value={(values.deliveryAddress as any)[field]}
                          onChange={handleChange}
                          fullWidth
                          sx={{ mb: 2 }}
                          error={!!errors.deliveryAddress?.[field as keyof Address]}
                          helperText={(errors.deliveryAddress as any)?.[field]}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Onglet Produits */}
              {tabIndex === 1 && (
                <Box sx={{ mt: 3, display: 'flex', gap: 4 }}>
                  {/* Produits */}
                  <Box sx={{ flex: 2 }}>
                    <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Catégorie</InputLabel>
                          <Select
                            value={selectedCategory}
                            label="Catégorie"
                            onChange={(e) => {
                              setSelectedCategory(e.target.value);
                              setCurrentPage(1);
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
                          fullWidth
                          label="Rechercher un produit"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                          }}
                        />
                      </Grid>
                    </Grid>

                    {isLoadingProducts ? (
                      <Box textAlign="center"><CircularProgress /></Box>
                    ) : (
                      <Grid container spacing={2}>
                        {paginatedProducts.map((product) => {
                          const selectedSize = selectedSizes[product._id] || product.sizes?.[0]?.name || '';
                          const price =
                            product.productType === ProductType.MULTIPLE_SIZES
                              ? product.sizes?.find((s) => s.name === selectedSize)?.price || 0
                              : product.basePrice!;

                          return (
                            <Grid item xs={12} sm={6} md={4} key={product._id} sx={{ mb: 5 }}>
                              <Paper
                                elevation={3}
                                sx={{
                                  p: 2,
                                  height: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {product.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {product.description}
                                  </Typography>

                                  {product.productType === ProductType.MULTIPLE_SIZES && (
                                    <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                                      <Select
                                        value={selectedSize}
                                        onChange={(e) => {
                                          setSelectedSizes((prev) => ({
                                            ...prev,
                                            [product._id]: e.target.value,
                                          }));
                                        }}
                                      >
                                        {product.sizes?.map((size) => (
                                          <MenuItem key={size._id} value={size.name}>
                                            {size.name} - {size.price} €
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  )}
                                </Box>

                                <Box sx={{ mt: 2 }}>
                                  <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<ShoppingCart />}
                                    onClick={() => {
                                      const productSize = selectedSize;
                                      const itemName =
                                        product.productType === ProductType.MULTIPLE_SIZES
                                          ? `${product.name} (${productSize})`
                                          : product.name;

                                      const existingIndex = values.orderItems.findIndex(
                                        (item) =>
                                          item.productId === product._id &&
                                          (product.productType === ProductType.SINGLE_PRICE || item.size === productSize)
                                      );

                                      if (existingIndex !== -1) {
                                        const updatedItems = [...values.orderItems];
                                        updatedItems[existingIndex].quantity += 1;
                                        setFieldValue('orderItems', updatedItems);
                                      } else {
                                        const newItem: CartItem = {
                                          productId: product._id,
                                          name: itemName,
                                          price: price,
                                          quantity: 1,
                                          size: product.productType === ProductType.MULTIPLE_SIZES ? productSize : undefined,
                                          category: product.category,
                                          image_url: product.image_url,
                                        };
                                        setFieldValue('orderItems', [...values.orderItems, newItem]);
                                      }
                                    }}
                                  >
                                    Ajouter - {price} €
                                  </Button>
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}

                    {/* Pagination */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <Button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                        ⬅️ Précédent
                      </Button>
                      <Typography sx={{ mx: 2 }}>Page {currentPage} / {totalPages || 1}</Typography>
                      <Button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                        Suivant ➡️
                      </Button>
                    </Box>
                  </Box>

                  {/* Panier à droite */}
                  <Box sx={{ flex: 1 }}>
                    <Paper elevation={4} sx={{ p: 2, position: 'sticky', top: 100 }}>
                      <Typography variant="h6" gutterBottom>
                        <ShoppingCart sx={{ mr: 1 }} />
                        Produits choisis
                      </Typography>
                      {values.orderItems.length === 0 ? (
                        <Typography>Aucun produit sélectionné.</Typography>
                      ) : (
                        <FieldArray name="orderItems">
                          {({ remove }) => (
                            <Box>
                              {values.orderItems.map((item, index) => (
                                <Box key={index} sx={{ mb: 2 }}>
                                  <Grid container spacing={1} alignItems="center">
                                    <Grid item xs={8}>
                                      <Typography>{item.name}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {item.price} € x {item.quantity}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                      <TextField
                                        type="number"
                                        size="small"
                                        name={`orderItems.${index}.quantity`}
                                        value={item.quantity}
                                        onChange={handleChange}
                                        inputProps={{ min: 1 }}
                                      />
                                    </Grid>
                                    <Grid item xs={1}>
                                      <IconButton color="error" onClick={() => remove(index)}>
                                        <Remove fontSize="small" />
                                      </IconButton>
                                    </Grid>
                                  </Grid>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </FieldArray>
                      )}
                    </Paper>
                  </Box>
                </Box>
              )}

              {/* Onglet Paiement */}
              {tabIndex === 2 && (
                <Box sx={{ mt: 3 }}>
                  <FormLabel component="legend">Mode de paiement</FormLabel>
                  <RadioGroup
                    row
                    name="paymentMethod"
                    value={values.paymentMethod}
                    onChange={(e) => setFieldValue('paymentMethod', e.target.value)}
                  >
                    <FormControlLabel value={PaymentMethod.CASH} control={<Radio />} label="Cash" />
                    <FormControlLabel value={PaymentMethod.CARD} control={<Radio />} label="Carte" />
                    <FormControlLabel value={PaymentMethod.PAYPAL} control={<Radio />} label="PayPal" />
                  </RadioGroup>

                  <Typography sx={{ mt: 3 }} variant="h6">
                    Total à payer : {calculateTotal(values.orderItems)} €
                  </Typography>

                  <Button
                    variant="contained"
                    color="success"
                    
                    sx={{ mt: 3, width: '50%', mx: 'auto' }}
                    type="submit"
                    disabled={
                      values.orderItems.length === 0 ||
                      !values.customerName ||
                      !values.phoneNumber
                    }
                  >
                    ✅ Confirmer la commande
                  </Button>
                </Box>
              )}
            </Form>
          )}
        </Formik>
      </Paper>

      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          🎉 Commande prise avec succès !
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TakeOrderPage;
