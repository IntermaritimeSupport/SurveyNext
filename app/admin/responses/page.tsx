// src/app/dashboard/responses/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Loader2, ExternalLink } from "lucide-react" // Añadir ExternalLink para el Link de Next
import Link from "next/link" // Importar Link de next

// Importar los tipos de Prisma directamente
import { type Survey as PrismaSurvey } from "@prisma/client"
import { Alert, AlertDescription } from "@/components/ui/alert"

// =========================================================================
// INTERFACES
// =========================================================================

// Usamos la interfaz APISurvey que ya tenías
interface APISurvey extends Pick<PrismaSurvey, "id" | "title" | "description" | "isAnonymous" | "status"> {
  _count?: {
    responses: number
  }
}

// =========================================================================
// UTILITIES (pueden quedarse aquí o moverse a un archivo de utilidades)
// =========================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// =========================================================================
// SURVEYS LIST PAGE COMPONENT
// =========================================================================
export default function SurveysListPage() { // Renombrado de ResponsesPage
  const [allSurveys, setAllSurveys] = useState<APISurvey[]>([])
  const [filteredSurveys, setFilteredSurveys] = useState<APISurvey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingSurveys, setLoadingSurveys] = useState(true)
  const [errorSurveys, setErrorSurveys] = useState<string | null>(null)

  useEffect(() => {
    const fetchSurveys = async () => {
      setLoadingSurveys(true)
      setErrorSurveys(null)
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys?include=_count`) // Tu API GET /api/surveys debe devolver el _count
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
  }, [allSurveys, searchTerm])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Encuestas</h1>
            <p className="text-slate-600 mt-1">Selecciona una encuesta para ver sus respuestas</p>
          </div>
        </div>

        {/* Search */}
        <Card className="survey-card">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {errorSurveys && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorSurveys}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Surveys List */}
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
                  // ✅ CORRECCIÓN: Usar Link de Next.js para redirigir
                  <Link href={`/admin/responses/${survey.id}`} key={survey.id} passHref>
                    <Card
                      className="survey-card cursor-pointer hover:shadow-md transition-shadow"
                      // onClick={() => handleSurveyClick(survey)} // Ya no es necesario el onClick aquí
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-slate-900">{survey.title}</h3>
                              <Badge variant="outline">{survey._count?.responses || 0} respuestas</Badge>
                              {survey.isAnonymous && <Badge variant="secondary">Anónima</Badge>}
                              <Badge 
                                className={`${survey.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                                >
                                {survey.status === 'PUBLISHED' ? 'Publicada' : 'Borrador'}
                              </Badge>
                            </div>

                            {survey.description && (
                              <p className="text-slate-600 text-sm mb-3">{survey.description}</p>
                            )}

                            <div className="text-xs text-slate-500">ID: {survey.id.slice(-8)}</div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <ExternalLink className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Ver respuestas</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}