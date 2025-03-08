"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, CircularProgress, Alert } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "@/store/slices/productSlice";
import { fetchCategories } from "@/store/slices/categorySlice";
import { RootState } from "@/store/store";
import ProductCard from "./ProductCard";
import CategoryNav from "./CategoryNav";

const ProductList: React.FC = () => {
  const dispatch = useDispatch();
  const { items: products, loading: loadingProducts, error: errorProducts } = useSelector(
    (state: RootState) => state.products
  );
  const { items: categories, loading: loadingCategories, error: errorCategories } = useSelector(
    (state: RootState) => state.categories
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ✅ Ne lance les requêtes qu'une seule fois si les données ne sont pas déjà présentes
  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts() as any);
    }
    if (categories.length === 0) {
      dispatch(fetchCategories() as any);
    }
  }, [dispatch]);

  // ✅ Sélectionne la première catégorie une seule fois après le chargement
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]._id);
    }
  }, [categories, selectedCategory]);

  if (loadingProducts || loadingCategories) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorProducts || errorCategories) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <Alert severity="error">{errorProducts || errorCategories}</Alert>
      </Box>
    );
  }

  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category._id === selectedCategory)
    : products;

  return (
    <Box sx={{ p: 2 }}>
      {/* Section "Articles en vedette" */}
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Articles en vedette
      </Typography>
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: 2,
          pb: 2,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          px: 2,
        }}
      >
        {products.map((product) => (
          <Box key={product._id} sx={{ scrollSnapAlign: 'start' }}>
            <ProductCard product={product} isHorizontal={false} /> {/* Affichage vertical */}
          </Box>
        ))}
      </Box>

      {/* Section "Tous les produits" */}
      <Typography variant="h5" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
        Tous les produits
      </Typography>

      {/* Barre de navigation fixe pour les catégories */}
      <Box
        sx={{
          position: 'sticky',
          top: 60,
          backgroundColor: 'white',
          zIndex: 1000,
          py: 1,
        }}
      >
        <CategoryNav categories={categories} onCategoryChange={(category) => setSelectedCategory(category._id)} />
      </Box>

      {/* Liste des produits filtrés */}
      <Grid container spacing={2}>
        {filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} key={product._id}> {/* Deux cartes par ligne */}
            <ProductCard product={product} isHorizontal={true} /> {/* Affichage horizontal */}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ProductList;