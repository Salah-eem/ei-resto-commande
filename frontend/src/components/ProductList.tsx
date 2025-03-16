'use client';
import React, { useEffect, useRef } from "react";
import { Box, Typography, Grid, CircularProgress, Alert } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { fetchProducts } from "@/store/slices/productSlice";
import { fetchCategories } from "@/store/slices/categorySlice";
import { RootState } from "@/store/store";
import ProductCard from "./ProductCard";
import CategoryNav from "./CategoryNav";
import { Category } from "@/types/category";

const ProductList: React.FC = () => {
  const dispatch = useDispatch();
  const { items: products, loading: loadingProducts, error: errorProducts } = useSelector(
    (state: RootState) => state.products
  );
  const { items: categories, loading: loadingCategories, error: errorCategories } = useSelector(
    (state: RootState) => state.categories
  );

  // Crée un objet ref pour chaque catégorie
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({} as Record<string, HTMLDivElement | null>);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts() as any);
    }
    if (categories.length === 0) {
      dispatch(fetchCategories() as any);
    }
  }, [dispatch, products.length, categories.length]);

  // Au clic sur une catégorie, on fait défiler jusqu'à sa section
  const handleCategoryChange = (category: Category) => {
    const ref = categoryRefs.current[category._id];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const featuredProducts = products.slice(0, 7);

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
        {featuredProducts.map((product) => (
          <Box key={product._id} sx={{ scrollSnapAlign: 'start', minHeight: 340 }}>
            <ProductCard product={product} isHorizontal={false} />
          </Box>
        ))}
      </Box>

      {/* Barre de navigation fixe pour les catégories */}
      <Box
        sx={{
          position: 'sticky',
          top: 80,
          backgroundColor: 'white',
          zIndex: 1000,
          py: 1,
        }}
      >
        <CategoryNav categories={categories} onCategoryChange={handleCategoryChange} />
      </Box>

      {/* Section "Tous les produits" divisée par catégorie */}
      {categories.map((category) => {
        const productsInCategory = products.filter(
          (product) => product.category._id === category._id
        );
        return (
          <Box
            key={category._id}
            ref={(el: HTMLDivElement | null) => { categoryRefs.current[category._id] = el; }}
            sx={{ mb: 4, scrollMarginTop: "130px" }}  // Définir ici l'offset pour le header
          >
            <Typography variant="h5" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
              {category.name}
            </Typography>
            <Grid container spacing={2}>
              {productsInCategory.map((product) => (
                <Grid item xs={12} sm={6} key={product._id}>
                  <Box sx={{ minHeight: 140 }}>
                    <ProductCard product={product} isHorizontal={true} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};

export default ProductList;
