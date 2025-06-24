// src/components/AuthInitializer.tsx
'use client';

import { useEffect } from 'react';
import { setToken, logout } from '@/store/slices/authSlice';
import { fetchUserProfile } from '@/store/slices/userSlice';
import { useAppDispatch } from '@/store/slices/hooks';

const AuthInitializer = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      // 🧩 Décodage base64 du JWT
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes

      if (decoded.exp && decoded.exp < now) {
        console.warn('❌ Token expiré, suppression');
        dispatch(logout());
      } else {
        dispatch(setToken(token));
        // Récupérer le profil utilisateur après avoir défini le token
        dispatch(fetchUserProfile());
      }
    } catch (err) {
      console.error('❌ Token invalide :', err);
      dispatch(logout());
    }
  }, [dispatch]);

  return null;
};

export default AuthInitializer;
