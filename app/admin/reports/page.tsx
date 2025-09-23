// app/admin/reports/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useEffect, useState, useMemo } from "react"
import { SurveyStatus } from "@prisma/client"
import { SurveyOverviewCards } from "@/components/reports/overview-card"
import { SurveyStatusPieChart } from "@/components/charts/total-surveys-pie-chart"
import { SurveyResponsesBarChart } from "@/components/charts/chart-bar-interactive"
import Loader from "@/components/loaders/loader"
import { Download } from "lucide-react"

// ✅ Asegúrate de que esta interfaz APISurvey sea la misma que la exportada en SurveysListPage.tsx
export interface APISurveyWithQuestions { // Nuevo nombre para evitar conflictos y reflejar que trae preguntas
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  isAnonymous: boolean;
  createdAt: string | Date;
  questions?: { // Opcional porque no siempre la API la devuelve directamente en el listado principal
    id: string;
    title: string;
    type: string; // PrismaQuestionType, o similar
    order: number;
    responsesSummary?: { option: string; count: number }[];
  }[];
  _count?: {
    responses: number;
    questions?: number;
  };
}

export default function ReportsPage() {
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

  // Cálculos de promedios, totales, etc.
  const totalResponses = useMemo(() => {
    return allSurveys.reduce((acc, survey) => acc + (survey._count?.responses || 0), 0)
  }, [allSurveys])

  const totalAnonymousResponses = useMemo(() => {
    return allSurveys.filter(s => s.isAnonymous).reduce((acc, survey) => acc + (survey._count?.responses || 0), 0)
  }, [allSurveys])

  const averageResponsesPerSurvey = useMemo(() => {
    if (allSurveys.length === 0) return 0
    return totalResponses / allSurveys.length
  }, [totalResponses, allSurveys.length])

  // Lógica para generar informe (simulada por ahora)
  const handleGenerateReport = async () => {
    alert("Funcionalidad de generación de informe (PDF/CSV) no implementada aún en este ejemplo.")
    // Aquí es donde integrarías una biblioteca como jsPDF, react-pdf/renderer o Puppeteer
    // para generar un informe real.
    // Consulta los resultados de búsqueda [1], [2], [9], [12], [13], [16] para opciones de PDF.
    // Ejemplo básico para CSV:
    // const csvData = generateCSV(allSurveys);
    // downloadCSV(csvData, "reporte-encuestas.csv");
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader/>
          <p className="text-xl text-gray-700">Cargando reportes...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="mt-8 mx-auto max-w-4xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Reportes</h1>
            <p className="text-lg text-gray-600 mt-2">Análisis detallado y métricas de tus encuestas.</p>
          </div>
          <Button onClick={handleGenerateReport} className="bg-green-600 hover:bg-green-700 text-white shadow-md">
            <Download className="w-5 h-5 mr-2" />
            Generar Informe
          </Button>
        </div>
        <section className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SurveyOverviewCards
              title="Total de Encuestas"
              value={allSurveys.length.toLocaleString()}
              description="Número total de encuestas creadas."
            />
            <SurveyOverviewCards
              title="Total de Respuestas"
              value={totalResponses.toLocaleString()}
              description="Respuestas acumuladas en todas las encuestas."
            />
            <SurveyOverviewCards
              title="Respuestas Anónimas"
              value={totalAnonymousResponses.toLocaleString()}
              description="Total de respuestas de encuestas anónimas."
            />
            <SurveyOverviewCards
              title="Promedio Resp./Encuesta"
              value={averageResponsesPerSurvey.toFixed(2)}
              description="Promedio de respuestas por encuesta."
            />
          </div>
        </section>

        <section className="space-y-4 bg-white/50 rounded-xl p-4">
          <h2 className="text-2xl font-bold text-gray-800">Análisis General</h2>
          <p className="text-gray-600">Gráficos que ofrecen una vista de alto nivel de tus datos.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SurveyStatusPieChart surveys={allSurveys} />
            <SurveyResponsesBarChart surveys={allSurveys} />
          </div>
        </section>

        <Separator />
      </div>
    </AdminLayout>
  )
}