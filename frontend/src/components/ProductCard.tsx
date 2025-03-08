'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardMedia, Typography, IconButton, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { getUserId } from '@/utils/user';
import { Product, ProductType } from '@/types/product';
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

  useEffect(() => {
    setUserId(getUserId());
  }, []);

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
        price: product.productType === ProductType.SINGLE_PRICE ? product.basePrice! : product.sizes?.find(s => s.name === size)?.price || 0,
        quantity,
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
          <IconButton onClick={product.productType === ProductType.MULTIPLE_SIZES ? handleClickOpen : () => handleAddToCart(undefined, 1)}>
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Box>
      </Box>
      <CardContent sx={{ flex: isHorizontal ? 1 : 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold">{product.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {product.productType === ProductType.SINGLE_PRICE
            ? `${product.basePrice?.toFixed(2)} €`
            : `À partir de ${product.sizes?.[0].price.toFixed(2)} €`}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{product.description}</Typography>
      </CardContent>
      {product.productType === ProductType.MULTIPLE_SIZES && (
        <SizeDialog product={product} open={openDialog} onClose={handleCloseDialog} onConfirm={handleConfirmSize} />
      )}
    </Card>
  );
};

export default ProductCard;
