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
import { DeliveryDining } from "@mui/icons-material";

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

  const handleSidebarOpen = () => setSidebarOpen(!isSidebarOpen);
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "#fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          py: { xs: 0.5, md: 1 },
          zIndex: 1300,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: { xs: 56, sm: 64 } }}>
            {/* Sidebar IconButton always visible on all screens if logged in */}
            {authToken && (
              <IconButton onClick={handleSidebarOpen} sx={{ color: "#008f68", mr: { xs: 1, md: 2 }, display: "flex" }}>
                <FormatListBulletedIcon fontSize="medium" />
              </IconButton>
            )}

            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: { xs: "center", md: "flex-start" },
                alignItems: "center",
              }}
            >
              <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                <Image
                  src="/logo.png"
                  alt="RestoCommande Logo"
                  width={120}
                  height={40}
                  style={{ objectFit: "contain", width: "auto", height: "40px" }}
                  sizes="(max-width: 600px) 120px, 160px"
                />
              </Link>
            </Box>

            {/* Desktop actions */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 }}>
              {authToken && (
                <>
                  {isAdmin || isEmployee ? (
                    <>
                      <Link href="/take-order/new" style={{ textDecoration: "none" }}>
                        <Button startIcon={<AddShoppingCartIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          Take Order
                        </Button>
                      </Link>
                      <Link href="/live-orders" style={{ textDecoration: "none" }}>
                        <Button startIcon={<AccessTimeIcon />} color="primary" sx={{ fontWeight: "bold" }}>
                          Live Orders
                        </Button>
                      </Link>
                      <Link href="/delivery-orders" style={{ textDecoration: "none" }}>
                        <Button startIcon={<DeliveryDining />} color="primary" sx={{ fontWeight: "bold" }}>
                          Delivery Orders
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
                <>
                  <IconButton color="primary" onClick={() => setCartOpen(true)}>
                    <Badge badgeContent={totalItems} color="secondary">
                      <ShoppingCartIcon />
                    </Badge>
                  </IconButton>
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
                </>
              )}
            </Box>

            {/* Mobile actions: hamburger always visible if logged in, cart/login if not */}
            <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
              {!authToken ? (
                <>
                  <IconButton color="primary" onClick={() => setCartOpen(true)}>
                    <Badge badgeContent={totalItems} color="secondary">
                      <ShoppingCartIcon />
                    </Badge>
                  </IconButton>
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
                        fontSize: "0.85rem",
                        px: 1.5,
                        minWidth: 0,
                      }}
                    >
                      Login
                    </Button>
                  </Link>
                </>
              ) : null}
            </Box>
          </Toolbar>
        </Container>

        <CartDialog open={isCartOpen} onClose={() => setCartOpen(false)} />
      </AppBar>

      {/* Drawer: add all actions for mobile */}
      <Drawer anchor="left" open={isSidebarOpen} onClose={handleSidebarClose}>
        <Box sx={{ width: { xs: 280, sm: 320 }, p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, mt: 10 }}>
            <Typography variant="h6" sx={{ color: "#008f68", fontWeight: "bold", fontSize: { xs: "1rem", sm: "1.25rem" } }}>
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

            {/* Drawer actions: show all except those already in AppBar (header) on desktop, show all on mobile */}
            {authToken && (
              <>
                {/* On mobile: show all actions for admin/employee */}
                {(isAdmin || isEmployee) && (
                  <Box sx={{ display: { xs: "block", md: "none" } }}>
                    <Link href="/take-order/new" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><AddShoppingCartIcon /></ListItemIcon>
                        <ListItemText primary="Take Order" />
                      </ListItemButton>
                    </Link>
                    <Link href="/live-orders" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><AccessTimeIcon /></ListItemIcon>
                        <ListItemText primary="Live Orders" />
                      </ListItemButton>
                    </Link>
                    <Link href="/delivery-orders" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><DeliveryDining /></ListItemIcon>
                        <ListItemText primary="Delivery Orders" />
                      </ListItemButton>
                    </Link>
                    <Link href="/view-orders" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><ListAltIcon /></ListItemIcon>
                        <ListItemText primary="View Orders" />
                      </ListItemButton>
                    </Link>
                    <Link href="/dashboard" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><DashboardIcon /></ListItemIcon>
                        <ListItemText primary="Dashboard" />
                      </ListItemButton>
                    </Link>
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
                  </Box>
                )}
                {/* On mobile: show all actions for client */}
                {isClient && (
                  <Box sx={{ display: { xs: "block", md: "none" } }}>
                    <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><RestaurantMenuIcon /></ListItemIcon>
                        <ListItemText primary="Menu" />
                      </ListItemButton>
                    </Link>
                    <Link href="/my-orders" style={{ textDecoration: "none", color: "inherit" }}>
                      <ListItemButton onClick={handleSidebarClose}>
                        <ListItemIcon><ListAltIcon /></ListItemIcon>
                        <ListItemText primary="My Orders" />
                      </ListItemButton>
                    </Link>
                    <ListItemButton onClick={() => { setCartOpen(true); handleSidebarClose(); }}>
                      <ListItemIcon><ShoppingCartIcon /></ListItemIcon>
                      <ListItemText primary="Cart" />
                      <Badge badgeContent={totalItems} color="secondary" sx={{ ml: 1 }}>
                        {/* visually hidden, just for badge */}
                      </Badge>
                    </ListItemButton>
                  </Box>
                )}
                {/* On desktop: show only admin/employee management actions not in AppBar */}
                {(isAdmin || isEmployee) && (
                  <Box sx={{ display: { xs: "none", md: "block" } }}>
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
                  </Box>
                )}
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
