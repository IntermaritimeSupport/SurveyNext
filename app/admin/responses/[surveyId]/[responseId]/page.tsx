// app/admin/responses/[responseId]/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  ChevronLeft,
  Calendar,
  User,
  Mail,
  Link as LinkIcon,
  Hash,
  CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { QuestionType as PrismaQuestionType } from "@prisma/client"

// ------------------ Tipos ------------------
interface APIQuestion {
  id: string
  title: string
  type: PrismaQuestionType
  order: number
  options?: any
}

interface APIAnswer {
  id: string
  value: any
  createdAt: string
  question: APIQuestion
}

interface APISurveyResponseDetail {
  id: string
  email: string | null
  ipAddress: string | null
  userAgent: string | null
  startedAt: string
  completedAt: string | null
  isComplete: boolean
  surveyId: string
  user: { id: string; name: string; email: string } | null
  survey: {
    id: string
    title: string
    description: string | null
    isAnonymous: boolean
  }
  answers: APIAnswer[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// ------------------ Helper para renderizar valores ------------------
function renderAnswerValue(answer: APIAnswer) {
  if (!answer.question) return <span className="text-slate-500">Pregunta no disponible</span>

  const { type, options } = answer.question
  const value = answer.value
  if (value === null || value === undefined) return <span className="text-slate-500">N/A</span>

  const parsedOptions =
    typeof options === "string" ? JSON.parse(options) : options

  switch (type) {
    case PrismaQuestionType.CHECKBOXES: {
      if (Array.isArray(value)) {
        const optionsMap = new Map(
          (parsedOptions as { value: string; label: string }[] || []).map((opt) => [opt.value, opt.label])
        )
        return (
          <span className="font-medium">
            {value.map((v) => optionsMap.get(String(v)) || String(v)).join(", ")}
          </span>
        )
      }
      return <span className="font-medium">{String(value)}</span>
    }

    case PrismaQuestionType.MULTIPLE_CHOICE:
    case PrismaQuestionType.DROPDOWN: {
      const singleOptionMap = new Map(
        (parsedOptions as { value: string; label: string }[] || []).map((opt) => [opt.value, opt.label])
      )
      return (
        <span className="font-medium">
          {singleOptionMap.get(String(value)) || String(value)}
        </span>
      )
    }

    case PrismaQuestionType.FILE_UPLOAD:
      if (
        typeof value === "object" &&
        value !== null &&
        "fileName" in value &&
        typeof value.fileName === "string"
      ) {
        return (
          <span className="font-medium">
            Archivo:{" "}
            <a
              href={value.fileUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {value.fileName}
            </a>
          </span>
        )
      }
      return <span className="text-slate-500">Archivo subido</span>

    case PrismaQuestionType.SIGNATURE:
      if (typeof value === "string" && (value.startsWith("http") || value.startsWith("data:image"))) {
        return (
          <img
            src={value}
            alt="Firma del participante"
            className="max-w-xs max-h-24 object-contain border"
          />
        )
      }
      return <span className="text-slate-500">Firma (vista previa no disponible)</span>

    case PrismaQuestionType.DATE:
    case PrismaQuestionType.TIME:
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return (
            <span className="font-medium">
              {format(date, "PPPp", { locale: es })}
            </span>
          )
        }
      } catch {
        /* ignore */
      }
      return <span className="font-medium">{String(value)}</span>

    case PrismaQuestionType.NUMBER:
    case PrismaQuestionType.SCALE:
      return <span className="font-medium">{String(value)}</span>

    case PrismaQuestionType.MATRIX:
      return (
        <span className="font-medium">
          Matriz: {JSON.stringify(value, null, 2)}
        </span>
      )

    default:
      return (
        <span className="font-medium">
          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
        </span>
      )
  }
}

export default function ResponseDetailPage() {
  const router = useRouter()
  const { responseId } = useParams()
  const [response, setResponse] = useState<APISurveyResponseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResponse() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`${API_BASE_URL}/api/survey-responses/${responseId}`)
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Respuesta de encuesta no encontrada."
              : `Error al cargar la respuesta: ${res.statusText}`
          )
        }

        const data: APISurveyResponseDetail = await res.json()
        setResponse(data)
      } catch (err: any) {
        console.error("Error fetching response details:", err)
        setError(err.message || "Error desconocido al cargar la respuesta.")
      } finally {
        setLoading(false)
      }
    }

    if (responseId) fetchResponse()
  }, [responseId])

  // ------------------ Estados intermedios ------------------
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Cargando detalles de la respuesta...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error || !response) {
    return (
      <AdminLayout>
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error || "No se pudo cargar la respuesta."}</AlertDescription>
        </Alert>
        <div className="p-4">
          <Button onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </div>
      </AdminLayout>
    )
  }

  // ------------------ Vista principal ------------------
  return (
    <AdminLayout>
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Volver a Respuestas
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Detalles de Respuesta</h1>
          <div />
        </div>

        {/* Información general */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Encuesta: {response.survey.title}
            </CardTitle>
            {response.survey.description && (
              <p className="text-sm text-slate-600">{response.survey.description}</p>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-slate-700">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-slate-500" />
              <span>
                ID de Respuesta:{" "}
                <span className="font-mono bg-slate-100 px-1 rounded">{response.id}</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-slate-500" />
              <span>Participante: {response.user?.name || response.email || "Anónimo"}</span>
            </div>
            {response.email && (
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>Email: {response.email}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>
                Iniciada: {format(new Date(response.startedAt), "PPPp", { locale: es })}
              </span>
            </div>
            {response.completedAt && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-slate-500" />
                <span>
                  Completada: {format(new Date(response.completedAt), "PPPp", { locale: es })}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-slate-500" />
              <span>IP: {response.ipAddress || "N/A"}</span>
            </div>
            {response.userAgent && (
              <div className="col-span-full flex items-center space-x-2">
                <User className="h-4 w-4 text-slate-500" />
                <span>User Agent: {response.userAgent}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Respuestas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Respuestas a Preguntas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {response.answers.length > 0 ? (
              response.answers
                .sort((a, b) => a.question.order - b.question.order)
                .map((answer) => (
                  <div
                    key={answer.id}
                    className="border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <p className="text-lg font-medium text-slate-900 mb-2">
                      {answer.question.order}. {answer.question.title}
                    </p>
                    <div className="text-slate-700 ml-4">{renderAnswerValue(answer)}</div>
                    <p className="text-xs text-slate-500 mt-2">
                      Tipo de pregunta: {answer.question.type}
                      <br />
                      Respondida el:{" "}
                      {format(new Date(answer.createdAt), "PPPp", { locale: es })}
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-slate-500 text-center py-4">
                No hay respuestas registradas para esta encuesta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
