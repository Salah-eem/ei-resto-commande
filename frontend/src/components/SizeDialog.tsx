"use client";

import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { Product, ProductType } from "@/types/product";
import { Ingredient } from "@/types/ingredient";
import { SelectChangeEvent } from "@mui/material";
import IngredientDialog from "./IngredientDialog";
import { useAppSelector } from "@/store/slices/hooks";
import { IngredientWithQuantity } from "@/types/cartItem";

interface SizeDialogProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onConfirm: (
    size: string,
    quantity: number,
    baseIngredients: IngredientWithQuantity[],
    ingredients: IngredientWithQuantity[]
  ) => void;
}

const SizeDialog: React.FC<SizeDialogProps> = ({
  product,
  open,
  onClose,
  onConfirm,
}) => {
  const hasSizes =
    product.productType === ProductType.MULTIPLE_SIZES &&
    product.sizes &&
    product.sizes.length > 0;
  const defaultSize = hasSizes ? product.sizes![0].name : "";
  const defaultPrice = hasSizes
    ? product.sizes![0].price
    : product.basePrice || 0;

  const [size, setSize] = useState<string>(defaultSize);
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(defaultPrice);
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [crossedOut, setCrossedOut] = React.useState<{ [id: string]: boolean }>(
    {}
  );
  const allIngredients = useAppSelector((state) => state.ingredients.items);

  const availableSizes = hasSizes ? product.sizes : [];
  // product.ingredients représente uniquement la liste des ingrédients de base
  const baseList = product.ingredients || [];

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = e.target.value;
    setSize(newSize);
    setSelectedExtras([]); // Reset extras when size changes
    updatePrice(newSize, quantity, selectedExtras);
  };

  const handleQuantityChange = (e: SelectChangeEvent<number>) => {
    const q = parseInt(e.target.value.toString(), 10);
    setQuantity(q);
    updatePrice(size, q, selectedExtras);
  };

  const updatePrice = (
    sz: string,
    qty: number,
    extrasArr: string[]
  ) => {
    const sizeObj = availableSizes?.find((s) => s.name === sz);
    const base = sizeObj ? sizeObj.price : product.basePrice || 0;

    let extrasTotal = 0;

    // 1) Pour chaque ingrédient de base, si on a sélectionné plusieurs (via selectedExtras),
    //    chaque unité au-delà de la première coûte son prix.
    baseList.forEach((baseIng) => {
      const crossed = crossedOut[baseIng._id];
      // Nombre d'extras pour ce baseIng dans selectedExtras
      const extraCount =
        extrasArr.filter((i) => i === baseIng._id).length;
      const qtyIng = crossed ? 0 : 1 + extraCount;
      if (qtyIng > 1) {
        extrasTotal += (qtyIng - 1) * (baseIng.price || 0);
      }
    });

    // 2) Pour chaque ingrédient dans selectedExtras qui n'est pas dans la base,
    //    son prix s'ajoute en totalité * quantity.
    extrasArr.forEach((id) => {
      // On cherche l'ingrédient dans allIngredients (et non dans baseList)
      const ing = allIngredients.find((x) => x._id === id);
      if (ing && !baseList.some((b) => b._id === id)) {
        extrasTotal += ing.price || 0;
      }
    });

    setPrice((base + extrasTotal) * qty);
  };

  const handleSubmit = () => {
    // 1. On récupère tous les ingrédients de base définis pour le produit
    const baseIngredients = product.ingredients || [];

    // 2. Calcul des quantités pour chaque ingrédient (base ou extra)
    const ingredientQuantities: { [id: string]: number } = {};
    allIngredients.forEach((ing) => {
      const isBase = baseIngredients.some((b) => b._id === ing._id);
      const crossed = crossedOut[ing._id];
      const extraCount = selectedExtras.filter((i) => i === ing._id).length;
      ingredientQuantities[ing._id] = crossed ? 0 : (isBase ? 1 : 0) + extraCount;
    });

    // 3. On construit la liste finale des ingrédients (quantité > 0) pour le panier
    const finalIngredientsList = allIngredients
      .filter((ing) => ingredientQuantities[ing._id] > 0)
      .map((ing) => ({
        _id: ing._id,
        ingredient: ing,
        quantity: ingredientQuantities[ing._id] * quantity,
      }));

    // 4. On conserve tous les ingrédients de base, même ceux avec quantité = 0
    const baseIngredientsWithQty = baseIngredients.map((ing) => ({
      _id: ing._id,
      ingredient: ing,
      quantity: (ingredientQuantities[ing._id] ?? 0) * quantity,
    }));

    // 5. On passe la composition au callback onConfirm
    onConfirm(size, quantity, baseIngredientsWithQty, finalIngredientsList);

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
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {product.name}
          <IconButton onClick={onClose} sx={{ color: "gray" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              textAlign: "center",
              mb: 2,
              fontSize: "1rem",
              color: "gray",
            }}
          >
            {product.description}
          </Typography>

          {/* Size selection */}
          <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{ mb: 2 }}
            >
              Choose your size:
            </Typography>
            <RadioGroup value={size} onChange={handleSizeChange}>
              {availableSizes?.map((sizeOption) => (
                <FormControlLabel
                  key={sizeOption.name}
                  value={sizeOption.name}
                  control={<Radio />}
                  label={
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        {sizeOption.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color="primary"
                      >
                        {sizeOption.price.toFixed(2)} €
                      </Typography>
                    </Box>
                  }
                  sx={{
                    border: "1px solid #ddd",
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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              mb: 3,
            }}
          >
            <FormControl size="small" sx={{ width: 60 }}>
              <Select
                value={quantity}
                onChange={handleQuantityChange}
                sx={{
                  borderRadius: 2,
                  border: "1px solid #ddd",
                  backgroundColor: "#f5f5f5",
                  "& .MuiSelect-select": {
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

        <DialogActions sx={{ justifyContent: "center", p: 2 }}>
          <Button
            onClick={handleSubmit}
            color="primary"
            variant="contained"
            sx={{ fontSize: "1rem", py: 1, width: "100%" }}
          >
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
        // Met à jour le priceCalculator pour qu’il cherche dans allIngredients
        priceCalculator={(extrasArr) => {
          const sizeObj = availableSizes?.find((s) => s.name === size);
          const base = sizeObj ? sizeObj.price : product.basePrice || 0;
          let extrasTotal = 0;

          // 1) Pour chaque ingrédient de base, on compte chaque unité au-delà de la première
          baseList.forEach((baseIng) => {
            const crossed = crossedOut[baseIng._id];
            const extraCount =
              extrasArr.filter((i) => i === baseIng._id).length;
            const qtyIng = crossed ? 0 : 1 + extraCount;
            if (qtyIng > 1) {
              extrasTotal += (qtyIng - 1) * (baseIng.price || 0);
            }
          });

          // 2) Pour les ingrédients non‐base, on regarde dans allIngredients
          extrasArr.forEach((id) => {
            if (!baseList.some((b) => b._id === id)) {
              const ing = allIngredients.find((x) => x._id === id);
              if (ing) {
                extrasTotal += ing.price || 0;
              }
            }
          });

          return (base + extrasTotal) * quantity;
        }}
        onSave={() => {
          setIngredientDialogOpen(false);
        }}
        crossedOut={crossedOut}
        setCrossedOut={setCrossedOut}
      />
    </>
  );
};

export default SizeDialog;
