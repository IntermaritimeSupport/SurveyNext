"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableHead as TH,
} from "@/components/ui/table"
import Link from "next/link"
import {
  Search,
  User,
  Calendar,
  Loader2,
  ArrowLeft,
  Eye,
  Download,
  Filter,
  Trash2,
} from "lucide-react"
import { SurveyQuestionResponsesChart } from "@/components/charts/chart-pie-interactive"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// --- Types ---
type APIAnswer = {
  id: string
  value: any
  createdAt: string
  questionId: string
  responseId: string
  question: {
    id: string
    title: string
    type: string
    order: number
    options?: { value: string; label: string }[] | null
  }
}

type APIResponseItem = {
  id: string
  email: string | null
  company?: string | null
  fullName?: string | null
  ships?: number | null
  position?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  startedAt: string
  completedAt?: string | null
  isComplete?: boolean
  surveyId: string
  userId?: string | null
  user?: { id: string; name?: string | null; email?: string | null } | null
  survey: { id: string; title: string; isAnonymous: boolean }
  answers: APIAnswer[]
}

type ProcessedQuestionData = {
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
  options?: { value: string; label: string }[] | null
  responsesSummary?: { option: string; count: number }[]
}

// --- Helpers: procesar preguntas ---
function processResponsesForChart(responses: APIResponseItem[]): ProcessedQuestionData[] {
  const questionsMap = new Map<string, ProcessedQuestionData>()

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
          options: question.options ?? null,
          responsesSummary: [],
        })
      }
    })
  })

  questionsMap.forEach((questionData, questionId) => {
    const allAnswers = responses.flatMap((response) =>
      response.answers.filter((a) => a.question.id === questionId),
    )

    if (questionData.type === "MULTIPLE_CHOICE" || questionData.type === "DROPDOWN") {
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (answer.value !== null && answer.value !== undefined) {
          const value = String(answer.value)
          counts.set(value, (counts.get(value) || 0) + 1)
        }
      })
      questionData.responsesSummary = Array.from(counts.entries()).map(([option, count]) => ({
        option,
        count,
      }))
    } else if (questionData.type === "CHECKBOXES") {
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (Array.isArray(answer.value)) {
          answer.value.forEach((v: string) => {
            counts.set(v, (counts.get(v) || 0) + 1)
          })
        }
      })
      questionData.responsesSummary = Array.from(counts.entries()).map(([option, count]) => ({
        option,
        count,
      }))
    } else if (questionData.type === "RATING" || questionData.type === "SCALE") {
      const counts = new Map<string, number>()
      allAnswers.forEach((answer) => {
        if (answer.value !== null && answer.value !== undefined && answer.value !== "") {
          const value = String(answer.value)
          counts.set(value, (counts.get(value) || 0) + 1)
        }
      })
      questionData.responsesSummary = Array.from(counts.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([option, count]) => ({ option, count }))
    }
  })

  return Array.from(questionsMap.values()).sort((a, b) => a.order - b.order)
}

