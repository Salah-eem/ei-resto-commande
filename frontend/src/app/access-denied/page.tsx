'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/slices/hooks';
import { RootState } from '@/store/store';
import { Role } from '@/types/user';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';

export default function AccessDeniedPage() {
  const router = useRouter();
  const user = useAppSelector((state: RootState) => state.user?.profile);
  const userLoading = useAppSelector((state: RootState) => state.user?.loading);
  const token = useAppSelector((state: RootState) => state.auth?.token);
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

    let timeout: NodeJS.Timeout;
    
    if (!token) {
      // Pas de token, rediriger vers la page d'accueil
      timeout = setTimeout(() => router.replace('/'), 2000);
    } else if (user) {
      // Utilisateur connecté, rediriger selon son rôle
      if (user.role === Role.Admin) {
        timeout = setTimeout(() => router.replace('/dashboard'), 3000);
      } else if (user.role === Role.Employee) {
        timeout = setTimeout(() => router.replace('/take-order'), 3000);
      } else if (user.role === Role.Client) {
        timeout = setTimeout(() => router.replace('/my-orders'), 3000);
      } else {
        timeout = setTimeout(() => router.replace('/'), 3000);
      }
    }
    // Si on a un token mais pas encore de profil utilisateur, on attend
    
    return () => clearTimeout(timeout);
  }, [user, token, userLoading, isInitializing, router]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, maxWidth: { xs: "90%", sm: 400 }, textAlign: "center" }}>
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          You do not have permission to access this page.<br />
          You will be redirected
        </Typography>
        <CircularProgress color="error" />
      </Paper>
    </Box>
  );
}