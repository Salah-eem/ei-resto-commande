"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCart,
  updateCartQuantity,
  removeFromCart,
} from "@/store/slices/cartSlice";
import { RootState } from "@/store/store";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Grid,
  Paper,
  Button,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
}

const CartDialog: React.FC<CartDialogProps> = ({ open, onClose }) => {
  const router = useRouter();
  const dispatch = useDispatch();

  const userId = useSelector((state: RootState) => state.user.userId)!;
  const cartItems = useSelector((state: RootState) => state.cart.items);

  // Calcul du total en n’ajoutant le prix d’un ingrédient de base que si quantity > 1
  const totalPrice = cartItems.reduce((total, item) => {
    let extrasUnitSum = 0;

    // 1) Pour chaque baseIngredient : si found.quantity > 1, on ajoute (quantity - 1) * basePrice
    (item.baseIngredients || []).forEach((baseIng: any) => {
      const found = (item.ingredients || []).find(
        (ing: any) => ing._id === baseIng._id
      );
      const basePrice = baseIng.price || 0;
      if (found && found.quantity && found.quantity > 1) {
        extrasUnitSum += basePrice * (found.quantity - 1);
      }
    });

    // 2) Pour les ingrédients qui ne sont pas des baseIngredients
    (item.ingredients || [])
      .filter(
        (ing: any) =>
          !(item.baseIngredients || []).some(
            (baseIng: any) => baseIng._id === ing._id
          )
      )
      .forEach((extra: any) => {
        extrasUnitSum += (extra.price || 0) * (extra.quantity || 1);
      });

    const unitPriceWithExtras = item.price + extrasUnitSum;
    return total + unitPriceWithExtras * item.quantity;
  }, 0);

  useEffect(() => {
    if (open && userId) {
      dispatch(fetchCart(userId) as any);
    }
  }, [open, userId, dispatch]);

  const handleQuantityChange = (
    itemId: string,
    productId: string,
    size: string | undefined,
    quantity: number,
    ingredients?: any[]
  ) => {
    if (!userId) return;

    if (quantity > 0) {
      dispatch(
        updateCartQuantity({
          userId,
          productId,
          size,
          quantity,
          ingredients: ingredients || [],
        }) as any
      );
    } else {
      dispatch(removeFromCart({ userId, itemId }) as any);
    }
  };

  const goToCart = () => {
    router.push("/cart");
    onClose();
  };

  const groupCartItems = (items: any[]) => {
    const groups: { [key: string]: any } = {};
    items.forEach((item) => {
      const baseIds = (item.baseIngredients || [])
        .map((i: any) => i._id)
        .sort()
        .join(",");
      const ingIds = (item.ingredients || [])
        .map((i: any) => `${i._id}:${i.quantity || 1}`)
        .sort()
        .join(",");
      const key = `${item.productId}-${item.size || "default"}-${baseIds}-${ingIds}`;
      if (!groups[key]) {
        groups[key] = { ...item };
      } else {
        groups[key].quantity += item.quantity;
      }
    });
    return Object.values(groups);
  };

  const groupedCartItems = groupCartItems(cartItems);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        My Cart
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {cartItems.length === 0 ? (
          <Typography align="center">Your cart is empty.</Typography>
        ) : (
          <Grid container spacing={2}>
            {groupedCartItems.map((item) => {
              // Recalcul du prix unitaire + extras pour chaque ligne
              let extrasUnitSum = 0;

              (item.baseIngredients || []).forEach((baseIng: any) => {
                const found = (item.ingredients || []).find(
                  (ing: any) => ing._id === baseIng._id
                );
                const basePrice = baseIng.price || 0;
                if (found && found.quantity && found.quantity > 1) {
                  extrasUnitSum += basePrice * (found.quantity - 1);
                }
              });

              (item.ingredients || [])
                .filter(
                  (ing: any) =>
                    !(item.baseIngredients || []).some(
                      (baseIng: any) => baseIng._id === ing._id
                    )
                )
                .forEach((extra: any) => {
                  extrasUnitSum += (extra.price || 0) * (extra.quantity || 1);
                });

              const hasExtras = extrasUnitSum > 0;
              const unitPriceWithExtras = item.price + extrasUnitSum;
              const lineTotal = unitPriceWithExtras * item.quantity;

              // Clé unique pour React
              const baseIds = (item.baseIngredients || [])
                .map((i: any) => i._id)
                .sort()
                .join(",");
              const ingIds = (item.ingredients || [])
                .map((i: any) => `${i._id}:${i.quantity || 1}`)
                .sort()
                .join(",");
              const uniqueKey = `${item.productId}-${
                item.size || "default"
              }-${baseIds}-${ingIds}`;

              return (
                <Grid item xs={12} key={uniqueKey}>
                  <Paper
                    sx={{
                      p: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{item.name}</Typography>

                      {hasExtras && (
                        <>
                          <Typography>
                            Unit price (with extras):{" "}
                            <strong>{unitPriceWithExtras.toFixed(2)}€</strong>
                          </Typography>
                          <Typography>
                            Quantity: {item.quantity} → Subtotal:{" "}
                            <strong>{lineTotal.toFixed(2)}€</strong>
                          </Typography>
                        </>
                      )}

                      {!hasExtras && (
                        <Typography>
                          Quantity: {item.quantity} → Subtotal:{" "}
                          <strong>{(item.price * item.quantity).toFixed(2)}€</strong>
                        </Typography>
                      )}

                      {item.size && <Typography>Size: {item.size}</Typography>}

                      {hasExtras && item.ingredients && item.baseIngredients && (
                        <Box sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Ingredients:
                          </Typography>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {/* Only display :
                                 • baseIng with quantity > 1  (with “xN”)
                                 • or removed baseIng (No…) */}
                            {(item.baseIngredients || []).map(
                              (baseIng: any) => {
                                const found = item.ingredients.find(
                                  (ing: any) => ing._id === baseIng._id
                                );
                                // Si found.quantity === 1, on ne l'affiche pas du tout
                                if (!found) {
                                  // retiré → “No baseIng.name”
                                  return (
                                    <li
                                      key={baseIng._id}
                                      style={{ color: "#888" }}
                                    >
                                      No {baseIng.name}
                                    </li>
                                  );
                                }
                                if (found.quantity > 1) {
                                  // plus d’une unité → “baseIng.name xN”
                                  return (
                                    <li key={baseIng._id}>
                                      {baseIng.name} x{found.quantity}
                                    </li>
                                  );
                                }
                                // found.quantity === 1 → on n'affiche rien
                                return null;
                              }
                            )}

                            {/* Extras ajoutés (informations en bleu) */}
                            {((item.ingredients || []).filter(
                              (ing: any) =>
                                !(item.baseIngredients || []).some(
                                  (baseIng: any) => baseIng._id === ing._id
                                )
                            )).map((extra: any) => (
                              <li
                                key={extra._id}
                                style={{ color: "#1976d2" }}
                              >
                                + {extra.name}
                                {extra.quantity && extra.quantity > 1
                                  ? ` x${extra.quantity}`
                                  : ""}
                                {extra.price
                                  ? ` (+${(
                                      extra.price *
                                      (extra.quantity || 1)
                                    ).toFixed(2)}€)`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                    </Box>

                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <IconButton
                        onClick={() =>
                          handleQuantityChange(
                            item._id,
                            item.productId,
                            item.size,
                            item.quantity - 1,
                            item.ingredients
                          )
                        }
                      >
                        <RemoveIcon />
                      </IconButton>

                      <Typography>{item.quantity}</Typography>

                      <IconButton
                        onClick={() =>
                          handleQuantityChange(
                            item._id,
                            item.productId,
                            item.size,
                            item.quantity + 1,
                            item.ingredients
                          )
                        }
                      >
                        <AddIcon />
                      </IconButton>

                      <IconButton
                        onClick={() =>
                          dispatch(
                            removeFromCart({
                              userId,
                              itemId: item._id,
                            }) as any
                          )
                        }
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="h6">
            Total: {totalPrice.toFixed(2)}€
          </Typography>
          <Button onClick={goToCart} variant="contained" sx={{ mt: 1 }}>
            Go to checkout
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default CartDialog;
