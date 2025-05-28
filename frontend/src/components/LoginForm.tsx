// components/LoginForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAppDispatch } from '@/store/slices/hooks';
import { Button, TextField, FormControl, InputLabel, OutlinedInput, InputAdornment, IconButton,
         CircularProgress, Box, Grid, Typography, FormHelperText, } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { redirect, useRouter } from 'next/navigation';

import { loginAction } from "@/app/(auth)/actions";
import Link from 'next/link';

// Schéma de validation avec Yup
const schema = yup.object().shape({
  email: yup.string().email('Invalid Email').required('Email required'),
  password: yup.string().required('Password required'),
});

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors }, } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null); // Reset l'erreur avant un nouvel essai
  
    try {
      const user = await loginAction(data);
      console.log(user);
    } catch (error: any) {
      setError(error.message); // Stocke l'erreur backend
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Box
        sx={{
          padding: 4,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 3,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h5" align="center" gutterBottom>
          Login
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Controller name="email" control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    variant="outlined"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
                <Controller name="password" control={control}
                    render={({ field }) => (
                    <FormControl variant="outlined" fullWidth>
                        <InputLabel htmlFor="password">Password</InputLabel>
                        <OutlinedInput
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        endAdornment={
                            <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleClickShowPassword}
                                edge="end"
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            </InputAdornment>
                        }
                        label="Password"
                        error={!!errors.password}
                        />
                        {errors.password && (
                        <FormHelperText error>
                            {errors.password.message}
                        </FormHelperText>
                        )}
                    </FormControl>
                    )}
                />
                {error && (
                    <Typography color="error" align="center" sx={{ mt: 2 }}>
                    {error}
                    </Typography>
                )}
            </Grid>
            <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary" fullWidth
                    disabled={isLoading} startIcon={isLoading ? <CircularProgress size={20} /> : null}>
                    {isLoading ? 'Loading...' : 'Login'}
                </Button>
                
            </Grid>
          </Grid>
        </form>
        <Link href={"/signup"}>Signup</Link>
        <Link href={"/"}>Products</Link>
      </Box>
    </Box>
  );
}