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
import CartDialog from "./CartDialog";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { logout } from "@/store/slices/authSlice";
import { clearUser, fetchUserProfile } from "@/store/slices/userSlice";
import { useRouter } from "next/navigation";
import { Role } from "@/types/user";

// MUI Icons
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";

const Header = () => {
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const authToken = useSelector((state: RootState) => state.auth.token);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const isAdmin = userProfile?.role === Role.Admin;
  const isEmployee = userProfile?.role === Role.Employee;
  const isClient = userProfile?.role === Role.Client;

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
            {authToken && !isSidebarOpen && (
              <IconButton onClick={handleSidebarOpen} sx={{ color: "#008f68", mr: 2 }}>
                <FormatListBulletedIcon fontSize="medium" />
              </IconButton>
            )}

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

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {authToken && (
                <>
                  {isAdmin || isEmployee ? (
                    <>
                      <Link href="/take-order" style={{ textDecoration: "none" }}>
                        <Button startIcon={<AddShoppingCartIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          Take Order
                        </Button>
                      </Link>
                      <Link href="/live-orders" style={{ textDecoration: "none" }}>
                        <Button startIcon={<AccessTimeIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          Live Orders
                        </Button>
                      </Link>
                      <Link href="/view-orders" style={{ textDecoration: "none" }}>
                        <Button startIcon={<ListAltIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          View Orders
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href="/" style={{ textDecoration: "none" }}>
                        <Button startIcon={<RestaurantMenuIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          Menu
                        </Button>
                      </Link>
                      <Link href="/my-orders" style={{ textDecoration: "none" }}>
                        <Button startIcon={<ListAltIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          My Orders
                        </Button>
                      </Link>
                      <IconButton color="primary" onClick={() => setCartOpen(true)}>
                        <Badge badgeContent={totalItems} color="secondary">
                          <ShoppingCartIcon />
                        </Badge>
                      </IconButton>
                    </>
                  )}

                  {isAdmin && (
                    <Link href="/dashboard" style={{ textDecoration: "none" }}>
                      <Button startIcon={<DashboardIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                        Dashboard
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {!authToken && (
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
            </Box>
          </Toolbar>
        </Container>

        <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
      </AppBar>

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
                  <AccountCircleIcon />
                </ListItemIcon>
                <ListItemText primary="Profile" />
              </ListItemButton>
            </Link>

            {isAdmin && (
              <>
                <Link href="/manage-users" style={{ textDecoration: "none", color: "inherit" }}>
                  <ListItemButton onClick={handleSidebarClose}>
                    <ListItemIcon><GroupIcon /></ListItemIcon>
                    <ListItemText primary="Manage Users" />
                  </ListItemButton>
                </Link>

                <Link href="/manage-menu" style={{ textDecoration: "none", color: "inherit" }}>
                  <ListItemButton onClick={handleSidebarClose}>
                    <ListItemIcon><RestaurantMenuIcon /></ListItemIcon>
                    <ListItemText primary="Manage Menu" />
                  </ListItemButton>
                </Link>
              </>
            )}

            <ListItemButton
              onClick={() => {
                handleSidebarClose();
                handleLogout();
              }}
            >
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Header;
