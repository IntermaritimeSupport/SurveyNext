// src/app/dashboard/responses/[surveyId]/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation" // Importar useParams, useRouter
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, User, Calendar, Loader2, ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"

// Importar los tipos de Prisma
import type { SurveyResponse as PrismaSurveyResponse, User as PrismaUser, Survey as PrismaSurvey } from "@prisma/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SurveyQuestionResponsesChart } from "@/components/charts/chart-pie-interactive"

// =========================================================================
// INTERFACES
// =========================================================================

// Interfaz para la respuesta de la API de GET /api/surveys/[surveyId]/responses
interface APISurveyResponseListItem extends Omit<PrismaSurveyResponse, "email" | "userId" | "surveyId"> {
  id: string // Asegurar que el ID está presente
  email: string | null
  user: Pick<PrismaUser, "id" | "name" | "email"> | null
  survey: Pick<PrismaSurvey, "id" | "title" | "description" | "isAnonymous">
  // No necesitamos 'answers' aquí para la lista, se obtendrá en el detalle
}

// Interfaz para las respuestas detalladas con respuestas
interface DetailedSurveyResponse {
  id: string
  answers: {
    id: string
    value: any
    question: {
      id: string
      title: string
      type: string
      order: number
      options?: { value: string; label: string }[]
    }
  }[]
}

// Interfaz para los datos procesados para el gráfico
interface ProcessedQuestionData {
  id: string
  title: string
  type:
    | "URL"
    | "DROPDOWN"
    | "RATING"
    | "NUMBER"
    | "TIME"
    | "EMAIL"
    | "PHONE"
    | "MULTIPLE_CHOICE"
    | "CHECKBOXES"
    | "SCALE"
  order: number
  options?: { value: string; label: string }[]
  responsesSummary?: { option: string; count: number }[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Función para procesar respuestas en datos para el gráfico
function processResponsesForChart(responses: DetailedSurveyResponse[]): ProcessedQuestionData[] {
  const questionsMap = new Map<string, ProcessedQuestionData>()

  // Recopilar todas las preguntas y sus respuestas
  responses.forEach((response) => {
    response.answers.forEach((answer) => {
      const question = answer.question
      if (!questionsMap.has(question.id)) {
        const questionType = question.type as ProcessedQuestionData["type"]
        questionsMap.set(question.id, {
          id: question.id,
          title: question.title,
          type: questionType,
          order: question.order,
          options: question.options,
          responsesSummary: [],
        })
      }
    })
  })

  // Procesar respuestas para cada pregunta
  questionsMap.forEach((questionData, questionId) => {
    const allAnswers = responses.flatMap((response) =>
      response.answers.filter((answer) => answer.question.id === questionId),
    )

    if (questionData.type === "MULTIPLE_CHOICE" || questionData.type === "DROPDOWN") {
      // Contar selecciones individuales
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (answer.value) {
          const value = String(answer.value)
          counts.set(value, (counts.get(value) || 0) + 1)
        }
      })
      questionData.responsesSummary = Array.from(counts.entries()).map(([option, count]) => ({
        option,
        count,
      }))
    } else if (questionData.type === "CHECKBOXES") {
      // Contar selecciones múltiples
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (Array.isArray(answer.value)) {
          answer.value.forEach((value: string) => {
            counts.set(value, (counts.get(value) || 0) + 1)
          })
        }
      })
      questionData.responsesSummary = Array.from(counts.entries()).map(([option, count]) => ({
        option,
        count,
      }))
    } else if (questionData.type === "RATING" || questionData.type === "SCALE") {
      // Contar calificaciones numéricas
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (answer.value !== null && answer.value !== undefined) {
          const value = String(answer.value)
          counts.set(value, (counts.get(value) || 0) + 1)
        }
      })
      questionData.responsesSummary = Array.from(counts.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([option, count]) => ({
          option,
          count,
        }))
    }
  })

  return Array.from(questionsMap.values()).sort((a, b) => a.order - b.order)
}

