"use client"

import type React from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { AdminSidebar } from "./admin-sidebar"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedRoute requireAdmin>
      <div className="flex h-screen bg-slate-50">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
