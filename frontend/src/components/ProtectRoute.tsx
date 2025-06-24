// ProtectRoute.tsx
"use client";
import { useAppSelector } from "@/store/slices/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/user";
import { CircularProgress, Box } from "@mui/material";

export default function ProtectRoute({ allowedRoles, children }: { allowedRoles: Role[]; children: React.ReactNode }) {
  const user = useAppSelector((state) => state.user.profile);
  const userLoading = useAppSelector((state) => state.user.loading);
  const token = useAppSelector((state) => state.auth.token);
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Attendre un court délai pour permettre à l'AuthInitializer de faire son travail
    const initTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000);

    return () => clearTimeout(initTimer);
  }, []);

  useEffect(() => {
    // Ne pas rediriger tant que l'initialisation n'est pas terminée ou que les données utilisateur sont en cours de chargement
    if (isInitializing || userLoading) return;

    if (!token) {
      // Pas de token, rediriger vers login
      router.replace("/login");
    } else if (!user) {
      // Token présent mais pas de profil utilisateur, rediriger vers login
      router.replace("/login");
    } else if (!allowedRoles.includes(user.role)) {
      // Utilisateur connecté mais pas les bonnes permissions
      router.replace("/access-denied");
    }  }, [user, token, userLoading, isInitializing, allowedRoles, router]);

  // Afficher un loader pendant l'initialisation ou le chargement des données utilisateur
  if (isInitializing || userLoading || (token && !user)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Si pas de token ou pas d'utilisateur, ou permissions insuffisantes, ne rien afficher (la redirection va se faire)
  if (!token || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
