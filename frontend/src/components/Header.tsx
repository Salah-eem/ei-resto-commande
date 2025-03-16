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
    <AppBar position="fixed" sx={{ backgroundColor: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        {/* Logo à gauche */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center" }}>
            <Image
              src="/logo.png"
              alt="RestoCommande Logo"
              width={160}
              height={50}
              style={{ objectFit: "contain" }}
            />
          </Link>
        </Box>

        {/* Liens de navigation à droite */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button color="primary" sx={{ fontWeight: "bold" }}>Menu</Button>
          </Link>
          <Link href="/my-orders" style={{ textDecoration: "none" }}>
            <Button color="primary" sx={{ fontWeight: "bold" }}>My Orders</Button>
          </Link>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Button color="primary" sx={{ fontWeight: "bold" }}>Login</Button>
          </Link>
        
          <IconButton color="primary" onClick={() => setCartOpen(true)}>
            <Badge badgeContent={totalItems} color="secondary">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Box>
      </Toolbar>
      <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
    </AppBar>
  );
};

export default Header;
/*
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
*/