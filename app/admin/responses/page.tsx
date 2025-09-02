"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Calendar, User, Loader2, ArrowLeft, FileText } from "lucide-react"

// Importar los tipos de Prisma
import {
  type Survey as PrismaSurvey,
  type SurveyResponse as PrismaSurveyResponse,
  type Answer as PrismaAnswer,
  type User as PrismaUser,
  type Question as PrismaQuestion,
  QuestionType as PrismaQuestionType,
} from "@prisma/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

// =========================================================================
// INTERFACES
// =========================================================================

interface APIQuestion extends Pick<PrismaQuestion, "id" | "title" | "type" | "options"> {}

interface APIAnswer extends Pick<PrismaAnswer, "id" | "value"> {
  question: APIQuestion | null
}

interface APISurveyResponse extends Omit<PrismaSurveyResponse, "email" | "userId" | "surveyId"> {
  email: string | null
  user: Pick<PrismaUser, "id" | "name" | "email"> | null
  survey: Pick<PrismaSurvey, "id" | "title" | "description" | "isAnonymous">
  answers: APIAnswer[]
}

interface APISurvey extends Pick<PrismaSurvey, "id" | "title" | "description" | "isAnonymous"> {
  _count?: {
    responses: number
  }
}

// =========================================================================
// UTILITIES
// =========================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Función auxiliar para renderizar el valor de la respuesta en la vista previa
const renderAnswerValue = (answer: APIAnswer): string => {
  if (!answer.question) return "Pregunta no disponible"

  const questionType = answer.question.type
  const value = answer.value

  if (value === null || value === undefined) {
    return "N/A"
  }

  // Asegurarse de que las opciones estén parseadas si son strings
  const options =
    typeof answer.question.options === "string" ? JSON.parse(answer.question.options) : answer.question.options

  switch (questionType) {
    case PrismaQuestionType.CHECKBOXES:
      if (Array.isArray(value)) {
        const optionsMap = new Map(
          ((options as { value: string; label: string }[]) || []).map((opt) => [opt.value, opt.label]),
        )
        // Asegurarse de que `v` es manejado como string para el map
        return value.map((v) => optionsMap.get(String(v)) || String(v)).join(", ")
      }
      return String(value)
    case PrismaQuestionType.MULTIPLE_CHOICE:
    case PrismaQuestionType.DROPDOWN:
      const singleOptionMap = new Map(
        ((options as { value: string; label: string }[]) || []).map((opt) => [opt.value, opt.label]),
      )
      return singleOptionMap.get(String(value)) || String(value) // Convertir value a string para la búsqueda en el mapa

    case PrismaQuestionType.FILE_UPLOAD:
      if (typeof value === "object" && value !== null && "fileName" in value && typeof value.fileName === "string") {
        return `Archivo: ${value.fileName}`
      }
      return "Archivo subido"

    case PrismaQuestionType.SIGNATURE:
      return "Firma (imagen)"

    case PrismaQuestionType.DATE:
    case PrismaQuestionType.TIME:
      if (typeof value === "string" || typeof value === "number") {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return date.toLocaleString()
          }
        } catch (e) {
          console.warn("Error parsing date/time value:", value, e)
        }
      }
      return String(value)

    case PrismaQuestionType.NUMBER:
    case PrismaQuestionType.SCALE:
      return String(value)

    case PrismaQuestionType.MATRIX:
      if (typeof value === "object" && value !== null) {
        return `Matriz: ${JSON.stringify(value)}`
      }
      return String(value)

    default: // TEXT, TEXTAREA, EMAIL, PHONE, URL, BOOLEAN
      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value)
      }
      const textValue = String(value)
      return textValue.length > 50 ? textValue.substring(0, 50) + "..." : textValue
  }
}

