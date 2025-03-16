'use client';
import React from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Paper, Link as MuiLink, } from '@mui/material';
import { useSelector } from 'react-redux';
import { loginUser } from '@/store/slices/authSlice';
import { RootState } from '@/store/store';
import { useAppDispatch } from '@/store/slices/hooks';
import Link from 'next/link';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { fetchUserProfile } from '@/store/slices/userSlice';
import api from '@/lib/api';

// Schéma de validation avec Yup
const validationSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email required'),
  password: yup
    .string()
    //.min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .required('Password required'),
});

const mergeCartAndOrdersAfterLogin = async () => {
  const guestId = localStorage.getItem("user_id");
  if (guestId) {
    try {
      // Appeler l'endpoint de fusion de panier
      await api.post("/cart/merge", { guestId });
      // Appeler l'endpoint de fusion de commande
      await api.post("/order/merge", { guestId });
      
    } catch (error) {
      console.error("Erreur lors de la fusion des commandes", error);
    }
  }
};

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const result = await dispatch(loginUser(values));
      if (result.meta.requestStatus === "fulfilled") {
        const guestId = localStorage.getItem("user_id");
        // Appeler l'endpoint de fusion de panier
        await mergeCartAndOrdersAfterLogin();
        // Ensuite, déclencher la récupération du profil utilisateur pour mettre à jour le store
        dispatch(fetchUserProfile());
      }
    },
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mt: 8,
        px: 2,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Login
        </Typography>
        <Box
          component="form"
          onSubmit={formik.handleSubmit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            color="primary"
            variant="contained"
            fullWidth
            type="submit"
            disabled={loading || !formik.isValid}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </Box>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            You don't have an account ?{' '}
            <MuiLink component={Link} href="/signup" underline="hover">
              Sign up
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            email : test@test.com
          </Typography>
          <Typography variant="body2">
            password : Password1,
          </Typography>
        </Box>
    </Box>
  );
};

export default LoginPage;