// =========================================================================
// SURVEY RESPONSES LIST PAGE COMPONENT
// =========================================================================
export default function SurveyResponsesListPage() {
  const params = useParams()
  const router = useRouter()

  const surveyId = typeof params.surveyId === "string" ? params.surveyId : undefined
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState("Cargando...") // Para mostrar el título de la encuesta
  const [surveyResponses, setSurveyResponses] = useState<APISurveyResponseListItem[]>([])
  const [filteredResponses, setFilteredResponses] = useState<APISurveyResponseListItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [errorResponses, setErrorResponses] = useState<string | null>(null)

  // Estado para los datos del gráfico
  const [chartData, setChartData] = useState<ProcessedQuestionData[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [errorChart, setErrorChart] = useState<string | null>(null)

  useEffect(() => {
    if (!surveyId) {
      setErrorResponses("ID de encuesta no proporcionado.")
      setLoadingResponses(false)
      return
    }

    const fetchResponses = async () => {
      setLoadingResponses(true)
      setErrorResponses(null)
      try {
        // ✅ CORRECCIÓN: Llamada a la API correcta para las respuestas de una encuesta
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/responses`)
        if (!response.ok) {
          throw new Error(`Error al cargar respuestas: ${response.status}`)
        }
        const data: APISurveyResponseListItem[] = await response.json()
        setSurveyResponses(data)
        setFilteredResponses(data)

        if (data.length > 0) {
          setSelectedSurveyTitle(data[0].survey.title)
        } else {
          const surveyResponse = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`)
          if (surveyResponse.ok) {
            const surveyData = await surveyResponse.json()
            setSelectedSurveyTitle(surveyData.title)
          } else {
            setSelectedSurveyTitle("Encuesta Desconocida")
          }
        }
      } catch (err: any) {
        console.error("Error fetching responses:", err)
        setErrorResponses("Error al cargar las respuestas de la encuesta.")
      } finally {
        setLoadingResponses(false)
      }
    }

    const fetchDetailedResponses = async () => {
      setLoadingChart(true)
      setErrorChart(null)
      try {
        // Fetch detailed responses with answers for chart processing
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/responses?includeAnswers=true`)
        if (!response.ok) {
          throw new Error(`Error al cargar datos para gráficas: ${response.status}`)
        }
        const detailedData: DetailedSurveyResponse[] = await response.json()
        const processedData = processResponsesForChart(detailedData)
        setChartData(processedData)
      } catch (err: any) {
        console.error("Error fetching detailed responses:", err)
        setErrorChart("Error al cargar datos para las gráficas.")
      } finally {
        setLoadingChart(false)
      }
    }

    fetchResponses()
    fetchDetailedResponses()
  }, [surveyId])

  useEffect(() => {
    let filtered = surveyResponses

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter((response) => {
        const respondentIdentifier = response.user?.email?.toLowerCase() || response.email?.toLowerCase() || "anónimo"
        return respondentIdentifier.includes(searchLower)
      })
    }

    setFilteredResponses(filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()))
  }, [surveyResponses, searchTerm])

  const handleBackToSurveys = () => {
    router.push("/admin/responses") // Volver a la lista principal de encuestas
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToSurveys}
              className="flex items-center space-x-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Respuestas - {selectedSurveyTitle}</h1>
              <p className="text-slate-600 mt-1">Visualiza las respuestas de "{selectedSurveyTitle}"</p>
            </div>
          </div>
        </div>

        {/* Gráfico de Respuestas de Preguntas */}
        <SurveyQuestionResponsesChart
          surveyTitle={selectedSurveyTitle}
          questions={chartData}
          loading={loadingChart}
          error={errorChart}
        />

        {/* Respuestas List */}
        <Card>
          <div className="bg-gray-50 px-4 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar por participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
            {errorResponses && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorResponses}</AlertDescription>
              </Alert>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead className="w-40">Fecha</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingResponses ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                      <p className="ml-2 text-slate-500">Cargando respuestas...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredResponses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="text-slate-400 mb-4">
                      <User className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      {searchTerm ? "No se encontraron respuestas" : "No hay respuestas"}
                    </h3>
                    <p className="text-slate-500">
                      {searchTerm
                        ? "Intenta ajustar el término de búsqueda"
                        : "Las respuestas aparecerán aquí cuando los usuarios completen esta encuesta"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredResponses.map((response) => (
                  <TableRow key={response.id} className="hover:bg-gray-50">
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {response.id.slice(-8)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {response.user?.name || response.user?.email || response.email || "Anónimo"}
                        </span>
                        {response.survey.isAnonymous && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            Anónima
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(response.startedAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="default" className="text-xs">
                        Completada
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      <Link href={`/admin/responses/${surveyId}/${response.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  )
}
