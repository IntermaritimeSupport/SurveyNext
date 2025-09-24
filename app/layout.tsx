"use client"; // <--- ¡Esta línea es necesaria para usar hooks de React!

import type React from "react"
import { useState, useEffect } from "react"
// import type { Metadata } from "next" // Ya no se necesita si no se exporta metadata aquí
import { Inter, Noto_Sans_SC } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Analytics } from '@vercel/analytics/next';
import "./globals.css"
import { Toaster } from "@/components/ui/toaster";
import Loader from "@/components/loaders/loader"; // Asumo que este es tu componente Loader
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-sc",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000); // Muestra el loader por 2 segundos. Ajusta este tiempo según necesites.

    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="es" className={`${inter.variable} ${notoSansSC.variable} antialiased`} suppressHydrationWarning>
      <head>
        <title>SurveyForms</title>
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >

          <AuthProvider>
            {loading ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
                <Loader />
              </div>
            ) : (
              <>
                {children}
                <Toaster />
              </>
            )}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}