// --- Component principal ---
export default function SurveyResponsesListPage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = typeof params.surveyId === "string" ? params.surveyId : undefined

  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState("Cargando...")
  const [surveyResponses, setSurveyResponses] = useState<APIResponseItem[]>([])
  const [filteredRows, setFilteredRows] = useState<APIResponseItem[]>([])
  const [searchParticipant, setSearchParticipant] = useState("")
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState<"ALL" | "COMPLETE" | "INCOMPLETE">("ALL")

  const [loadingResponses, setLoadingResponses] = useState(true)
  const [errorResponses, setErrorResponses] = useState<string | null>(null)

  const [chartData, setChartData] = useState<ProcessedQuestionData[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [errorChart, setErrorChart] = useState<string | null>(null)

  // Fetching responses (with answers)
  useEffect(() => {
    if (!surveyId) {
      setErrorResponses("ID de encuesta no proporcionado.")
      setLoadingResponses(false)
      return
    }

    const fetchAll = async () => {
      setLoadingResponses(true)
      setErrorResponses(null)
      try {
        const r = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/responses?includeAnswers=true`)
        if (!r.ok) throw new Error(`Error ${r.status}`)
        const data: APIResponseItem[] = await r.json()
        setSurveyResponses(data)
        setFilteredRows(data)
        if (data.length > 0) setSelectedSurveyTitle(data[0].survey.title)
        else {
          const sr = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`)
          if (sr.ok) {
            const sd = await sr.json()
            setSelectedSurveyTitle(sd.title ?? "Encuesta")
          } else setSelectedSurveyTitle("Encuesta Desconocida")
        }

        // also prepare chart data
        const processed = processResponsesForChart(data)
        setChartData(processed)
      } catch (err: any) {
        console.error("fetchAll error", err)
        setErrorResponses("No se pudieron cargar las respuestas.")
      } finally {
        setLoadingResponses(false)
        setLoadingChart(false)
      }
    }

    fetchAll()
  }, [surveyId])

  // --- Filtering logic (participant, date range, state) ---
  useEffect(() => {
    let rows = [...surveyResponses]

    // Participant search
    if (searchParticipant && searchParticipant.trim() !== "") {
      const q = searchParticipant.toLowerCase()
      rows = rows.filter((r) => {
        const candidate =
          (r.fullName && r.fullName.toLowerCase()) ||
          (r.user?.name && r.user.name.toLowerCase()) ||
          (r.user?.email && r.user.email.toLowerCase()) ||
          (r.email && r.email.toLowerCase()) ||
          ""
        return candidate.includes(q)
      })
    }

    // State filter
    if (stateFilter === "COMPLETE") {
      rows = rows.filter((r) => r.isComplete)
    } else if (stateFilter === "INCOMPLETE") {
      rows = rows.filter((r) => !r.isComplete)
    }

    // Date range filter (based on startedAt)
    const parseDate = (s?: string | null) => {
      if (!s) return null
      const d = new Date(s)
      if (isNaN(d.getTime())) return null
      // normalize to YYYY-MM-DD for comparison
      return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    }
    const fromDate = dateFrom ? new Date(dateFrom) : null
    const toDate = dateTo ? new Date(dateTo) : null
    if (fromDate || toDate) {
      rows = rows.filter((r) => {
        const started = parseDate(r.startedAt)
        if (!started) return false
        if (fromDate && started < fromDate) return false
        // Si hay una fecha de finalización, la usamos para el filtro 'hasta', si no, usamos 'startedAt'
        const endDate = r.completedAt ? parseDate(r.completedAt) : started
        if (toDate && endDate && endDate > toDate) return false
        return true
      })
    }

    // sort newest first
    rows.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

    setFilteredRows(rows)
  }, [surveyResponses, searchParticipant, dateFrom, dateTo, stateFilter])

  const handleBackToSurveys = () => {
    router.push("/admin/responses")
  }

  const questions = useMemo(() => chartData, [chartData])

  // --- NUEVA CATEGORIZACIÓN: Preguntas que Suman a la Apreciación ---
  const appreciationQuestions = useMemo(() => {
    return questions.filter(q => q.type === "RATING" || q.type === "SCALE")
  }, [questions])
  
  // --- NUEVA CATEGORIZACIÓN: Preguntas Restantes ---
  const remainingQuestions = useMemo(() => {
    const appreciationIds = new Set(appreciationQuestions.map(q => q.id))
    return questions.filter(q => !appreciationIds.has(q.id))
  }, [questions, appreciationQuestions])


  // --- CÁLCULO: Total de Apreciación por Respuesta (Suma de RATING/SCALE) ---
  const totalAppreciationByResponseId = useMemo(() => {
    const totals: Record<string, number> = {}

    surveyResponses.forEach((resp) => {
      let total = 0
      resp.answers.forEach((ans) => {
        const qType = ans.question.type
        
        // Solo sumamos RATING y SCALE
        if (qType === "RATING" || qType === "SCALE") {
          const v = ans.value
          if (v !== null && v !== undefined && v !== "") {
            const n = Number(v)
            if (!Number.isNaN(n)) {
              total += n
            }
          }
        }
      })
      totals[resp.id] = total
    })

    return totals
  }, [surveyResponses])


  // Original: averages per question (numeric avg or modal for categorical)
  const averagesByQuestion = useMemo(() => {
    const averages: Record<string, string> = {}
    if (!questions || questions.length === 0) return averages

    questions.forEach((q) => {
      const numericValues: number[] = []
      surveyResponses.forEach((resp) => {
        const ans = resp.answers.find((a) => a.question.id === q.id)
        if (!ans) return
        const v = ans.value
        if (v === null || v === undefined || v === "") return
        if (Array.isArray(v)) return
        const n = Number(v)
        if (!Number.isNaN(n)) numericValues.push(n)
      })

      if (numericValues.length > 0) {
        const sum = numericValues.reduce((s, n) => s + n, 0)
        const avg = sum / numericValues.length
        averages[q.id] = Number.isInteger(avg) ? String(avg) : avg.toFixed(1)
      } else {
        if (q.type === "MULTIPLE_CHOICE" || q.type === "DROPDOWN" || q.type === "CHECKBOXES") {
          const freq = new Map<string, number>()
          surveyResponses.forEach((resp) => {
            const ans = resp.answers.find((a) => a.question.id === q.id)
            if (!ans) return
            const v = ans.value
            if (Array.isArray(v)) {
              v.forEach((item) => freq.set(item, (freq.get(item) || 0) + 1))
            } else if (v !== null && v !== undefined && v !== "") {
              const key = String(v)
              freq.set(key, (freq.get(key) || 0) + 1)
            }
          })
          if (freq.size > 0) {
            const modal = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0]
            averages[q.id] = modal
          } else averages[q.id] = "—"
        } else {
          averages[q.id] = "—"
        }
      }
    })

    return averages
  }, [questions, surveyResponses])

  // --- CÁLCULO CORREGIDO: Detección Inteligente de NPS ---
  const npsQuestion = useMemo(() => {
    // Buscamos candidatos válidos (RATING o SCALE)
    const candidates = questions.filter(
      (q) => q.type === "RATING" || q.type === "SCALE"
    )

    if (candidates.length === 0) return null

    // Buscamos el mejor candidato basado en puntuación
    let bestCandidate = null
    let maxScore = -1

    for (const q of candidates) {
      let score = 0
      const titleLower = q.title.toLowerCase()
      // Palabras clave de NPS
      if (titleLower.includes("recomenda") || titleLower.includes("recommend")) score += 10
      
      // Verificamos si hay respuestas numéricas válidas para NPS (0-10)
      const hasNpsValues = surveyResponses.some((r) => {
        const a = r.answers.find((ans) => ans.question.id === q.id)
        const n = Number(a?.value)
        return !Number.isNaN(n) && n >= 0 && n <= 10
      })
      
      if (!hasNpsValues) continue // Si no tiene valores 0-10, no sirve

      // Verificamos si hay valores "altos" (>5) que confirmen que es escala 0-10
      const hasHighValues = surveyResponses.some((r) => {
        const a = r.answers.find((ans) => ans.question.id === q.id)
        return Number(a?.value) > 5
      })
      if (hasHighValues) score += 5

      if (score > maxScore) {
        maxScore = score
        bestCandidate = q
      }
    }

    return bestCandidate
  }, [questions, surveyResponses])

  // --- CÁLCULO CORREGIDO: Fórmula NPS Estándar ---
  const npsStats = useMemo(() => {
    if (!npsQuestion) return null
    let promoters = 0
    let passives = 0
    let detractors = 0
    let totalAnswered = 0

    surveyResponses.forEach((r) => {
      const a = r.answers.find((ans) => ans.question.id === npsQuestion.id)
      if (!a || a.value === null || a.value === undefined || a.value === "") return
      const n = Number(a.value)
      
      if (Number.isNaN(n)) return
      if (n < 0 || n > 10) return

      totalAnswered++
      if (n >= 9 && n <= 10) promoters++
      else if (n >= 7 && n <= 8) passives++
      else if (n >= 0 && n <= 6) detractors++
    })

    if (totalAnswered === 0) {
      return { promoters: 0, passives: 0, detractors: 0, totalAnswered, nps: null, promPct: 0, detPct: 0, passPct: 0 }
    }

    // Cálculo más preciso: (P - D) / Total * 100
    const rawNps = ((promoters - detractors) / totalAnswered) * 100
    const nps = Math.round(rawNps)

    // Porcentajes para visualización
    const promPct = Math.round((promoters / totalAnswered) * 100)
    const detPct = Math.round((detractors / totalAnswered) * 100)
    const passPct = Math.round((passives / totalAnswered) * 100)

    return { promoters, passives, detractors, totalAnswered, nps, promPct, detPct, passPct }
  }, [npsQuestion, surveyResponses])

  const exportCsv = async () => {
    // @ts-ignore
    const XLSX = await import('xlsx')
    
    // Combined list of questions in the final table order
    const orderedQuestions = [...appreciationQuestions, ...remainingQuestions]

    // Headers actualizados para incluir la nueva columna y el orden
    const headers = [
      "Participante", 
      "Fecha", 
      "Estado", 
      ...appreciationQuestions.map(q => q.title), // RATING/SCALE first
      "Total de Apreciación", // Then the Total
      ...remainingQuestions.map((q) => q.title) // Then the rest
    ]
    const rows: any[][] = []

    filteredRows.forEach((resp) => {
      const name = resp.fullName || resp.user?.name || resp.user?.email || resp.email || "Anónimo"
      const date = new Date(resp.startedAt).toLocaleString()
      const state = resp.isComplete ? "Completada" : "Incompleta"
      const totalAppreciation = totalAppreciationByResponseId[resp.id] || "—"
      
      const row = [name, date, state]
      
      // 1. Añadir respuestas de Apreciación
      appreciationQuestions.forEach((q) => {
        const a = resp.answers.find((ans) => ans.question.id === q.id)
        let v = "—"
        if (a && a.value !== null && a.value !== undefined) {
          if (Array.isArray(a.value)) v = a.value.join(", ")
          else v = String(a.value)
        }
        row.push(v)
      })
      
      // 2. Añadir Total de Apreciación
      row.push(String(totalAppreciation)) 
      
      // 3. Añadir respuestas Restantes
      remainingQuestions.forEach((q) => {
        const a = resp.answers.find((ans) => ans.question.id === q.id)
        let v = "—"
        if (a && a.value !== null && a.value !== undefined) {
          if (Array.isArray(a.value)) v = a.value.join(", ")
          else v = String(a.value)
        }
        row.push(v)
      })
      
      rows.push(row)
    })

    // Fila de promedios
    const avgSum = Object.values(totalAppreciationByResponseId).reduce((a, b) => a + b, 0)
    const avgAppreciation = filteredRows.length > 0 ? (avgSum / filteredRows.length).toFixed(1) : "—"

    const avgRow = ["PROMEDIO", "", ""] // Participante, Fecha, Estado
    
    // 1. Añadir promedios de Apreciación
    appreciationQuestions.forEach((q) => avgRow.push(averagesByQuestion[q.id] ?? "—"))
    
    // 2. Añadir promedio del Total de Apreciación
    avgRow.push(avgAppreciation)
    
    // 3. Añadir promedios Restantes
    remainingQuestions.forEach((q) => avgRow.push(averagesByQuestion[q.id] ?? "—"))

    // Crear el workbook y worksheet
    const wb = XLSX.utils.book_new()
    const wsData = [headers, ...rows, [], avgRow]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Ajustar ancho de columnas automáticamente
    const colWidths = headers.map((header, i) => {
      const maxLength = Math.max(
        header.length,
        ...wsData.slice(1).map(row => String(row[i] || "").length)
      )
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
    ws['!cols'] = colWidths

    // Agregar la hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Respuestas")

    // Generar el archivo Excel y descargarlo
    XLSX.writeFile(wb, `${selectedSurveyTitle || "survey"}-matrix.xlsx`)
  }

  // Export single row
  const exportRowCsv = (resp: APIResponseItem) => {
    // Combined list of questions in the final table order
    const orderedQuestions = [...appreciationQuestions, ...remainingQuestions]

    // Headers actualizados para incluir la nueva columna y el orden
    const headers = [
      "Participante", 
      "Fecha", 
      "Estado", 
      ...appreciationQuestions.map(q => q.title), // RATING/SCALE first
      "Total de Apreciación", // Then the Total
      ...remainingQuestions.map((q) => q.title) // Then the rest
    ]

    const name = resp.fullName || resp.user?.name || resp.user?.email || resp.email || "Anónimo"
    const date = new Date(resp.startedAt).toLocaleString()
    const state = resp.isComplete ? "Completada" : "Incompleta"
    const totalAppreciation = totalAppreciationByResponseId[resp.id] || "—" 
    
    const row = [name, date, state] // Columnas fijas
    
    // 1. Añadir respuestas de Apreciación
    appreciationQuestions.forEach((q) => {
      const a = resp.answers.find((ans) => ans.question.id === q.id)
      let v = "—"
      if (a && a.value !== null && a.value !== undefined) {
        if (Array.isArray(a.value)) v = a.value.join(", ")
        else v = String(a.value)
      }
      row.push(v)
    })
    
    // 2. Añadir Total de Apreciación
    row.push(String(totalAppreciation)) 
    
    // 3. Añadir respuestas Restantes
    remainingQuestions.forEach((q) => {
      const a = resp.answers.find((ans) => ans.question.id === q.id)
      let v = "—"
      if (a && a.value !== null && a.value !== undefined) {
        if (Array.isArray(a.value)) v = a.value.join(", ")
        else v = String(a.value)
      }
      row.push(v)
    })

    const csvContent =
      [headers, row]
        .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
        .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${name.replaceAll(" ", "_")}-response.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  // Optionally delete a response (placeholder: only remove from UI; integrate with API if needed)
  const deleteResponseLocal = (id: string) => {
    if (!confirm("¿Eliminar esta respuesta? Esta acción es irreversible en la interfaz actual.")) return
    setSurveyResponses((prev) => prev.filter((r) => r.id !== id))
    setFilteredRows((prev) => prev.filter((r) => r.id !== id))
    // If you have an API delete endpoint, call it here.
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
              className="flex items-center space-x-2 bg-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">Respuestas - {selectedSurveyTitle}</h1>
              <p className="text-slate-600 mt-1">Visualiza y filtra las respuestas</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button onClick={exportCsv} size="sm" variant="secondary">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV (matriz)
            </Button>
          </div>
        </div>

        {/* Chart + NPS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SurveyQuestionResponsesChart
              surveyTitle={selectedSurveyTitle}
              questions={chartData.map((q) => ({ ...q, options: q.options ?? undefined }))}
              loading={loadingChart}
              error={errorChart}
            />
          </div>

          <div className="space-y-4 lg:col-span-1">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">NPS & Resumen</h3>
              <div className="text-sm text-slate-600">
                <p>Total respuestas: <span className="font-medium">{surveyResponses.length}</span></p>
                <p>Mostradas: <span className="font-medium">{filteredRows.length}</span></p>
                <p>Preguntas: <span className="font-medium">{questions.length}</span></p>
              </div>

              <div className="mt-3">
                {npsQuestion && npsStats ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">{npsQuestion.title}</div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="p-2 rounded bg-red-50 text-center">
                        <div className="text-xs">Detractores</div>
                        <div className="font-semibold text-red-600">{npsStats.detractors}</div>
                      </div>
                      <div className="p-2 rounded bg-yellow-50 text-center">
                        <div className="text-xs">Pasivos</div>
                        <div className="font-semibold text-amber-600">{npsStats.passives}</div>
                      </div>
                      <div className="p-2 rounded bg-green-50 text-center">
                        <div className="text-xs">Promotores</div>
                        <div className="font-semibold text-emerald-600">{npsStats.promoters}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm">
                      <div>NPS: <span className="font-bold text-xl">{npsStats.nps !== null ? `${npsStats.nps}` : "N/A"}</span></div>
                      {npsStats.nps !== null && <div className="text-xs text-slate-500">({npsStats.promPct}% prom - {npsStats.detPct}% det)</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No se detectó una pregunta NPS con respuestas 0–10.</div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Tabla fusionada */}
        <Card>
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Tabla de respuestas</h2>
              <p className="text-sm text-slate-600">Participante · Fecha · Estado · Apreciación · Total Apreciación · Preguntas · Acciones</p>
            </div>

            <div className="flex items-center space-x-2">
              <Button onClick={exportCsv} size="sm" variant="secondary">
                <Download className="h-4 w-4 mr-2" />
                Exportar matriz
              </Button>
            </div>
          </div>

          <div className="overflow-auto">
            <Table className="min-w-full">
              <TableHeader>
                {/* Fila de Filtros (COMPACTADO) */}
                <TableRow>
                  <TH>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar participante..."
                        value={searchParticipant}
                        onChange={(e) => setSearchParticipant(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </TH>
                  <TH>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={dateFrom ?? ""}
                        onChange={(e) => setDateFrom(e.target.value || null)}
                        className="border rounded px-2 py-1 text-sm w-full"
                        aria-label="Fecha desde"
                      />
                      <input
                        type="date"
                        value={dateTo ?? ""}
                        onChange={(e) => setDateTo(e.target.value || null)}
                        className="border rounded px-2 py-1 text-sm w-full"
                        aria-label="Fecha hasta"
                      />
                    </div>
                  </TH>
                  <TH>
                    <select
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value as any)}
                      className="border rounded px-2 py-1 text-sm w-full"
                      aria-label="Estado filtro"
                    >
                      <option value="ALL">Todas</option>
                      <option value="COMPLETE">Completadas</option>
                      <option value="INCOMPLETE">Incompletas</option>
                    </select>
                  </TH>
                  
                  {/* Celdas vacías para las columnas de preguntas de apreciación (no se filtran) */}
                  {appreciationQuestions.map((q) => (
                    <TH key={`filter-${q.id}`} className="text-center">
                      <div />
                    </TH>
                  ))}

                  {/* Celda vacía para la nueva columna Total Apreciación (no se filtra por la suma) */}
                  <TH>
                    <div/>
                  </TH>

                  {/* Celdas vacías para las columnas de preguntas restantes */}
                  {remainingQuestions.map((q) => (
                    <TH key={`filter-${q.id}`} className="text-center">
                      <div />
                    </TH>
                  ))}

                  <TH>
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearchParticipant("")
                          setDateFrom(null)
                          setDateTo(null)
                          setStateFilter("ALL")
                        }}
                        title="Limpiar filtros"
                      >
                        <Filter className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={exportCsv}
                        title="Exportar (filtradas)"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TH>
                </TableRow>

                {/* Fila de Encabezados (COMPACTADO) */}
                <TableRow>
                  <TH className="whitespace-nowrap">Participante</TH>
                  <TH className="whitespace-nowrap w-40">Fecha</TH>
                  <TH className="whitespace-nowrap w-24">Estado</TH>
                  
                  {/* PREGUNTAS DE APRECIACIÓN (RATING/SCALE) - Antes del total */}
                  {appreciationQuestions.map((q) => (
                    <TH key={q.id} className="whitespace-nowrap text-center bg-gray-100/50">
                      {q.title}
                    </TH>
                  ))}
                  {/* FIN PREGUNTAS DE APRECIACIÓN */}

                  {/* COLUMNA DE APRECIACIÓN TOTAL */}
                  <TH className="whitespace-nowrap w-24 text-center bg-blue-100/70 text-blue-800 font-semibold">
                    Total Apreciación
                  </TH>
                  {/* FIN COLUMNA */}

                  {/* preguntas dinámicas restantes */}
                  {remainingQuestions.map((q) => (
                    <TH key={q.id} className="whitespace-nowrap text-center">
                      {q.title}
                    </TH>
                  ))}

                  <TH className="whitespace-nowrap w-28">Acciones</TH>
                </TableRow>
              </TableHeader>

              <TableBody>

                {/* Contenido de la tabla (cargando / vacía / filas) */}
                {loadingResponses ? (
                  <TableRow>
                    <TableCell colSpan={3 + questions.length + 2} className="py-12 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                        <p className="ml-2 text-slate-500">Cargando respuestas...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3 + questions.length + 2} className="py-12 text-center">
                      <div className="text-slate-400 mb-4">
                        <User className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No hay respuestas</h3>
                      <p className="text-slate-500">Ajusta los filtros para ver resultados.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((resp) => {
                    const participantName = resp.fullName || resp.user?.name || resp.user?.email || resp.email || "Anónimo"
                    const appreciationTotal = totalAppreciationByResponseId[resp.id]
                    
                    return (
                      // FILA DE RESPUESTA (COMPACTADO)
                      <TableRow key={resp.id} className="hover:bg-gray-50">
                        <TableCell className="py-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{participantName}</div>
                              <div className="text-xs text-slate-400">{resp.company ?? resp.position ?? "-"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(resp.startedAt).toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {resp.isComplete ? "Completada" : "Incompleta"}
                          </Badge>
                        </TableCell>
                        
                        {/* CELDAS: Preguntas de Apreciación (RATING/SCALE) */}
                        {appreciationQuestions.map((q) => {
                          const a = resp.answers.find((ans) => ans.question.id === q.id)
                          let display = "—"
                          if (a && a.value !== null && a.value !== undefined) {
                            if (Array.isArray(a.value)) display = a.value.join(", ")
                            else display = String(a.value)
                          }
                          return (
                            <TableCell key={q.id} className="py-2 text-center text-sm bg-gray-50/50">
                              {display}
                            </TableCell>
                          )
                        })}
                        {/* FIN CELDAS DE APRECIACIÓN */}

                        {/* CELDA: Total de Apreciación */}
                        <TableCell className="py-2 text-center font-bold text-lg bg-blue-50/50 text-blue-700">
                          {appreciationTotal > 0 
                              ? appreciationTotal 
                              : "—"
                          }
                        </TableCell>
                        {/* FIN CELDA */}

                        {/* Preguntas restantes */}
                        {remainingQuestions.map((q) => {
                          const a = resp.answers.find((ans) => ans.question.id === q.id)
                          let display = "—"
                          if (a && a.value !== null && a.value !== undefined) {
                            if (Array.isArray(a.value)) display = a.value.join(", ")
                            else display = String(a.value)
                          }
                          return (
                            <TableCell key={q.id} className="py-2 text-center text-sm">
                              {display}
                            </TableCell>
                          )
                        })}

                        <TableCell className="py-2">
                          <div className="flex items-center space-x-2 justify-center">
                            <Link href={`/admin/responses/${surveyId}/${resp.id}`}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Ver detalle">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          {/* <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Exportar respuesta" onClick={() => exportRowCsv(resp)}>
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-600" title="Eliminar (local)" onClick={() => deleteResponseLocal(resp.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button> 
                          */}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}

                {/* Row: Promedios (COMPACTADO) */}
                {questions.length > 0 && (
                  <TableRow className="bg-slate-50">
                    <TableCell className="font-semibold">Promedio / Frecuencia</TableCell>
                    <TableCell colSpan={2} />
                    
                    {/* Celdas de Promedio: Preguntas de Apreciación (RATING/SCALE) */}
                    {appreciationQuestions.map((q) => (
                      <TableCell key={`avg-${q.id}`} className="text-center font-medium text-slate-800 bg-gray-100/50">
                        {averagesByQuestion[q.id] ?? "n/a"}
                      </TableCell>
                    ))}

                    {/* CELDA DE PROMEDIO DE APRECIACIÓN TOTAL */}
                    <TableCell className="bg-blue-100/70 text-center font-bold text-blue-800">
                      {filteredRows.length > 0 
                          ? (Object.values(totalAppreciationByResponseId).reduce((a, b) => a + b, 0) / filteredRows.length).toFixed(1)
                          : "–"
                      }
                    </TableCell>

                    {/* Celdas de Promedio: Preguntas Restantes */}
                    {remainingQuestions.map((q) => (
                      <TableCell key={`avg-${q.id}`} className="text-center font-medium text-slate-800">
                        {averagesByQuestion[q.id] ?? "n/a"}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-medium text-slate-800">{"-"}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  )
}