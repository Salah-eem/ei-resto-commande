//HomePage.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { getProducts } from './lib/api';
import ProductList from '@/components/ProductList';
import DeliveryToggle from '@/components/DeliveryToggle';
import { Product } from '@/types';

const HomePage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error('Erreur de chargement des produits:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <DeliveryToggle />
      <ProductList allProducts={products} />
    </Box>
  );
};

export default HomePage;

