"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import SurveyManager from "@/components/survey-builder/survey-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LayoutTemplate, Loader2 } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface TemplateSummary {
  id: string
  title: string
  description: string | null
  isTemplate?: boolean
  _count?: { questions?: number }
}

export default function CreateSurveyPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [creatingFrom, setCreatingFrom] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/surveys`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TemplateSummary[]) => setTemplates(list.filter((s) => s.isTemplate)))
      .catch(() => setTemplates([]))
  }, [])

  const startFromTemplate = async (id: string) => {
    setCreatingFrom(id)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/surveys/${id}/duplicate`, { method: "POST" })
      if (!res.ok) throw new Error((await res.json()).message || res.statusText)
      const copy = await res.json()
      router.push(`/admin/surveys/${copy.id}/edit`)
    } catch (e: any) {
      setError(e.message)
      setCreatingFrom(null)
    }
  }

  return (
    <AdminLayout>
      {templates.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4" /> Empezar desde una plantilla
            </CardTitle>
            <CardDescription>Se crea una copia en borrador con todas sus preguntas y condiciones. O crea uno en blanco más abajo.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <div key={t.id} className="border rounded-lg p-3 flex flex-col gap-2">
                <div className="font-medium text-sm">{t.title}</div>
                {t.description && <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>}
                <div className="text-xs text-slate-400">{t._count?.questions ?? 0} preguntas</div>
                <Button size="sm" variant="secondary" disabled={!!creatingFrom} onClick={() => startFromTemplate(t.id)} className="mt-auto">
                  {creatingFrom === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Usar plantilla"}
                </Button>
              </div>
            ))}
            {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}
          </CardContent>
        </Card>
      )}
      <SurveyManager />
    </AdminLayout>
  )
}
