// src/app/layout.tsx (Next.js App Router)
"use client";
import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import Header from "@/components/Header";
import theme from "@/theme";
import { Providers } from "@/store/providers";
import 'leaflet/dist/leaflet.css';
import AuthInitializer from "@/components/AuthInitializer";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <Providers>
        <ThemeProvider theme={theme}>
        <AuthInitializer />
          <Header />
          <main style={{ paddingTop: "80px" }}>
            {children}
          </main>
        </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
