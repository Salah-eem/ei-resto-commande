'use client';
import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Paper, Link as MuiLink, Snackbar } from '@mui/material';
import { useSelector } from 'react-redux';
import { loginUser } from '@/store/slices/authSlice';
import { RootState } from '@/store/store';
import { useAppDispatch } from '@/store/slices/hooks';
import Link from 'next/link';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { fetchUserProfile } from '@/store/slices/userSlice';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Role } from '@/types/user';

const validationSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email required'),
  password: yup.string().required('Password required'),
});

const mergeCartAndOrdersAfterLogin = async () => {
  const guestId = localStorage.getItem("user_id");
  if (guestId) {
    try {
      await api.post("/cart/merge", { guestId });
      await api.post("/order/merge", { guestId });
    } catch (error) {
      console.error("Erreur lors de la fusion des commandes", error);
    }
  }
};

const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const userProfile = useSelector((state: RootState) => state.user.profile); // <-- récupère le profil user (assure-toi que `userSlice` a bien le profil ici)

  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);

  const handleCloseSnackbar = () => {
    setSuccessSnackbarOpen(false);
  };

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const result = await dispatch(loginUser(values));
      if (result.meta.requestStatus === "fulfilled") {
        await mergeCartAndOrdersAfterLogin();
        await dispatch(fetchUserProfile());
        setSuccessSnackbarOpen(true);
      }
    },
  });

  // Effet pour vérifier le rôle une fois le profil chargé
  useEffect(() => {
    if (userProfile?.role !== undefined && userProfile?.role !== null) {
      setTimeout(() => {
        switch (userProfile.role) {
          case Role.Client:
            router.push('/my-orders');
            break;
          case Role.Employee:
            router.push('/take-order');
            break;
          case Role.Admin:
            router.push('/dashboard');
            break;
          default:
            router.push('/');
        }
      }, 1000); // délai pour laisser afficher le Snackbar
    }
  }, [userProfile, router]);
  

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
        <Typography variant="body2">email client : test@test.com</Typography>
        <Typography variant="body2">email employee : aaa@aaa.aa</Typography>
        <Typography variant="body2">email admin : admin@admin.com</Typography>
        <Typography variant="body2">password : Password1,</Typography>
      </Box>

      {/* Snackbar Success */}
      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Login Successful! Redirecting...
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
