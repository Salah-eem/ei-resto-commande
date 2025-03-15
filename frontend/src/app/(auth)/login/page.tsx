'use client';
import React from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Alert, Paper } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store/store';
import { useFormik } from 'formik';
import * as yup from 'yup';

// Schéma de validation avec Yup
const validationSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email required'),
  password: yup
    .string()
    //.min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .required('Password required'),
});

const LoginPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: (values) => {
      dispatch(loginUser(values));
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
          Connexion
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
      </Paper>
    </Box>
  );
};

export default LoginPage;
