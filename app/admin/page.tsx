"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { RecentSurveys } from "@/components/admin/recent-surveys"
import { useLanguage } from "@/hooks/use-language"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, BarChart3, Users } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const { t } = useLanguage()

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-slate-600 mt-1">Gestiona tu sistema de encuestas desde aquí</p>
          </div>
          <Link href="/admin/surveys/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-5 w-5 mr-2" />
              Nueva Encuesta
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <DashboardStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Surveys */}
          <div className="lg:col-span-2">
            <RecentSurveys />
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="survey-card">
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link key={index} href={action.href}>
                      <Button className={`w-full justify-start gap-3 h-auto p-4 ${action.color}`}>
                        <Icon className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{action.title}</div>
                          <div className="text-xs opacity-90">{action.description}</div>
                        </div>
                      </Button>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>

            {/* System Info */}
            <Card className="survey-card">
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Versión</span>
                  <span className="text-sm font-medium">1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Idiomas</span>
                  <span className="text-sm font-medium">3 soportados</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Estado</span>
                  <span className="text-sm font-medium text-green-600">Operativo</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
