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
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import CartDialog from "./CartDialog";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import { clearUser, fetchUserProfile } from "@/store/slices/userSlice";
import { useRouter } from "next/navigation";

const Header = () => {
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const authToken = useSelector((state: RootState) => state.auth.token);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    if (authToken && !userProfile) {
      dispatch(fetchUserProfile() as any);
    }
  }, [authToken, userProfile, dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearUser());
    router.push("/");
  };

  const handleSidebarOpen = () => setSidebarOpen(true);
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "#fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          py: 1,
          zIndex: 1300,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Bouton pour ouvrir la sidebar placé à l'extrême gauche (affiché seulement si l'utilisateur est connecté et la sidebar est fermée) */}
            {authToken && !isSidebarOpen && (
              <IconButton onClick={handleSidebarOpen} sx={{ color: "#008f68", mr: 2 }}>
                <FormatListBulletedIcon fontSize="medium" />
              </IconButton>
            )}

            {/* Logo : Si la sidebar est ouverte, aligner le logo à gauche ; sinon, le centrer */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                <Image
                  src="/logo.png"
                  alt="RestoCommande Logo"
                  width={160}
                  height={50}
                  style={{ objectFit: "contain" }}
                />
              </Link>
            </Box>

            {/* Liens de navigation et actions à droite */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <Button color="primary" sx={{ fontWeight: "bold" }}>
                  Menu
                </Button>
              </Link>
              <Link href="/my-orders" style={{ textDecoration: "none" }}>
                <Button color="primary" sx={{ fontWeight: "bold" }}>
                  My Orders
                </Button>
              </Link>
              {authToken ? (
                <>
                  <Button
                    sx={{
                      fontWeight: "bold",
                      border: "2px solid #008f68",
                      borderRadius: "4px",
                      backgroundColor: "#008f68",
                      color: "#fff",
                      ":hover": { backgroundColor: "#fdb913", color: "#fff", borderColor: "#fdb913" },
                      transition: "background-color 0.3s",
                    }}
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <Button
                    color="secondary"
                    sx={{
                      fontWeight: "bold",
                      border: "2px solid #008f68",
                      borderRadius: "4px",
                      backgroundColor: "#008f68",
                      color: "#fff",
                      ":hover": { backgroundColor: "#fdb913", color: "#fff", borderColor: "#fdb913" },
                      transition: "background-color 0.3s",
                    }}
                  >
                    Login
                  </Button>
                </Link>
              )}
              <IconButton color="primary" onClick={() => setCartOpen(true)}>
                <Badge badgeContent={totalItems} color="secondary">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
        <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer anchor="left" open={isSidebarOpen} onClose={handleSidebarClose}>
        <Box sx={{ width: 250, p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, mt: 10 }}>
            <Typography variant="h6" sx={{ color: "#008f68", fontWeight: "bold" }}>
              {userProfile ? `Hello, ${userProfile.firstName}` : "Hello"}
            </Typography>
            <IconButton onClick={handleSidebarClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <List>
            <Link href="/profile" style={{ textDecoration: "none", color: "inherit" }}>
              <ListItemButton onClick={handleSidebarClose}>
                <ListItemIcon>
                  <AccountCircleIcon sx={{ color: "#008f68" }} />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </Link>
            {/* Vous pouvez ajouter d'autres éléments ici si nécessaire */}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
