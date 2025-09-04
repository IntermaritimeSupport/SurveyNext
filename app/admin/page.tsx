"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { RecentSurveys } from "@/components/admin/recent-surveys"
import { Button } from "@/components/ui/button"
import { PlusCircle, BarChart3, Users } from "lucide-react"
import Link from "next/link"
import { BrowserInfoCard } from "@/components/admin/BrowserInfo"
import { Separator } from "@radix-ui/react-dropdown-menu"
import { SurveyStatusPieChart } from "@/components/charts/total-surveys-pie-chart"
import { SurveyResponsesBarChart } from "@/components/charts/chart-bar-interactive"
import { APISurveyWithQuestions } from "./reports/page"
import { useEffect, useState } from "react"

export default function AdminDashboard() {
  const [allSurveys, setAllSurveys] = useState<APISurveyWithQuestions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllSurveyData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Asume que esta API puede devolver las preguntas y el conteo
        // Si tu API no devuelve todas las preguntas con responsesSummary,
        // necesitarías endpoints adicionales o un `include` más profundo.
        const response = await fetch("/api/surveys?include=_count&include=questions")
        if (!response.ok) {
          throw new Error(`Error al cargar datos de encuestas: ${response.status}`)
        }
        const data: APISurveyWithQuestions[] = await response.json()
        setAllSurveys(data)
      } catch (err: any) {
        console.error("Error fetching all survey data for reports:", err)
        setError("Error al cargar los datos para los reportes. Verifica que la API esté funcionando correctamente.")
      } finally {
        setLoading(false)
      }
    }
    fetchAllSurveyData()
  }, [])
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

        <Separator />

        {/* Sección de Gráficos de Alto Nivel */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Análisis General</h2>
          <p className="text-gray-600">Gráficos que ofrecen una vista de alto nivel de tus datos.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurveyStatusPieChart surveys={allSurveys} />
            <SurveyResponsesBarChart surveys={allSurveys} />
          </div>
        </section>

        <Separator />


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
