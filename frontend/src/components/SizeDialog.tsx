'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Typography,
  Box,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Product } from '@/types';
import CloseIcon from '@mui/icons-material/Close';
import { SelectChangeEvent } from '@mui/material';


interface SizeDialogProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onConfirm: (size: string, price: number, quantity: number) => void;
}

const SizeDialog: React.FC<SizeDialogProps> = ({ product, open, onClose, onConfirm }) => {
  const [size, setSize] = useState<string>('regular');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(product.price);

  // Prix de base et suppléments pour chaque taille
  const sizePrices: any = {
    regular: { base: product.price, supplement: 0, description: '(25cm)' },
    medium: { base: product.price, supplement: 2, description: '(30cm)' },
    large: { base: product.price, supplement: 6, description: '(35cm)' },
    xxl: { base: product.price, supplement: 8, description: '(40cm)' },
  };

  const sizes = [
    { value: 'regular', label: 'Regular', ...sizePrices.regular },
    { value: 'medium', label: 'Medium', ...sizePrices.medium },
    { value: 'large', label: 'Large', ...sizePrices.large },
    { value: 'xxl', label: 'XXL', ...sizePrices.xxl },
  ];

  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedSize = event.target.value;
    setSize(selectedSize);
    updatePrice(selectedSize, quantity);
  };

  const handleQuantityChange = (event: SelectChangeEvent<number>) => {
    const selectedQuantity = parseInt(event.target.value.toString(), 10);
    setQuantity(selectedQuantity);
    updatePrice(size, selectedQuantity);
  };
  

  const updatePrice = (selectedSize: string, selectedQuantity: number) => {
    const basePrice = sizePrices[selectedSize].base + sizePrices[selectedSize].supplement;
    setPrice(basePrice * selectedQuantity);
  };

  const handleSubmit = () => {
    onConfirm(size, price, quantity);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {product.name}
        <IconButton onClick={onClose} sx={{ color: 'gray' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ textAlign: 'center', mb: 2, fontSize: '1rem', color: 'gray' }}>
          {product.description}
        </Typography>   

        {/* Sélection de la taille */}
        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Choose your size :
          </Typography>
          <RadioGroup value={size} onChange={handleSizeChange}>
            {sizes.map((sizeOption) => (
              <FormControlLabel
                key={sizeOption.value}
                value={sizeOption.value}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Box>
                      <Typography variant="body1" fontWeight="bold">
                        {sizeOption.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {sizeOption.description}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {sizeOption.supplement > 0 ? `+${sizeOption.supplement} €` : ''}
                    </Typography>
                  </Box>
                }
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  mb: 1,
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {/* Sélection de la quantité */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', mb: 3 }}>
            <FormControl size="small" sx={{ width: 60 }}>
                <Select
                  value={quantity}
                  onChange={handleQuantityChange}
                  sx={{
                      borderRadius: 2,
                      border: '1px solid #ddd',
                      backgroundColor: '#f5f5f5',
                      '& .MuiSelect-select': {
                      py: 1,
                      px: 2,
                      },
                  }}
                >
      {Array.from({ length: 10 }, (_, i) => i + 1).map((q) => (
        <MenuItem key={q} value={q}>
          {q}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        <Button onClick={handleSubmit} color="primary" variant="contained" sx={{ fontSize: '1rem', py: 1, width: '100%' }}>
          {`Ajouter ${quantity} à la commande - ${price.toFixed(2)} €`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SizeDialog;