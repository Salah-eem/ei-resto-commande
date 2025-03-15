"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AppBar,
  Toolbar,
  Button,
  Container,
  Box,
  IconButton,
  Badge,
  Typography,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CartDialog from "./CartDialog";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import { clearUser, fetchUserProfile } from "@/store/slices/userSlice";
import { useRouter } from 'next/navigation';


const Header = () => {
  const [isCartOpen, setCartOpen] = useState(false);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const authToken = useSelector((state: RootState) => state.auth.token);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const dispatch = useDispatch();
  const router = useRouter();

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    // Si l'utilisateur est connecté et que son profil n'est pas encore chargé, on le récupère
    if (authToken && !userProfile) {
      dispatch(fetchUserProfile() as any);
    }
  }, [authToken, userProfile, dispatch]);

  const handleLogout = () => {
    // Supprimer le token de l'authentification
    dispatch(logout());
    // Réinitialiser l'état utilisateur en générant un nouveau guestId
    dispatch(clearUser());
    // Rediriger l'utilisateur vers la page d'accueil
    router.push('/');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: "#fff",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Link href="/">
            <Image src="/logo.png" alt="RestoCommande Logo" width={120} height={40} />
          </Link>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link href="/">
              <Button sx={{ color: "black", fontWeight: "bold" }}>Menu</Button>
            </Link>
            <Link href="/my-orders">
              <Button sx={{ color: "black", fontWeight: "bold" }}>Commandes</Button>
            </Link>
            {authToken ? (
              <>
                <Typography variant="body1" sx={{ color: "black" }}>
                  Bonjour{" "}
                  {userProfile
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "Utilisateur"}
                </Typography>
                <Button
                  sx={{ color: "black", fontWeight: "bold" }}
                  onClick={handleLogout}
                >
                  Déconnexion
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button sx={{ color: "black", fontWeight: "bold" }}>Connexion</Button>
              </Link>
            )}
            <IconButton onClick={() => setCartOpen(true)}>
              <Badge badgeContent={totalItems} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
      <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
    </AppBar>
  );
};

export default Header;
