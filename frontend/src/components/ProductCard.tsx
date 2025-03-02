// ProductCard.tsx
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardMedia, Typography, IconButton, Box } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { Product } from '@/types';
import SizeDialog from './SizeDialog';


interface ProductCardProps {
  product: Product;
  isHorizontal?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isHorizontal = false }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSize, setSelectedSize] = useState('regular');

  const handleClickOpen = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
  const handleConfirmSize = (size: string) => setSelectedSize(size);

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
          image={`http://localhost:3001/${product.image_url}`}
          alt={product.name}
          sx={{ borderRadius: isHorizontal ? '10px 0 0 10px' : '10px 10px 0 0', objectFit: 'cover' }}
        />
        <Box sx={{ position: 'absolute', bottom: 10, right: 10 }}>
          <IconButton onClick={handleClickOpen}>
            <AddCircleIcon fontSize="large" />
          </IconButton>
        </Box>
      </Box>
      <CardContent sx={{ flex: isHorizontal ? 1 : 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h6" fontWeight="bold">{product.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{product.price} €</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{product.description}</Typography>
      </CardContent>
      <SizeDialog product={product} open={openDialog} onClose={handleCloseDialog} onConfirm={handleConfirmSize} />
    </Card>
  );
};

export default ProductCard;

