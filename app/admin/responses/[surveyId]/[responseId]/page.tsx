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
  Hash,
  CheckCircle,
  Building,
  Ship,
  Globe,
  Star,
  Circle,
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
  position: string | null
  ships: string | null
  fullName: string | null
  company: string | null
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

// ------------------ Renderizador de respuestas ------------------
function renderAnswerValue(answer: APIAnswer) {
  if (!answer.question) return <span className="text-slate-400 italic">Pregunta no disponible</span>

  const { type, options } = answer.question
  const value = answer.value
  if (value === null || value === undefined) return <span className="text-slate-400">N/A</span>

  const parsedOptions = typeof options === "string" ? options : options

  switch (type) {
    case PrismaQuestionType.CHECKBOXES: {
      if (Array.isArray(value)) {
        const optionsMap = new Map(
          (parsedOptions as { value: string; label: string }[] || []).map((opt) => [opt.value, opt.label])
        )
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string) => (
              <span key={v} className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-base">
                {optionsMap.get(String(v)) || String(v)}
              </span>
            ))}
          </div>
        )
      }
      return <span className="text-emerald-700">{String(value)}</span>
    }

    case PrismaQuestionType.MULTIPLE_CHOICE:
    case PrismaQuestionType.DROPDOWN: {
      return (
        <span className="px-3 py-1 border rounded-md bg-slate-50 text-slate-700 text-base">
          {String(value)}
        </span>
      )
    }

    case PrismaQuestionType.SCALE:
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="10"
            value={Number(value)}
            readOnly
            className="w-40 accent-emerald-500 cursor-not-allowed"
          />
          <span className="text-emerald-700 font-medium text-base">{value}</span>
        </div>
      )

    case PrismaQuestionType.RATING: {
      const rating = Number(value)
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star, index) => (
            <div>
              <Circle
                key={star}
                className={`h-4 w-4 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}`}
              />
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
      )
    }

    case PrismaQuestionType.NUMBER:
      return <span className="px-2 py-0.5 border rounded bg-slate-50 text-slate-700">{value}</span>

    case PrismaQuestionType.DATE: {
      let dateStr = ""
      try {
        dateStr = format(new Date(value), "yyyy-MM-dd")
      } catch {
        dateStr = String(value)
      }
      return (
        <span className="px-2 py-0.5 border rounded bg-slate-50 text-slate-700">{dateStr}</span>
      )
    }

    case PrismaQuestionType.TIME: {
      let timeStr = ""
      try {
        timeStr = new Date(value).toISOString().substring(11, 16)
      } catch {
        timeStr = String(value)
      }
      return (
        <span className="px-2 py-0.5 border rounded bg-slate-50 text-slate-700">{timeStr}</span>
      )
    }

    case PrismaQuestionType.FILE_UPLOAD:
      if (typeof value === "object" && value?.fileName) {
        return (
          <a
            href={value.fileUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline text-base"
          >
            📎 {value.fileName}
          </a>
        )
      }
      return <span className="text-slate-400">Archivo subido</span>

    case PrismaQuestionType.SIGNATURE:
      if (typeof value === "string" && (value.startsWith("http") || value.startsWith("data:image"))) {
        return <img src={value} alt="Firma" className="max-w-xs max-h-20 object-contain border rounded" />
      }
      return <span className="text-slate-400">Firma no disponible</span>

    default:
      return (
        <pre className="text-base text-slate-600 bg-slate-50 border rounded p-2 overflow-x-auto">
          {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
        </pre>
      )
  }
}

// ------------------ Página ------------------
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
        if (!res.ok) throw new Error("Error al cargar la respuesta.")
        const data: APISurveyResponseDetail = await res.json()
        setResponse(data)
      } catch (err: any) {
        setError(err.message || "Error desconocido.")
      } finally {
        setLoading(false)
      }
    }
    if (responseId) fetchResponse()
  }, [responseId])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-xs">Cargando respuesta...</p>
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
        <div className="px-4">
          <Button size="sm" variant="outline" onClick={() => router.back()} className="flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Volver
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" onClick={() => router.back()} className="flex items-center gap-1">
            <ChevronLeft className="h-3 w-3" /> Volver
          </Button>
          <h1 className="text-lg md:text-xl font-semibold text-indigo-700">Respuesta de {response.fullName || "anonimo"}</h1>
          <div />
        </div>

        {/* Info General */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="">
            <CardTitle className="text-base font-medium text-slate-800">{response.survey.title}</CardTitle>
            {response.survey.description && (
              <p className="text-base text-slate-500">{response.survey.description}</p>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2 text-base text-slate-700">
            <div className="flex items-center gap-1"><Hash className="h-3 w-3 text-indigo-500" /> ID: {response.id}</div>
            <div className="flex items-center gap-1"><User className="h-3 w-3 text-indigo-500" /> {response.fullName || response.user?.name || "Anónimo"}</div>
            <div className="flex items-center gap-1"><Building className="h-3 w-3 text-indigo-500" /> {response.company || "Sin compañía"}</div>
            <div className="flex items-center gap-1"><Ship className="h-3 w-3 text-indigo-500" /> {response.ships || "N/A"}</div>
            {response.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-500" /> {response.email}</div>}
            <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-indigo-500" /> Inicio: {format(new Date(response.startedAt), "PPPp", { locale: es })}</div>
            {response.completedAt && <div className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> Fin: {format(new Date(response.completedAt), "PPPp", { locale: es })}</div>}
            <div className="flex items-center gap-1"><Globe className="h-3 w-3 text-indigo-500" /> IP: {response.ipAddress || "N/A"}</div>
          </CardContent>
        </Card>

        {/* Respuestas */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-slate-800">Respuestas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.answers.length > 0 ? (
              response.answers
                .sort((a, b) => a.question.order - b.question.order)
                .map((answer) => (
                  <div key={answer.id} className="pb-3 border-b last:border-0">
                    <p className="text-base font-medium text-slate-900">{answer.question.order}. {answer.question.title}</p>
                    <div className="ml-3 mt-1">{renderAnswerValue(answer)}</div>
                  </div>
                ))
            ) : (
              <p className="text-slate-400 text-center py-4 text-base">No hay respuestas registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
