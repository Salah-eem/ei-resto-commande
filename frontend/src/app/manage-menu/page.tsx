"use client";
import React, { useEffect, useState } from "react";
import {
  Box, Typography, Paper, Button, CircularProgress, Alert, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from "@/lib/api";
import { Category } from "@/types/category";
import { Product, ProductType } from "@/types/product";
import { capitalizeFirstLetter } from "@/utils/functions.utils";
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';


const MenuManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  // Dialog states
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");

  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const [prodEdit, setProdEdit] = useState<Product | null>(null);
  const [prodData, setProdData] = useState<Partial<Product>>({ productType: ProductType.SINGLE_PRICE });

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

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

  const categorySchema = Yup.object().shape({
    name: Yup.string()
      .min(3, 'Minimum 3 characters')
      .required('Required')
      .test('unique', 'Category name must be unique', async function (value) {
        if (!value || value.length < 3) return true;
        const isUnique = await validateCategoryName(value, catEdit?._id);
        return isUnique;
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
  });

  // Fetch categories and products
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get("/category"),
        api.get("/product"),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error loading menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Category handlers
  const handleCatSave = async () => {
    try {
      if (catEdit) {
        await api.put(`/category/${catEdit._id}`, { name: catName });
      } else {
        await api.post("/category", { name: catName });
      }
      setCatDialogOpen(false);
      setCatEdit(null);
      setCatName("");
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error saving category");
    }
  };
  const handleCatDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category '${cat.name}'?`)) return;
    try {
      await api.delete(`/category/${cat._id}`);
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error deleting category");
    }
  };

  // Product handlers
  const handleProdSave = async () => {
    try {
      if (prodEdit) {
        await api.put(`/product/${prodEdit._id}`, prodData);
      } else {
        await api.post("/product", prodData);
      }
      setProdDialogOpen(false);
      setProdEdit(null);
      setProdData({});
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error saving product");
    }
  };
  const handleProdDelete = async (prod: Product) => {
    if (!window.confirm(`Delete product '${prod.name}'?`)) return;
    try {
      await api.delete(`/product/${prod._id}`);
      fetchData();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error deleting product");
    }
  };

  if (loading) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={3}>Menu Management</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Categories" />
          <Tab label="Products" />
        </Tabs>
        {tab === 0 && (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setCatEdit(null); setCatName(""); setCatDialogOpen(true); }}>Add Category</Button>
              <TextField
                label="Filter categories"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                size="small"
                sx={{ minWidth: 220 }}
              />
            </Box>
            {categories.length === 0 && <Typography>No categories.</Typography>}
            {categories
              .filter(cat => cat.name.toLowerCase().includes(categoryFilter.toLowerCase()))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(cat => {
                const count = products.filter(p => (typeof p.category === 'string' ? p.category === cat._id : p.category?._id === cat._id)).length;
                return (
                  <Paper key={cat._id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{capitalizeFirstLetter(cat.name)}</Typography>
                      <Typography variant="caption" color="text.secondary">({count})</Typography>
                    </Box>
                    <Box>
                      <IconButton onClick={() => { setCatEdit(cat); setCatName(cat.name); setCatDialogOpen(true); }}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleCatDelete(cat)}><DeleteIcon /></IconButton>
                    </Box>
                  </Paper>
                );
              })}
          </Box>
        )}
        {tab === 1 && (
          <Box>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setProdEdit(null); setProdData({}); setProdDialogOpen(true); }}>Add Product</Button>
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
                        <IconButton onClick={() => { setProdEdit(prod); setProdData({ ...prod }); setProdDialogOpen(true); }}><EditIcon /></IconButton>
                        <IconButton color="error" onClick={() => handleProdDelete(prod)}><DeleteIcon /></IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)}>
        <DialogTitle>{catEdit ? "Edit Category" : "Add Category"}</DialogTitle>
        <Formik
          initialValues={{ name: catName }}
          enableReinitialize
          validationSchema={categorySchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={async (values, { setSubmitting, setErrors }) => {
            try {
              if (catEdit) {
                await api.put(`/category/${catEdit._id}`, { name: values.name });
              } else {
                await api.post("/category", { name: values.name });
              }
              setCatDialogOpen(false);
              setCatEdit(null);
              setCatName("");
              fetchData();
            } catch (e: any) {
              setErrors({ name: e?.response?.data?.message || "Error saving category" });
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting, isValid }) => (
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
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCatDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || Boolean(errors.name) || !values.name || values.name.length < 3}>Save</Button>
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
          onSubmit={async (values, { setSubmitting, setErrors }) => {
            try {
              const payload = {
                ...values,
                category: typeof values.category === 'object' && values.category?._id ? values.category._id : values.category,
              };
              if (prodEdit) {
                await api.put(`/product/${prodEdit._id}`, payload);
              } else {
                await api.post("/product", payload);
              }
              setProdDialogOpen(false);
              setProdEdit(null);
              setProdData({ productType: ProductType.SINGLE_PRICE });
              fetchData();
            } catch (e: any) {
              setErrors({ name: e?.response?.data?.message || "Error saving product" });
            } finally {
              setSubmitting(false);
            }
          }}
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
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setProdDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || Object.keys(errors).length > 0}>Save</Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </Box>
  );
};

export default MenuManager;
