"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AnalyticsService } from "@/lib/analytics"
import { surveyStore } from "@/lib/survey-store"
import type { SurveyAnalytics } from "@/lib/analytics"
import type { Survey, SurveyResponse } from "@/types/survey"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponseViewer } from "@/components/reports/response-viewer"
import { ArrowLeft, Download, BarChart3, Users, Calendar } from "lucide-react"
import { QuestionAnalyticsComponent } from "@/components/reports/question-analytics"

export default function SurveyReportPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.surveyId as string

  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null)
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!surveyId) return

    const surveyData = surveyStore.getSurvey(surveyId)
    const analyticsData = AnalyticsService.getSurveyAnalytics(surveyId)
    const responsesData = surveyStore.getResponses(surveyId)

    setSurvey(surveyData ?? null)
    setAnalytics(analyticsData)
    setResponses(responsesData)
    setLoading(false)
  }, [surveyId])

  const handleExport = (format: "csv" | "json" = "csv") => {
    const data = AnalyticsService.exportSurveyData(surveyId, format)
    const blob = new Blob([data], { type: format === "csv" ? "text/csv" : "application/json" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `encuesta-${surveyId}-datos.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!analytics || !survey) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium text-slate-900 mb-2">Encuesta no encontrada</h2>
          <p className="text-slate-600 mb-4">La encuesta solicitada no existe o ha sido eliminada.</p>
          <Button onClick={() => router.back()}>Volver</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{analytics.surveyTitle}</h1>
              <p className="text-slate-600">Análisis detallado de la encuesta</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => handleExport("json")}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button onClick={() => handleExport("csv")}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Respuestas</p>
                  <p className="text-3xl font-bold text-slate-900">{analytics.totalResponses}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Tasa de Finalización</p>
                  <p className="text-3xl font-bold text-slate-900">{Math.round(analytics.completionRate)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Última Respuesta</p>
                  <p className="text-lg font-bold text-slate-900">
                    {analytics.responsesByDate.length > 0
                      ? new Date(
                          analytics.responsesByDate[analytics.responsesByDate.length - 1].date,
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Análisis por Pregunta</TabsTrigger>
            <TabsTrigger value="responses">Respuestas Individuales</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-6">
            {analytics.questionAnalytics.length === 0 ? (
              <Card className="survey-card">
                <CardContent className="text-center py-12">
                  <p className="text-slate-500">No hay preguntas para analizar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analytics.questionAnalytics.map((questionAnalytics) => (
                  <QuestionAnalyticsComponent key={questionAnalytics.questionId} analytics={questionAnalytics} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="responses" className="space-y-6">
            <ResponseViewer survey={survey} responses={responses} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="survey-card">
              <CardHeader>
                <CardTitle>Respuestas por Fecha</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.responsesByDate.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No hay datos de tendencias disponibles</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.responsesByDate.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">{new Date(item.date).toLocaleDateString()}</span>
                        <span className="text-sm font-medium text-slate-900">
                          {item.count} respuesta{item.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Answers */}
            {analytics.topAnswers.length > 0 && (
              <Card className="survey-card">
                <CardHeader>
                  <CardTitle>Respuestas Más Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topAnswers.map((answer, index) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{answer.question}</p>
                          <p className="text-sm text-slate-600 mt-1">{answer.answer}</p>
                        </div>
                        <span className="text-sm font-medium text-slate-900 ml-4">{answer.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