// =========================================================================
// RESPONSES PAGE COMPONENT
// =========================================================================
export default function ResponsesPage() {
  const [currentView, setCurrentView] = useState<"surveys" | "responses">("surveys")
  const [selectedSurvey, setSelectedSurvey] = useState<APISurvey | null>(null)

  const [allSurveys, setAllSurveys] = useState<APISurvey[]>([])
  const [surveyResponses, setSurveyResponses] = useState<APISurveyResponse[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<APISurvey[]>([])
  const [filteredResponses, setFilteredResponses] = useState<APISurveyResponse[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [loadingSurveys, setLoadingSurveys] = useState(true)
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [errorSurveys, setErrorSurveys] = useState<string | null>(null)
  const [errorResponses, setErrorResponses] = useState<string | null>(null)

  useEffect(() => {
    const fetchSurveys = async () => {
      setLoadingSurveys(true)
      setErrorSurveys(null)
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys?include=_count`)
        if (!response.ok) {
          throw new Error(`Error al cargar encuestas: ${response.status}`)
        }
        const data: APISurvey[] = await response.json()
        setAllSurveys(data)
        setFilteredSurveys(data)
      } catch (err: any) {
        console.error("Error fetching surveys:", err)
        setErrorSurveys("Error al cargar las encuestas.")
      } finally {
        setLoadingSurveys(false)
      }
    }
    fetchSurveys()
  }, [])

  useEffect(() => {
    if (currentView === "surveys") {
      let filtered = allSurveys

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filtered = filtered.filter(
          (survey) =>
            survey.title.toLowerCase().includes(searchLower) ||
            (survey.description && survey.description.toLowerCase().includes(searchLower)),
        )
      }

      setFilteredSurveys(filtered)
    }
  }, [allSurveys, searchTerm, currentView])

  useEffect(() => {
    if (currentView === "responses") {
      let filtered = surveyResponses

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filtered = filtered.filter((response) => {
          const respondentIdentifier = response.user?.email?.toLowerCase() || response.email?.toLowerCase() || "anónimo"
          return respondentIdentifier.includes(searchLower)
        })
      }

      setFilteredResponses(filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()))
    }
  }, [surveyResponses, searchTerm, currentView])

  const handleSurveyClick = async (survey: APISurvey) => {
    setSelectedSurvey(survey)
    setLoadingResponses(true)
    setErrorResponses(null)
    setSearchTerm("") // Clear search when switching views

    try {
      const response = await fetch(`${API_BASE_URL}/api/survey-responses?surveyId=${survey.id}`)
      if (!response.ok) {
        throw new Error(`Error al cargar respuestas: ${response.status}`)
      }
      const data: APISurveyResponse[] = await response.json()
      setSurveyResponses(data)
      setFilteredResponses(data)
      setCurrentView("responses")
    } catch (err: any) {
      console.error("Error fetching responses:", err)
      setErrorResponses("Error al cargar las respuestas de la encuesta.")
    } finally {
      setLoadingResponses(false)
    }
  }

  const handleBackToSurveys = () => {
    setCurrentView("surveys")
    setSelectedSurvey(null)
    setSurveyResponses([])
    setFilteredResponses([])
    setSearchTerm("")
    setErrorResponses(null)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {currentView === "responses" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToSurveys}
                className="flex items-center space-x-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Volver</span>
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {currentView === "surveys" ? "Encuestas" : `Respuestas - ${selectedSurvey?.title}`}
              </h1>
              <p className="text-slate-600 mt-1">
                {currentView === "surveys"
                  ? "Selecciona una encuesta para ver sus respuestas"
                  : `Visualiza las respuestas de "${selectedSurvey?.title}"`}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card className="survey-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder={currentView === "surveys" ? "Buscar encuestas..." : "Buscar por participante..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {(errorSurveys || errorResponses) && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorSurveys || errorResponses}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {currentView === "surveys" ? (
          // Surveys List View
          <>
            {loadingSurveys ? (
              <Card className="survey-card">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                  <p className="ml-2 text-slate-500">Cargando encuestas...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredSurveys.length === 0 ? (
                  <Card className="survey-card">
                    <CardContent className="text-center py-12">
                      <div className="text-slate-400 mb-4">
                        <FileText className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">
                        {searchTerm ? "No se encontraron encuestas" : "No hay encuestas"}
                      </h3>
                      <p className="text-slate-500">
                        {searchTerm
                          ? "Intenta ajustar el término de búsqueda"
                          : "Las encuestas aparecerán aquí cuando las crees"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredSurveys.map((survey) => (
                      <Card
                        key={survey.id}
                        className="survey-card cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSurveyClick(survey)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-slate-900">{survey.title}</h3>
                                <Badge variant="outline">{survey._count?.responses || 0} respuestas</Badge>
                                {survey.isAnonymous && <Badge variant="secondary">Anónima</Badge>}
                              </div>

                              {survey.description && (
                                <p className="text-slate-600 text-sm mb-3">{survey.description}</p>
                              )}

                              <div className="text-xs text-slate-500">ID: {survey.id.slice(-8)}</div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <Eye className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-500">Ver respuestas</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          // Responses List View
          <>
            {loadingResponses ? (
              <Card className="survey-card">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                  <p className="ml-2 text-slate-500">Cargando respuestas...</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredResponses.length === 0 ? (
                  <Card className="survey-card">
                    <CardContent className="text-center py-12">
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
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredResponses.map((response) => (
                      <Card key={response.id} className="survey-card">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <Badge variant="outline">ID: {response.id.slice(-8)}</Badge>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>{response.user?.email || response.email || "Anónimo"}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{new Date(response.startedAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-2 ml-4">
                              <Link href={`/admin/responses/${response.id}`} className="bg-transparent">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
