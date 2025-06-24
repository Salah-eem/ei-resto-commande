"use client";
import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, CircularProgress, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import api from "@/lib/api";
import { Category } from "@/types/category";
import { Product, ProductType } from "@/types/product";
import { capitalizeFirstLetter } from "@/utils/functions.utils";
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { RootState } from '@/store/store';
import { fetchIngredients, addIngredient, updateIngredient, deleteIngredient, updateIngredientImage } from '@/store/slices/ingredientSlice';
import { Ingredient } from '@/types/ingredient';
import { useAppDispatch, useAppSelector } from "@/store/slices/hooks";
import { fetchCategories, addCategory, updateCategory, deleteCategory } from "@/store/slices/categorySlice";
import { fetchProducts, addProduct, updateProduct, deleteProduct } from "@/store/slices/productSlice";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertColor } from '@mui/material/Alert';
import Swal from 'sweetalert2';
import ProtectRoute from "@/components/ProtectRoute";
import { Role } from "@/types/user";


const MenuManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  // Dialog states
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catIdx, setCatIdx] = useState<number | ''>("");

  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [prodEdit, setProdEdit] = useState<Product | null>(null);
  const [prodData, setProdData] = useState<Partial<Product>>({ productType: ProductType.SINGLE_PRICE, ingredients: [] });
    
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [ingredientEdit, setIngredientEdit] = useState<Ingredient | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: AlertColor }>({ open: false, message: '', severity: 'success' });

  // Helper to show snackbar
  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const dispatch = useAppDispatch();
  const { items: ingredients, loading: loadingIngredients, error: errorIngredients } = useAppSelector((state: RootState) => state.ingredients);
  const { items: categories, loading: loadingCategories, error: errorCategories } = useAppSelector((state: RootState) => state.categories);
  const { items: products, loading: loadingProducts, error: errorProducts } = useAppSelector((state: RootState) => state.products);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [ingredientFilter, setIngredientFilter] = useState("");

  const validateCategoryName = async (name: string, catId?: string) => {
    try {
      const res = await api.post(`/category/check-name`, {
        name,
        catId,
      });
      return res.data.unique;
    } catch {
      return true;
    } 
  };

  const validateCategoryIdx = async (idx: number, catId?: string) => {
    try {
      const res = await api.post(`/category/check-idx-unique`, {
        idx,
        catId,
      });
      return res.data.unique;
    } catch {
      return true;
    } 
  };

  const categorySchema = Yup.object().shape({
    name: Yup.string()
      .min(3, 'Minimum 3 characters')
      .required('Required')
      .test('unique', 'Category name must be unique', async function (value) {
        if (!value || value.length < 3) return true;
        const isUnique = await validateCategoryName(value, catEdit?._id);
        return isUnique;
      }),
    idx: Yup.number()
      .typeError('Index must be a number')
      .integer('Index must be an integer')
      .min(1, 'Index must be greater than 0')
      .required('Index is required')
      .test('unique-idx', 'Index must be unique', function (value) {
        if (!value) return true;
        return validateCategoryIdx(value, catEdit?._id);
      }),
  });

  const validateProductName = async (name: string, prodId?: string) => {
    try {
      const res = await api.post(`/product/check-name`, {
        name,
        prodId,
      });
      return res.data.unique;
    } catch {
      return true;
    }
  };

  const productSchema = Yup.object().shape({
    name: Yup.string()
      .min(3, 'Minimum 3 characters')
      .required('Required')
      .test('unique', 'Product name must be unique', async function (value) {
        if (!value || value.length < 3) return true;
        const isUnique = await validateProductName(value, prodEdit?._id);
        return isUnique;
      }),
    description: Yup.string()
      .test('desc', 'Minimum 3 characters', val => !val || val.length === 0 || val.length >= 3),
    productType: Yup.string().required('Required'),
    basePrice: Yup.number()
      .when('productType', {
        is: ProductType.SINGLE_PRICE,
        then: s => s.required('Required').moreThan(0, 'Price must be greater than 0'),
        otherwise: s => s.notRequired(),
      }),
    sizes: Yup.array().when('productType', {
      is: ProductType.MULTIPLE_SIZES,
      then: s => s
        .required('At least two sizes')
        .min(2, 'At least two sizes')
        .of(
          Yup.object().shape({
            name: Yup.string().min(3, 'Minimum 3 characters').required('Required'),
            price: Yup.number().moreThan(0, 'Price must be greater than 0').required('Required'),
          })
        ),
      otherwise: s => s.notRequired(),
    }),
    category: Yup.mixed().test('not-null', 'Category is required', val => !!val),
    stock: Yup.number()
      .nullable()
      .transform(value => (isNaN(value) ? null : value))
      .positive('Stock must be a positive number')
      .integer('Stock must be an integer'),
    ingredients: Yup.array().of(Yup.string()),
  });

  const validateIngredientName = async (name: string, ingredientId?: string) => {
    try {
      const res = await api.post(`/ingredient/check-name-unique`, {
        name,
        ingredientId,
      });
      return res.data.unique;
    } catch {
      return true;
    }
  };
  
  // Ingredient validation schema (const at top)
  const ingredientSchema = Yup.object({
    name: Yup.string().min(3, 'Minimum 3 characters').required('Required')
      .test('unique', 'Ingredient name must be unique', async function (value) {
        if (!value || value.length < 3) return true;
        const isUnique = await validateIngredientName(value, ingredientEdit?._id);
        return isUnique;
      }),
    price: Yup.number()
      .typeError('Price must be a number')
      .min(0, 'Price must be at least 0')
      .required('Price is required'),
    stock: Yup.number()
      .nullable()
      .transform(value => (isNaN(value) ? null : value))
      .positive('Stock must be a positive number')
      .integer('Stock must be an integer'),
    description: Yup.string().test('desc', 'Minimum 3 characters', val => !val || val.length === 0 || val.length >= 3),
  });

  useEffect(() => { dispatch(fetchIngredients() as any); }, [dispatch]);
  useEffect(() => { dispatch(fetchCategories() as any); }, [dispatch]);
  useEffect(() => { dispatch(fetchProducts() as any); }, [dispatch]);

  // Category handlers
  const handleCatSave = async () => {
    try {
      let actionResult;
      const idxValue = catIdx === '' ? 1 : Number(catIdx);
      if (catEdit) {
        actionResult = await dispatch(updateCategory({ id: catEdit._id, data: { name: catName, idx: idxValue } }) as any);
      } else {
        actionResult = await dispatch(addCategory({ name: catName, idx: idxValue }) as any);
      }
      if (!actionResult.error) {
        dispatch(fetchCategories() as any);
        showSnackbar(catEdit ? 'Category updated!' : 'Category added!', 'success');
      }
      setCatDialogOpen(false);
      setCatEdit(null);
      setCatName("");
      setCatIdx("");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error saving category");
      showSnackbar(e?.response?.data?.message || "Error saving category", 'error');
    }
  };
  const handleCatDelete = async (cat: Category) => {
    const result = await Swal.fire({
      title: `Delete category '${cat.name}'?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const actionResult = await dispatch(deleteCategory(cat._id) as any);
      if (!actionResult.error) {
        dispatch(fetchCategories() as any);
        showSnackbar('Category deleted!', 'success');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error deleting category");
      showSnackbar(e?.response?.data?.message || "Error deleting category", 'error');
    }
  };

  // Product handlers
  const handleProdSave = async (values: any, { setSubmitting, setErrors }: any) => {
    try {
      let payload: any = {
        ...values,
        category: typeof values.category === 'object' && values.category?._id ? values.category._id : values.category,
      };
      let actionResult;
      if (prodEdit) {
        actionResult = await dispatch(updateProduct({ id: prodEdit._id, data: payload }) as any);
      } else {
        actionResult = await dispatch(addProduct(payload) as any);
      }
      if (!actionResult.error) {
        dispatch(fetchProducts() as any);
        showSnackbar(prodEdit ? 'Product updated!' : 'Product added!', 'success');
      }
      setProdDialogOpen(false);
      setProdEdit(null);
      setProdData({ productType: ProductType.SINGLE_PRICE, ingredients: [] });
    } catch (e: any) {
      setErrors && setErrors({ name: e?.response?.data?.message || "Error saving product" });
      setError(e?.response?.data?.message || "Error saving product");
      showSnackbar(e?.response?.data?.message || "Error saving product", 'error');
    } finally {
      setSubmitting && setSubmitting(false);
    }
  };
  const handleProdDelete = async (prod: Product) => {
    const result = await Swal.fire({
      title: `Delete product '${prod.name}'?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const actionResult = await dispatch(deleteProduct(prod._id) as any);
      if (!actionResult.error) {
        dispatch(fetchProducts() as any);
        showSnackbar('Product deleted!', 'success');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error deleting product");
      showSnackbar(e?.response?.data?.message || "Error deleting product", 'error');
    }
  };

  // Drag and drop handler for categories
  const handleCategoryDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(categories);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    // Recalcule les idx (1-based)
    const updated = reordered.map((cat, i) => ({ ...cat, idx: i + 1 }));
    try {
      await api.post('/category/reorder', { updates: updated.map(({ _id, idx }) => ({ _id, idx })) });
      // Rafraîchir les catégories après le drag & drop pour refléter l'ordre côté backend
      dispatch(fetchCategories() as any);
      showSnackbar('Category order updated!', 'success');
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error updating category order");
      showSnackbar(e?.response?.data?.message || "Error updating category order", 'error');
    }
  };

  // Handler for ingredient form submit
  const handleIngredientSubmit = async (values: any, { setSubmitting, setErrors }: any) => {
    try {
      const ingredient: Ingredient = { ...values };

      if (ingredientEdit) {
        await dispatch(updateIngredient({ id: ingredientEdit._id, data: ingredient }) as any);
      } else {
        await dispatch(addIngredient(ingredient) as any);
      }
      setIngredientDialogOpen(false);
    } catch (e: any) {
      setErrors({ name: e?.response?.data?.message || "Error saving ingredient" });
    } finally {
      setSubmitting(false);
    };
  }

  const handleIngredientDelete = async (ingredient: Ingredient) => {
    const result = await Swal.fire({
      title: `Delete ingredient '${ingredient.name}'?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const actionResult = await dispatch(deleteIngredient(ingredient._id) as any);
      if (!actionResult.error) {
        dispatch(fetchIngredients() as any);
        showSnackbar('Ingredient deleted!', 'success');
      }
    } catch (e: any) {
      showSnackbar(e?.response?.data?.message || "Error deleting ingredient", 'error');
    }
  };
  if (loadingProducts || loadingCategories || loadingIngredients) {
    return (
      <Box sx={{ maxWidth: { xs: "100%", sm: 900 }, mx: "auto", py: 4, px: { xs: 2, sm: 0 } }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ProtectRoute allowedRoles={[Role.Admin]}>
      <Box sx={{ maxWidth: { xs: "100%", sm: 900 }, mx: "auto", py: 4, px: { xs: 2, sm: 0 } }}>
        <Typography variant="h4" fontWeight={700} mb={3}>Menu Management</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Categories" />
            <Tab label="Products" />
            <Tab label="Ingredients" />
          </Tabs>
          {tab === 0 && (
            <Box>              <Box sx={{ mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => {
                  const maxIdx = categories.length > 0 ? Math.max(...categories.map(c => c.idx)) : 0;
                  setCatEdit(null);
                  setCatName("");
                  setCatIdx(maxIdx + 1);
                  setCatDialogOpen(true);
                }} sx={{ minWidth: { xs: '100%', sm: 'auto' } }}>Add Category</Button>
                <TextField
                  label="Filter categories"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: { xs: '100%', sm: 220 } }}
                />
              </Box>
              {categories.length === 0 && <Typography>No categories.</Typography>}
              <DragDropContext onDragEnd={handleCategoryDragEnd}>
                <Droppable droppableId="categories-droppable">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {categories
                        .filter(cat => cat.name.toLowerCase().includes(categoryFilter.toLowerCase()))
                        .sort((a, b) => a.idx - b.idx)
                        .map((cat, index) => {
                          const count = products.filter(p => (typeof p.category === 'string' ? p.category === cat._id : p.category?._id === cat._id)).length;
                          return (
                            <Draggable key={cat._id} draggableId={cat._id} index={index}>
                              {(provided, snapshot) => (
                                <Paper
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{
                                    p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: snapshot.isDragging ? '#e3f2fd' : undefined,
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <DragIndicatorIcon sx={{ cursor: 'grab', color: '#90a4ae' }} />
                                    <Typography>{capitalizeFirstLetter(cat.name)}</Typography>
                                    <Typography variant="caption" color="text.secondary">({count})</Typography>
                                    <Typography variant="caption" color="primary" sx={{ ml: 1 }}>Idx: {cat.idx}</Typography>
                                  </Box>
                                  <Box>
                                    <IconButton onClick={() => { setCatEdit(cat); setCatName(cat.name); setCatIdx(cat.idx); setCatDialogOpen(true); }}><EditIcon /></IconButton>
                                    <IconButton color="error" onClick={() => handleCatDelete(cat)}><DeleteIcon /></IconButton>
                                  </Box>
                                </Paper>
                              )}
                            </Draggable>
                          );
                        })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Box>
          )}
          {tab === 1 && (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setProdEdit(null); setProdData({ productType: ProductType.SINGLE_PRICE, ingredients: [] }); setProdDialogOpen(true); }}>Add Product</Button>
                <TextField
                  label="Filter products"
                  value={productFilter}
                  onChange={e => setProductFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 220 }}
                />
              </Box>
              {products.length === 0 && <Typography>No products.</Typography>}
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => {
                const prods = products
                  .filter(p => (typeof p.category === 'string' ? p.category === cat._id : p.category?._id === cat._id))
                  .filter(p =>
                    p.name.toLowerCase().includes(productFilter.toLowerCase()) ||
                    (p.description && p.description.toLowerCase().includes(productFilter.toLowerCase()))
                  )
                  .sort((a, b) => a.name.localeCompare(b.name));
                if (prods.length === 0) return null;
                return (
                  <Box key={cat._id} sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{capitalizeFirstLetter(cat.name)}</Typography>
                    {prods.map(prod => (
                      <Paper key={prod._id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography fontWeight={600}>{capitalizeFirstLetter(prod.name)}</Typography>
                          <Typography variant="body2" color="text.secondary">{prod.description}</Typography>
                          {prod.productType === ProductType.SINGLE_PRICE && (
                            <Typography variant="body2">{prod.basePrice} €</Typography>
                          )}
                          {prod.productType === ProductType.MULTIPLE_SIZES && prod.sizes && (
                            <Box>
                              {prod.sizes.map((size, idx) => (
                                <Typography key={idx} variant="body2">{capitalizeFirstLetter(size.name)}: {size.price} €</Typography>
                              ))}
                            </Box>
                          )}
                          <Typography variant="caption" color="text.secondary">{capitalizeFirstLetter(prod.category?.name)}</Typography>
                        </Box>
                        <Box>
                          <IconButton onClick={() => { setProdEdit(prod); setProdData({ ...prod, ingredients: prod.ingredients || [] }); setProdDialogOpen(true); }}><EditIcon /></IconButton>
                          <IconButton color="error" onClick={() => handleProdDelete(prod)}><DeleteIcon /></IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                );
              })}
            </Box>
          )}
          {tab === 2 && (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setIngredientEdit(null); setIngredientDialogOpen(true); }}>Add Ingredient</Button>
                <TextField
                  label="Filter ingredients"
                  value={ingredientFilter}
                  onChange={e => setIngredientFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 220 }}
                />
              </Box>
              {loadingIngredients ? <CircularProgress /> : null}
              {errorIngredients && <Alert severity="error">{errorIngredients}</Alert>}
              {ingredients.length === 0 && <Typography>No ingredients.</Typography>}
              {ingredients
                .filter(i => i.name.toLowerCase().includes(ingredientFilter.toLowerCase()))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(ingredient => (
                  <Paper key={ingredient._id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {ingredient.image_url && <img src={`${process.env.NEXT_PUBLIC_API_URL}${ingredient.image_url}`} alt={ingredient.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />}
                      <Box>
                        <Typography fontWeight={600}>{ingredient.name}</Typography>
                        <Typography variant="body2" color="text.secondary">{ingredient.description}</Typography>
                        <Typography variant="caption" color="text.secondary">Stock: {ingredient.stock === null ? 'unlimited' : ingredient.stock}</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton onClick={() => { setIngredientEdit(ingredient); setIngredientDialogOpen(true); }}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleIngredientDelete(ingredient)}><DeleteIcon /></IconButton>
                    </Box>
                  </Paper>
                ))}
            </Box>
          )}
        </Paper>

        {/* Category Dialog */}
        <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)}>
          <DialogTitle>{catEdit ? "Edit Category" : "Add Category"}</DialogTitle>
          <Formik
            initialValues={{ name: catName, idx: catEdit?.idx ?? catIdx }}
            enableReinitialize
            validationSchema={categorySchema}
            validateOnBlur
            validateOnChange={false}
            onSubmit={handleCatSave}
          >
            {({ values, errors, touched, handleChange, handleBlur, isSubmitting, isValid, setFieldValue }) => (
              <Form>
                <DialogContent>
                  <TextField
                    label="Category Name"
                    name="name"
                    value={values.name}
                    onChange={e => { handleChange(e); setCatName(e.target.value); }}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    fullWidth
                    sx={{ mt: 1 }}
                    autoFocus
                  />
                  <TextField
                    label="Index"
                    name="idx"
                    type="number"
                    value={values.idx}
                    onChange={e => {
                      handleChange(e);
                      setCatIdx(e.target.value === '' ? '' : Number(e.target.value));
                    }}
                    onBlur={handleBlur}
                    error={touched.idx && Boolean(errors.idx)}
                    helperText={touched.idx && errors.idx}
                    fullWidth
                    sx={{ mt: 2 }}
                    inputProps={{ min: 1 }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setCatDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting || !isValid}>Save</Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={prodDialogOpen} onClose={() => setProdDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{prodEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <Formik
            initialValues={prodData}
            enableReinitialize
            validationSchema={productSchema}
            validateOnBlur
            validateOnChange={false}
            onSubmit={handleProdSave}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
              <Form>
                <DialogContent>
                  <TextField
                    label="Product Name"
                    name="name"
                    value={values.name || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    fullWidth
                    sx={{ mt: 1 }}
                    autoFocus
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={values.description || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                    fullWidth
                    sx={{ mt: 2 }}
                  />
                  <TextField
                    label="Type"
                    select
                    name="productType"
                    value={values.productType || ProductType.SINGLE_PRICE}
                    onChange={e => {
                      handleChange(e);
                      if (e.target.value === ProductType.SINGLE_PRICE) {
                        setFieldValue('sizes', undefined);
                      } else {
                        setFieldValue('basePrice', undefined);
                      }
                    }}
                    onBlur={handleBlur}
                    fullWidth
                    sx={{ mt: 2 }}
                    error={touched.productType && Boolean(errors.productType)}
                    helperText={touched.productType && errors.productType}
                  >
                    <MenuItem value={ProductType.SINGLE_PRICE}>Unique Price</MenuItem>
                    <MenuItem value={ProductType.MULTIPLE_SIZES}>Multiple Sizes</MenuItem>
                  </TextField>
                  {values.productType === ProductType.SINGLE_PRICE && (
                    <TextField
                      label="Price (€)"
                      name="basePrice"
                      type="number"
                      value={values.basePrice || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.basePrice && Boolean(errors.basePrice)}
                      helperText={touched.basePrice && errors.basePrice}
                      fullWidth
                      sx={{ mt: 2 }}
                    />
                  )}
                  {values.productType === ProductType.MULTIPLE_SIZES && (
                    <Box sx={{ mt: 2 }}>
                      {(values.sizes || []).map((size, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                          <TextField
                            label="Size"
                            name={`sizes[${idx}].name`}
                            value={size.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={Array.isArray(touched.sizes) && touched.sizes[idx]?.name && Array.isArray(errors.sizes) && Boolean(errors.sizes[idx]?.name)}
                            helperText={Array.isArray(touched.sizes) && touched.sizes[idx]?.name && Array.isArray(errors.sizes) && errors.sizes[idx]?.name}
                            sx={{ flex: 2 }}
                          />
                          <TextField
                            label="Price (€)"
                            name={`sizes[${idx}].price`}
                            type="number"
                            value={size.price}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={Array.isArray(errors.sizes) && Array.isArray(touched.sizes) && touched.sizes[idx]?.price && Boolean(errors.sizes[idx]?.price)}
                            helperText={Array.isArray(errors.sizes) && Array.isArray(touched.sizes) && touched.sizes[idx]?.price && errors.sizes[idx]?.price}
                            sx={{ flex: 1 }}
                          />
                          <IconButton color="error" onClick={() => {
                            const newSizes = [...(values.sizes || [])];
                            newSizes.splice(idx, 1);
                            setFieldValue('sizes', newSizes);
                          }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setFieldValue('sizes', [...(values.sizes || []), { name: '', price: 0 }])}>
                        Add Size
                      </Button>
                      {touched.sizes && typeof errors.sizes === 'string' && (
                        <Typography color="error" variant="caption">{errors.sizes}</Typography>
                      )}
                    </Box>
                  )}
                  <TextField
                    label="Category"
                    select
                    name="category"
                    value={values.category?._id || values.category || ""}
                    onChange={e => {
                      const cat = categories.find(cat => cat._id === e.target.value);
                      setFieldValue('category', cat || e.target.value);
                    }}
                    onBlur={handleBlur}
                    error={touched.category && Boolean(errors.category)}
                    helperText={touched.category && errors.category}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {categories.map(cat => (
                      <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                    ))}
                  </TextField>

                  {/* Ingrédients multi-sélection */}
                  <TextField
                    label="Ingredients"
                    select
                    name="ingredients"
                    SelectProps={{ multiple: true }}
                    value={values.ingredients || []}
                    onChange={e => {
                      const val = e.target.value;
                      setFieldValue('ingredients', Array.isArray(val) ? val.map(v => typeof v === 'string' ? v : v._id) : []);
                    }}
                    onBlur={handleBlur}
                    fullWidth
                    sx={{ mt: 2 }}
                    helperText="Select one or more ingredients"
                  >
                    {ingredients.map(ing => (
                      <MenuItem key={ing._id} value={ing._id}>{ing.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Stock (leave empty for unlimited)"
                    name="stock"
                    type="text"
                    value={values.stock === undefined || values.stock === null ? 'unlimited' : values.stock}
                    onChange={e => {
                      let val = e.target.value;
                      if (val === '' || val.toLowerCase() === 'unlimited') {
                        setFieldValue('stock', undefined);
                      } else {
                        const num = Number(val);
                        setFieldValue('stock', isNaN(num) ? undefined : num);
                      }
                    }}
                    onBlur={handleBlur}
                    error={touched.stock && Boolean(errors.stock)}
                    helperText={touched.stock && errors.stock}
                    fullWidth
                    sx={{ mt: 2 }}
                    inputProps={{ min: 0 }}
                  />

                  {/* Image upload */}
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      {values.image_url ? 'Change Image' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await api.put('/product/image/' + values._id, formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            setFieldValue('image_url', res.data.image_url); 
                          } catch (err) {
                            alert('Image upload failed');
                          }
                        }}
                      />
                    </Button>
                    {values.image_url && (
                      <Box sx={{ mt: 1 }}>
                        <img src={`${process.env.NEXT_PUBLIC_API_URL}/${values.image_url}`} alt="Product" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }} />
                      </Box>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setProdDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting || Object.keys(errors).length > 0}>Save</Button>
                  { Object.keys(errors).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="error">
                        {Object.values(errors).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </DialogActions>
              </Form>
            )}
          </Formik>
        </Dialog>

        {/* Ingredient Dialog */}
        <Dialog open={ingredientDialogOpen} onClose={() => setIngredientDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{ingredientEdit ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
          <Formik
            initialValues={{
              _id: ingredientEdit?._id || "",
              name: ingredientEdit?.name || "",
              price: ingredientEdit?.price ?? 0,
              stock: ingredientEdit?.stock ?? null,
              description: ingredientEdit?.description || "",
              image_url: ingredientEdit?.image_url || "",
              file: null,
            }}
            enableReinitialize
            validationSchema={ingredientSchema}
            validateOnBlur
            validateOnChange={false}
            onSubmit={handleIngredientSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
              <Form>
                <DialogContent>
                  <TextField
                    label="Ingredient Name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    fullWidth
                    sx={{ mt: 1 }}
                    autoFocus
                  />
                  <TextField
                    label="Stock (leave empty for unlimited)"
                    name="stock"
                    type="text"
                    value={values.stock === null ? 'unlimited' : values.stock}
                    onChange={e => {
                      let val = e.target.value;
                      if (val === '' || val.toLowerCase() === 'unlimited') {
                        setFieldValue('stock', null);
                      } else {
                        const num = Number(val);
                        setFieldValue('stock', isNaN(num) ? null : num);
                      }
                    }}
                    onBlur={handleBlur}
                    error={touched.stock && Boolean(errors.stock)}
                    helperText={touched.stock && errors.stock}
                    fullWidth
                    sx={{ mt: 2 }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Description"
                    name="description"
                    value={values.description || ""}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                    fullWidth
                    sx={{ mt: 2 }}
                  />
                  <TextField
                    label="Price (€)"
                    name="price"
                    type="number"
                    value={values.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.price && Boolean(errors.price)}
                    helperText={touched.price && errors.price}
                    fullWidth
                    sx={{ mt: 2 }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />

                  {/* Image upload */}
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      {values.image_url ? 'Change Image' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const actionResult = await dispatch(updateIngredientImage({ id: values._id, formData }) as any);
                            const payload = actionResult.payload;
                            // payload est l'objet ingredient retourné par le backend (voir le slice)
                            if (payload && payload.image_url) {
                              setFieldValue('image_url', payload.image_url);
                            } else {
                              alert('Image upload succeeded but no image_url returned');
                            }
                          } catch (err) {
                            alert('Image upload failed');
                            console.error(err);
                          }
                        }}
                      />
                    </Button>
                    {values.image_url && (
                      <Box sx={{ mt: 1 }}>
                        <img src={`${process.env.NEXT_PUBLIC_API_URL}/${values.image_url}`} alt="Product" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }} />
                      </Box>
                    )}
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setIngredientDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting || Object.keys(errors).length > 0}>Save</Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </Dialog>

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <MuiAlert elevation={6} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </MuiAlert>
        </Snackbar>
      </Box>
    </ProtectRoute>
  );
};

export default MenuManager;
