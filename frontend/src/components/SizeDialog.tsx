'use client';
import React, { useEffect, useState } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import { Product, ProductType } from '@/types/product';
import { SelectChangeEvent } from '@mui/material';
import IngredientDialog from './IngredientDialog';
import { useAppSelector } from '@/store/slices/hooks';

interface SizeDialogProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onConfirm: (size: string, quantity: number, extras: string[]) => void;
}

const SizeDialog: React.FC<SizeDialogProps> = ({ product, open, onClose, onConfirm }) => {
  const hasSizes = product.productType === ProductType.MULTIPLE_SIZES && product.sizes && product.sizes.length > 0;
  const defaultSize = hasSizes ? product.sizes![0].name : '';
  const defaultPrice = hasSizes ? product.sizes![0].price : product.basePrice || 0;

  const [size, setSize] = useState<string>(defaultSize);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(defaultPrice);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const allIngredients = useAppSelector((state) => state.ingredients.items);

  const availableSizes = hasSizes ? product.sizes : [];
  const extras = product.ingredients || [];

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = e.target.value;
    setSize(newSize);
    setSelectedExtras([]); // Reset extras when size changes
    updatePrice(newSize, quantity, []);
  };

  const handleQuantityChange = (e: SelectChangeEvent<number>) => {
    const q = parseInt(e.target.value.toString(), 10);
    setQuantity(q);
    updatePrice(size, q, selectedExtras);
  };

  const updatePrice = (sz: string, qty: number, extrasArr: string[]) => {
    const sizeObj = availableSizes?.find(s => s.name === sz);
    const base = sizeObj ? sizeObj.price : product.basePrice || 0;
    const extrasTotal = extrasArr.reduce((sum, id) => {
      const ing = extras.find(x => x._id === id);
      return sum + (ing?.price || 0);
    }, 0);
    setPrice((base + extrasTotal) * qty);
  };

  const handleSubmit = () => {
    onConfirm(size, quantity, selectedExtras);
    setIngredientDialogOpen(false);
    onClose();
  };

  // Recalcule le prix à chaque changement d'extras, de taille ou de quantité
  useEffect(() => {
    updatePrice(size, quantity, selectedExtras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExtras, size, quantity]);

  return (
    <>
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

          {/*  Size selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Choose your size:
            </Typography>
            <RadioGroup value={size} onChange={handleSizeChange}>
              {availableSizes?.map((sizeOption) => (
                <FormControlLabel
                  key={sizeOption.name}
                  value={sizeOption.name}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body1" fontWeight="bold">
                        {sizeOption.name}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {sizeOption.price.toFixed(2)} €
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

          <Button
            variant="outlined"
            color="primary"
            fullWidth
            sx={{ mb: 2 }}
            onClick={() => setIngredientDialogOpen(true)}
          >
            Customize ingredients
          </Button>

          {/* Quantity selection */}
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
            {`Add ${quantity} to order - ${price.toFixed(2)} €`}
          </Button>
        </DialogActions>
      </Dialog>
      <IngredientDialog
        open={ingredientDialogOpen}
        onClose={() => setIngredientDialogOpen(false)}
        onBack={() => setIngredientDialogOpen(false)}
        allIngredients={allIngredients}
        selectedExtras={selectedExtras}
        setSelectedExtras={setSelectedExtras}
        sizeLabel={size}
        product={product}
        priceCalculator={extrasArr => {
          const sizeObj = availableSizes?.find(s => s.name === size);
          const base = sizeObj ? sizeObj.price : product.basePrice || 0;
          const extrasTotal = extrasArr.reduce((sum, id) => {
            const ing = allIngredients.find((x: any) => x._id === id);
            return sum + (ing?.price || 0);
          }, 0);
          return (base + extrasTotal) * quantity;
        }}
        onSave={() => {
          setIngredientDialogOpen(false);
        }}
      />
    </>
  );
};

export default SizeDialog;
