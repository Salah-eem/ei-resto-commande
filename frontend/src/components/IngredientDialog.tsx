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
  crossedOut: { [id: string]: boolean };
  setCrossedOut: React.Dispatch<React.SetStateAction<{ [id: string]: boolean }>>;
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
  crossedOut,
  setCrossedOut,
}) => {
  // Ajoute une fonction utilitaire pour savoir si un ingrédient de base est barré
  const isCrossed = (id: string) => crossedOut[id] === true;

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
            const isBase = product?.ingredients?.some(i => i._id === ing._id) || false;
            const crossed = isCrossed(ing._id);
            // Quantité calculée : 1 (de base) + nombre d'occurrences dans selectedExtras
            const extraCount = selectedExtras.filter((i) => i === ing._id).length;
            const quantity = crossed ? 0 : (isBase ? 1 : 0) + extraCount;
            const canBeCrossed = isBase;
            return (
              <Box key={ing._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, opacity: crossed ? 0.5 : 1 }}>
                <Box>
                  <Typography variant="body1" sx={crossed ? { textDecoration: 'line-through' } : {}}>{ing.name}</Typography>
                  <Typography variant="caption" sx={crossed ? { textDecoration: 'line-through' } : {}}>+{ing.price?.toFixed(2) ?? '0.00'} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {canBeCrossed && quantity === 1 && !crossed ? (
                    <IconButton
                      onClick={() => setCrossedOut(prev => ({ ...prev, [ing._id]: true }))}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color="error"
                      aria-label="Cross out"
                    >
                      <CancelIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  ) : null}
                  {(!canBeCrossed || quantity > (isBase ? 1 : 0)) && !crossed && (
                    <IconButton
                      onClick={() => {
                        if (quantity > (isBase ? 1 : 0)) {
                          // Retire une occurrence de l'id dans selectedExtras (ne modifie pas ing)
                          const idx = selectedExtras.lastIndexOf(ing._id);
                          if (idx !== -1) {
                            const newArr = [...selectedExtras];
                            newArr.splice(idx, 1);
                            setSelectedExtras(newArr);
                          }
                        }
                      }}
                      sx={{ border: '1px solid #ddd', borderRadius: '50%', p: 0.5 }}
                      color={quantity > (isBase ? 1 : 0) ? 'error' : 'default'}
                      aria-label="Remove"
                      disabled={quantity === (isBase ? 1 : 0)}
                    >
                      <RemoveIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  )}
                  <Typography sx={{ minWidth: 18, textAlign: 'center' }}>{quantity}</Typography>
                  {!crossed ? (
                    <IconButton
                      onClick={() => {
                        if (quantity < 2) {
                          setSelectedExtras([...selectedExtras, ing._id]);
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
