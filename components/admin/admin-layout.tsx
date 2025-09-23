"use client"

import type React from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AdminSidebar } from "./admin-sidebar"
import { useState } from "react"
import { Menu } from "lucide-react"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ProtectedRoute requireAdmin>
      <div className="flex h-screen bg-gradient-to-r from-violet-600/5 to-blue-600/10">
        {/* Botón de menú móvil (hamburguesa) - visible solo en pantallas pequeñas */}
        <div className="absolute left-4 top-4 z-50 lg:hidden">
          <button
            type="button"
            className="bg-blue-600 flex items-center justify-center rounded-md p-2 text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir barra lateral</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* El componente AdminSidebar */}
        <AdminSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Área de contenido principal */}
        {/* Eliminado lg:pl-64. El espacio lo gestionará el sistema flex con la barra lateral estática. */}
        <main className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  )
}