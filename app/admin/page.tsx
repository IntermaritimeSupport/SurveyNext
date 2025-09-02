"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { RecentSurveys } from "@/components/admin/recent-surveys"
import { Button } from "@/components/ui/button"
import { PlusCircle, BarChart3, Users } from "lucide-react"
import Link from "next/link"
import { BrowserInfoCard } from "@/components/admin/BrowserInfo"

export default function AdminDashboard() {
  const quickActions = [
    {
      title: "Crear Nueva Encuesta",
      description: "Diseña una encuesta personalizada",
      href: "/admin/surveys/create",
      icon: PlusCircle,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Ver Respuestas",
      description: "Analiza las respuestas recibidas",
      href: "/admin/responses",
      icon: BarChart3,
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "Gestionar Usuarios",
      description: "Administra usuarios del sistema",
      href: "/admin/users",
      icon: Users,
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ]

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-slate-600 mt-0.5 text-sm">Gestiona tu sistema de encuestas desde aquí</p>
          </div>
          <Link href="/admin/surveys/create">
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Encuesta
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <DashboardStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Surveys */}
          <div className="lg:col-span-2">
            <RecentSurveys />
          </div>

          {/* Browser Info Card */}
          <div>
            <BrowserInfoCard />
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
