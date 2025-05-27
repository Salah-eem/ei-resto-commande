'use client';
// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#008f68', // Vert RESTOCOMMANDE
    },
    secondary: {
      main: '#fdb913', // Doré (couverts)
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
  },
});

export default theme;
