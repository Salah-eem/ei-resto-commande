'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardMedia, Typography, IconButton, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LikeIcon from '@mui/icons-material/ThumbUpAltOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';
import { Product, ProductType } from '@/types/product';
import { Ingredient } from '@/types/ingredient';
import SizeDialog from './SizeDialog';
import { RootState } from '@/store/store';
import { capitalizeFirstLetter } from '@/utils/functions.utils';
import { IngredientWithQuantity } from '@/types/cartItem';

interface ProductStats {
  productId: string;
  totalOrders: number;
  totalLikes: number;
  likePercentage: number;
}

interface ProductCardProps {
  product: Product;
  isHorizontal?: boolean;
  stats?: ProductStats;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isHorizontal = false, stats }) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL!;
  const dispatch = useDispatch();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const userId = useSelector((state: RootState) => state.user.userId);  
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const handleClickOpen = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);

  const handleConfirmSize = (size: string, quantity: number, baseIngredients: IngredientWithQuantity[], ingredients: IngredientWithQuantity[]) => {
    setSelectedSize(size);
    // Utilise la quantité réelle reçue pour chaque ingrédient, et conserve la référence ingredient
    const baseWithQty: IngredientWithQuantity[] = (baseIngredients || []).map(ing => ({
      _id: ing._id,
      quantity: ing.quantity ?? 1,
      ingredient: ing.ingredient ?? undefined,
    }));
    const ingWithQty: IngredientWithQuantity[] = (ingredients || []).map(ing => ({
      _id: ing._id,
      quantity: ing.quantity ?? 1,
      ingredient: ing.ingredient ?? undefined,
    }));
    handleAddToCart(size, quantity, baseWithQty, ingWithQty);
    handleCloseDialog();
  };

  const handleAddToCart = (size?: string, quantity: number = 1, baseIngredients?: IngredientWithQuantity[], ingredients?: IngredientWithQuantity[]) => {
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
        baseIngredients: (baseIngredients ?? []).map(ing => ({
          _id: ing._id,
          quantity: ing.quantity ?? 1,
          ingredient: ing.ingredient ?? undefined,
        })),
        ingredients: (ingredients ?? []).map(ing => ({
          _id: ing._id,
          quantity: ing.quantity ?? 1,
          ingredient: ing.ingredient ?? undefined,
        })),
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
        '&:hover': { transform: isOutOfStock ? undefined : 'scale(1.03)' },
        opacity: isOutOfStock ? 0.5 : 1,
        pointerEvents: isOutOfStock ? 'none' : 'auto',
        filter: isOutOfStock ? 'grayscale(0.7)' : undefined,
      }}
    >
      <Box sx={{ position: 'relative', display: 'flex' }}>
        <CardMedia
          component="img"
          image={product.image_url ? `${API_URL}/${product.image_url}` : '/alt-pizza.jpg'}
          alt={product.name}
          onError={e => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/alt-pizza.jpg') target.src = '/alt-pizza.jpg';
          }}
          sx={{
            width: isHorizontal ? 150 : '100%',
            height: isHorizontal ? '100%' : 160,
            borderRadius: isHorizontal ? '10px 0 0 10px' : '10px 10px 0 0',
            objectFit: 'cover',
          }}
        />
        {isOutOfStock && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: isHorizontal ? '10px 0 0 10px' : '10px 10px 0 0',
            zIndex: 2,
          }}>
            <Typography variant="h6" sx={{ color: 'error.main' }} fontWeight={700}>
              Victim of its own success
            </Typography>
          </Box>
        )}
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
            {capitalizeFirstLetter(product.name)}
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
          {/* Statistiques commandes/likes */}
          {stats && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LikeIcon sx={{ fontSize: 'small', }} />
                <Typography variant="caption" color="primary">
                  {stats.likePercentage}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                ({stats.totalOrders})
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
      {product.productType === ProductType.MULTIPLE_SIZES && (
        <SizeDialog product={product} open={openDialog} onClose={handleCloseDialog} onConfirm={handleConfirmSize} />
      )}
    </Card>
  );
};

export default ProductCard;
