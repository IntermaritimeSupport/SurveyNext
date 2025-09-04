import type React from "react"
import type { Metadata } from "next"
import { Inter, Noto_Sans_SC } from "next/font/google"
import { AuthProvider } from "@/contexts/auth-context"
import { Analytics } from '@vercel/analytics/next';
import "./globals.css"

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

export const metadata: Metadata = {
  title: "Sistema de Encuestas | Survey System",
  description: "Sistema profesional de encuestas con panel de administración multiidioma",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${notoSansSC.variable} antialiased`}>
      <head>
        <title>SurveyForms</title>
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
