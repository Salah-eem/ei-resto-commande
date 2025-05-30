"use client";
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CancelIcon from '@mui/icons-material/Cancel';
import { Ingredient } from '@/types/ingredient';
import { Product } from '@/types/product';

interface IngredientDialogProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  allIngredients: Ingredient[];
  selectedExtras: string[];
  setSelectedExtras: (ids: string[]) => void;
  sizeLabel?: string;
  product?: Product;
  priceCalculator?: (selected: string[]) => number;
  onSave?: () => void;
}

const IngredientDialog: React.FC<IngredientDialogProps> = ({
  open,
  onClose,
  onBack,
  allIngredients,
  selectedExtras,
  setSelectedExtras,
  sizeLabel,
  product,
  priceCalculator,
  onSave,
}) => {
  const [crossedOut, setCrossedOut] = React.useState<{ [id: string]: boolean }>({});
  const getQuantity = (id: string) => selectedExtras.filter((i) => i === id).length;

  return (
    <Dialog open={open} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, fontWeight: 600, fontSize: 18 }}>
          {sizeLabel ? `(${sizeLabel}) ` : ''}{product?.name || 'Ingredients'}
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'gray' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
          Choose your extras.
        </Typography>
        <Divider />
        <Box sx={{ mt: 2 }}>
          {allIngredients.length === 0 && (
            <Typography color="text.secondary">No ingredients available.</Typography>
          )}
          {allIngredients.map(ing => {
            const quantity = getQuantity(ing._id);
            const isCrossed = crossedOut[ing._id] || false;
            const canBeCrossed = product?.ingredients?.some(i => i._id === ing._id) || false;
            return (
              <Box key={ing._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, opacity: isCrossed ? 0.5 : 1 }}>
                <Box>
                  <Typography variant="body1" sx={isCrossed ? { textDecoration: 'line-through' } : {}}>{ing.name}</Typography>
                  <Typography variant="caption" sx={isCrossed ? { textDecoration: 'line-through' } : {}}>+{ing.price?.toFixed(2) ?? '0.00'} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {canBeCrossed && quantity === 0 && !isCrossed ? (
                    <IconButton
                      onClick={() => setCrossedOut(prev => ({ ...prev, [ing._id]: true }))}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color="error"
                      aria-label="Cross out"
                    >
                      <CancelIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  ) : null}
                  {(!canBeCrossed || quantity > 0) && (
                    <IconButton
                      onClick={() => {
                        if (quantity > 0) {
                          const idx = selectedExtras.findIndex(i => i === ing._id);
                          if (idx !== -1) {
                            const newArr = [...selectedExtras];
                            newArr.splice(idx, 1);
                            setSelectedExtras(newArr);
                          }
                        }
                      }}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color={quantity > 0 ? 'error' : 'default'}
                      aria-label="Remove"
                      disabled={quantity === 0}
                    >
                      <RemoveIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                  <Typography sx={{ minWidth: 18, textAlign: 'center' }}>{quantity}</Typography>
                  {(!isCrossed) ? (
                    <IconButton
                      onClick={() => {
                        if (quantity < 2) {
                          setSelectedExtras([...selectedExtras, ing._id]);
                          if (isCrossed) setCrossedOut(prev => ({ ...prev, [ing._id]: false }));
                        }
                      }}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color={quantity < 2 ? 'primary' : 'default'}
                      aria-label="Add"
                      disabled={quantity >= 2}
                    >
                      <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  ) : (
                    <IconButton
                      onClick={() => {
                        setCrossedOut(prev => ({ ...prev, [ing._id]: false }));
                      }}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color="primary"
                      aria-label="Reactivate"
                    >
                      <AddIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                  </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          centerRipple
          fullWidth
          sx={{ py: 1, }}
          onClick={onSave}
        >
          Save{priceCalculator ? ` • ${(priceCalculator(selectedExtras)).toFixed(2)} €` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IngredientDialog;
