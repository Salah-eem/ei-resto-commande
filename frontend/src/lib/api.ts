// lib/api.ts
import axios from 'axios';
import { logout, setToken } from '@/store/slices/authSlice';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  // Pour que les cookies soient envoyés avec chaque requête
  withCredentials: true,
});

// Intercepteur de requête : ajoute le token stocké (localStorage) à l'en-tête Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variables pour gérer le rafraîchissement
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Intercepteur de réponse pour gérer l'expiration du token avec refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Si on reçoit un 401 et que la requête n'a pas déjà été retentée
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Si un rafraîchissement est déjà en cours, on ajoute la requête à la file d'attente
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = 'Bearer ' + token;
            return axios(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        // Appel à l'endpoint pour rafraîchir le token avec withCredentials pour envoyer les cookies
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = response.data.access_token;
        
        // Mettre à jour le token dans le localStorage
        localStorage.setItem('access_token', newToken);
        // Importation dynamique du store pour éviter le cycle
        const { store } = require('@/store/store');
        store.dispatch(setToken(newToken));
        
        // Mettre à jour l'en-tête par défaut
        api.defaults.headers.common.Authorization = 'Bearer ' + newToken;
        processQueue(null, newToken);
        originalRequest.headers.Authorization = 'Bearer ' + newToken;
        return axios(originalRequest);
      } catch (err) {
        processQueue(err, null);
        const { store } = require('@/store/store');
        store.dispatch(logout());
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
