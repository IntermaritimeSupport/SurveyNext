"use client"

import { useEffect, useState } from "react"
import { surveyStore } from "@/lib/survey-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MessageSquare, TrendingUp } from "lucide-react"

interface DashboardStats {
  totalSurveys: number
  activeSurveys: number
  totalResponses: number
  avgResponseRate: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    avgResponseRate: 0,
  })

  useEffect(() => {
    const surveys = surveyStore.getSurveys()
    const responses = surveyStore.getResponses()

    const totalSurveys = surveys.length
    const activeSurveys = surveys.filter((s) => s.isActive).length
    const totalResponses = responses.length

    // Calcular tasa de respuesta promedio
    let avgResponseRate = 0
    if (totalSurveys > 0) {
      const rates = surveys.map((survey) => {
        const surveyResponses = responses.filter((r) => r.surveyId === survey.id).length
        return surveyResponses > 0 ? 100 : 0 // Simplificado para demo
      })
      avgResponseRate = rates.reduce((a: number, b: number) => a + b, 0) / rates.length
    }

    setStats({
      totalSurveys,
      activeSurveys,
      totalResponses,
      avgResponseRate: Math.round(avgResponseRate),
    })
  }, [])

  const statCards = [
    {
      title: "Total de Encuestas",
      value: stats.totalSurveys,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Encuestas Activas",
      value: stats.activeSurveys,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Respuestas",
      value: stats.totalResponses,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Tasa de Respuesta",
      value: `${stats.avgResponseRate}%`,
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="survey-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
