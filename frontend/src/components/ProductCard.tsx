'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardMedia, Typography, IconButton, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { Product, ProductType } from '@/types/product';
import SizeDialog from './SizeDialog';
import { RootState } from '@/store/store';

interface ProductCardProps {
  product: Product;
  isHorizontal?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isHorizontal = false }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const dispatch = useDispatch();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const userId = useSelector((state: RootState) => state.user.userId);  

  // Fonction pour mettre en majuscule la première lettre de chaque mot
  const toTitleCase = (str: string) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

  const handleClickOpen = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  const handleConfirmSize = (size: string, quantity: number) => {
    setSelectedSize(size);
    handleAddToCart(size, quantity);
    handleCloseDialog();
  };

  const handleAddToCart = (size?: string, quantity: number = 1) => {
    if (!userId) return;

    const cartItem = {
      userId,
      item: {
        productId: product._id,
        name: product.name,
        price:
          product.productType === ProductType.SINGLE_PRICE
            ? product.basePrice!
            : product.sizes?.find(s => s.name === size)?.price || 0,
        quantity,
        size: size || undefined,
        image_url: product.image_url,
        category: product.category,
      },
    };

    console.log('Adding to cart:', cartItem);
    dispatch(addToCart(cartItem) as any);
  };

  return (
    <Card
      sx={{
        width: isHorizontal ? '100%' : 250,
        minHeight: isHorizontal ? 140 : 340,
        borderRadius: 3,
        boxShadow: 4,
        display: 'flex',
        flexDirection: isHorizontal ? 'row-reverse' : 'column',
        transition: 'transform 0.3s',
        '&:hover': { transform: 'scale(1.03)' },
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex' }}>
        <CardMedia
          component="img"
          image={product.image_url ? `${API_URL}/${product.image_url}` : '/placeholder.png'}
          alt={product.name}
          sx={{
            width: isHorizontal ? 150 : '100%',
            height: isHorizontal ? '100%' : 160,
            borderRadius: isHorizontal ? '10px 0 0 10px' : '10px 10px 0 0',
            objectFit: 'cover',
          }}
        />
        <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
          <IconButton color="primary"
            onClick={
              product.productType === ProductType.MULTIPLE_SIZES
                ? handleClickOpen
                : () => handleAddToCart(undefined, 1)
            }
          >
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Box>
      </Box>
      <CardContent
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {toTitleCase(product.name)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {product.productType === ProductType.SINGLE_PRICE
              ? `${product.basePrice?.toFixed(2)} €`
              : `À partir de ${product.sizes?.[0].price.toFixed(2)} €`}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {product.description}
          </Typography>
        </Box>
      </CardContent>
      {product.productType === ProductType.MULTIPLE_SIZES && (
        <SizeDialog product={product} open={openDialog} onClose={handleCloseDialog} onConfirm={handleConfirmSize} />
      )}
    </Card>
  );
};

export default ProductCard;
