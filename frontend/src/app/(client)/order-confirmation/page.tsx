"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "@/store/slices/cartSlice";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { RootState } from "@/store/store";

const OrderConfirmationContent: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams(); // ✅ OK car dans Suspense
  const success = searchParams.get("success");
  const userId = useSelector((state: RootState) => state.user.userId)!;

  useEffect(() => {
    if (success === "true") {
      dispatch(clearCart(userId) as any);
    }
  }, [success, dispatch, userId]);

  if (success === "true") {
    return (
      <Box sx={{ textAlign: "center", mt: 5 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 60, color: "green" }} />
        <Typography variant="h4" fontWeight="bold" mt={2}>
          🎉 Paiement réussi !
        </Typography>
        <Typography variant="h6" color="text.secondary" mt={1}>
          Merci pour votre commande. Nous la préparons avec soin.
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 3 }} onClick={() => router.push("/")}>
          Retour à l'accueil
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center", mt: 5 }}>
      <CircularProgress />
      <Typography variant="h6" mt={2}>Vérification de votre paiement...</Typography>
    </Box>
  );
};

const OrderConfirmation: React.FC = () => {
  return (
    <Suspense fallback={<p>Chargement...</p>}>
      <OrderConfirmationContent />
    </Suspense>
  );
};

export default OrderConfirmation;
