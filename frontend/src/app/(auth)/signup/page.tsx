'use client';
import React from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper, 
  Link as MuiLink, } 
from '@mui/material';
import Link from 'next/link';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { useSelector } from 'react-redux';
import { signupUser } from '@/store/slices/authSlice';
import { RootState } from '@/store/store';
import { useAppDispatch } from '@/store/slices/hooks';
import { fetchUserProfile } from '@/store/slices/userSlice';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

// Schéma de validation avec Yup
const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(3, 'First name must be at least 3 characters'),

  lastName: yup
    .string()
    .required('Last name is required')
    .min(3, 'Last name must be at least 3 characters'),

  email: yup.string().email('Invalid email').required('Email requiered'),

  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password required'),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), undefined], 'Passwords must match')
    .required('Please confirm your password'),
});

const mergeCartAndOrdersAfterSignup = async () => {
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

const SignupPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const { firstName, lastName, email, password } = values;
      const result = await dispatch(signupUser({ firstName, lastName, email, password }));
      if (result.meta.requestStatus === "fulfilled") {
        await mergeCartAndOrdersAfterSignup();
        await dispatch(fetchUserProfile());
        router.push('/');
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
          Sign Up
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
            id="firstName"
            name="firstName"
            label="First name"
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.firstName && Boolean(formik.errors.firstName)}
            helperText={formik.touched.firstName && formik.errors.firstName}
          />
          <TextField
            fullWidth
            id="lastName"
            name="lastName"
            label="Last name"
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.lastName && Boolean(formik.errors.lastName)}
            helperText={formik.touched.lastName && formik.errors.lastName}
          />
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
          <TextField
            fullWidth
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmer password"
            type="password"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={
              formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)
            }
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
            {loading ? <CircularProgress size={24} color="inherit" /> : "Signup"}
          </Button>
        </Box>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2">
            Already have an account ?{' '}
            <MuiLink component={Link} href="/login" underline="hover">
              Login
            </MuiLink>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SignupPage;
