'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardMedia, Typography, IconButton, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { getUserId } from '@/utils/user';
import { Product } from "@/types/product";
import SizeDialog from './SizeDialog';

interface ProductCardProps {
  product: Product;
  isHorizontal?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isHorizontal = false }) => {
  const dispatch = useDispatch();
  const [userId, setUserId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);

  // ✅ Vérification si le produit a des tailles
  const hasSizes = product.sizes && product.sizes.length > 0;

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const handleClickOpen = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  const handleConfirmSize = (size: string) => {
    setSelectedSize(size);
    handleAddToCart(size);
    handleCloseDialog();
  };

  const handleAddToCart = (size?: string) => {
    if (!userId) return;

    const cartItem = {
      userId,
      item: {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        size: size || undefined,
      },
    };
    console.log('Adding to cart:', cartItem);
    dispatch(addToCart(cartItem) as any);
  };

  return (
    <Card
      sx={{
        width: isHorizontal ? '100%' : 250,
        borderRadius: 3,
        boxShadow: 4,
        display: isHorizontal ? 'flex' : 'block',
        flexDirection: isHorizontal ? 'row-reverse' : 'column',
        transition: 'transform 0.3s',
        '&:hover': { transform: 'scale(1.03)' }
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height={isHorizontal ? 120 : 160}
          width={isHorizontal ? 100 : '100%'}
          image={product.image_url ? `http://localhost:3001/${product.image_url}` : '/placeholder.png'}
          alt={product.name}
          sx={{ borderRadius: isHorizontal ? '10px 0 0 10px' : '10px 10px 0 0', objectFit: 'cover' }}
        />
        <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
          <IconButton onClick={hasSizes ? handleClickOpen : () => handleAddToCart()}>
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Box>
      </Box>
      <CardContent sx={{ flex: isHorizontal ? 1 : 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold">{product.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{product.price} €</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{product.description}</Typography>
      </CardContent>
      {hasSizes && (
        <SizeDialog product={product} open={openDialog} onClose={handleCloseDialog} onConfirm={handleConfirmSize} />
      )}
    </Card>
  );
};

export default ProductCard;
