'use client';
import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, CircularProgress } from '@mui/material';
import ProductCard from './ProductCard';
import CategoryNav from './CategoryNav';
import { Product } from '@/types';
import { getCategories } from '@/app/lib/api';
import { Category } from '@/types/category';

interface ProductListProps {
  allProducts: Product[];
}
//const categories = await getCategories();

const ProductList: React.FC<ProductListProps> = ({ allProducts }) => {
  //const [selectedCategory, setSelectedCategory] = useState(categories[0]);

  // Filtrer les produits par catégorie
  //const filteredProducts = allProducts.filter((product) => product.category.name === selectedCategory.name);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories: Category[] = await getCategories();
        setCategories(categories);
        setSelectedCategory(categories[0]);
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredProducts = allProducts.filter(product => product.category.name === selectedCategory!.name);

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
        {allProducts.map((product) => (
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
        <CategoryNav categories={categories} onCategoryChange={setSelectedCategory} />
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