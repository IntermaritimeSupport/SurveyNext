"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Search, Eye, Edit, Trash2, MoreHorizontal, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { LinkSharing } from "@/components/admin/link-sharing"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Importar los tipos de Prisma
import { type Survey as PrismaSurvey, SurveyStatus } from "@prisma/client"
import Loader from "@/components/loaders/loader"

// Extender el tipo de Survey de Prisma para incluir el conteo de preguntas (si la API lo devuelve)
interface APISurvey extends PrismaSurvey {
  questions?: { id: string }[] // Para saber el número de preguntas, o _count.questions si la API lo incluye
  _count?: {
    questions?: number
    responses?: number
  }
}

// Define la URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<APISurvey[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredSurveys, setFilteredSurveys] = useState<APISurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar las encuestas desde la API
  const fetchSurveys = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys`)
      if (!response.ok) {
        throw new Error(`Error al cargar encuestas: ${response.statusText}`)
      }
      const data: APISurvey[] = await response.json()
      setSurveys(data)
      setFilteredSurveys(data)
    } catch (err: any) {
      console.error("Error fetching surveys:", err)
      setError("Error al cargar las encuestas. Por favor, inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSurveys()
  }, [])

  // Lógica de filtrado
  useEffect(() => {
    const filtered = surveys.filter(
      (survey) =>
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
    )
    setFilteredSurveys(filtered)
  }, [searchTerm, surveys])

  // Función para eliminar encuestas (ahora interactúa con la API)
  const handleDelete = async (surveyId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta encuesta? Esta acción es irreversible.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error(`Error al eliminar la encuesta: ${response.statusText}`)
        }

        const updatedSurveys = surveys.filter((s) => s.id !== surveyId)
        setSurveys(updatedSurveys)
        setFilteredSurveys(updatedSurveys)
        alert("Encuesta eliminada correctamente.")
      } catch (err: any) {
        console.error("Error deleting survey:", err)
        setError(`Error al eliminar la encuesta: ${err.message}`)
      }
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Encuestas</h1>
            <p className="text-slate-600 text-sm">Administra todas tus encuestas desde aquí</p>
          </div>
          <Link href="/admin/surveys/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nueva Encuesta
            </Button>
          </Link>
        </div>

        <Card>
          {/* Search integrated into table header */}
          <div className="p-4 bg-slate-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar encuestas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {error && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <Loader/>
              <p className="text-xl text-gray-700">Cargando Encuestas...</p>
            </div>
          ) : (
            <>
              {/* Empty State */}
              {filteredSurveys.length === 0 ? (
                <CardContent className="text-center py-8">
                  <div className="text-slate-400 mb-3">
                    <PlusCircle className="h-10 w-10 mx-auto" />
                  </div>
                  <h3 className="text-base font-medium text-slate-900 mb-2">
                    {searchTerm ? "No se encontraron encuestas" : "No hay encuestas creadas"}
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Comienza creando tu primera encuesta para recopilar datos"}
                  </p>
                  {!searchTerm && (
                    <Link href="/admin/surveys/create">
                      <Button size="sm">Crear Primera Encuesta</Button>
                    </Link>
                  )}
                </CardContent>
              ) : (
                /* Surveys Table */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Encuesta</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="w-[80px]">Preguntas</TableHead>
                      <TableHead className="w-[80px]">Respuestas</TableHead>
                      <TableHead className="w-[120px]">Enlace</TableHead>
                      <TableHead className="w-[120px]">Anonimo</TableHead>
                      <TableHead className="w-[100px]">Creada</TableHead>
                      <TableHead className="w-[200px]">Compartir</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSurveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="py-3">
                          <div>
                            <div className="font-medium text-sm line-clamp-1">{survey.title}</div>
                            <div className="text-xs text-slate-500 line-clamp-1 mt-1">{survey.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={survey.status === SurveyStatus.PUBLISHED ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {survey.status === SurveyStatus.PUBLISHED ? "Activa" : "Borrador"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-slate-600">{survey._count?.questions || 0}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-slate-600">{survey._count?.responses || 0}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-slate-500 font-mono">/{survey.customLink}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className="text-xs"
                          >
                            {survey.isAnonymous === survey.isAnonymous ? "true" : "false"}
                          </Badge>                        
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-xs text-slate-500">
                            {new Date(survey.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <LinkSharing
                            surveyTitle={survey.title}
                            customLink={survey.customLink}
                            isActive={survey.status === SurveyStatus.PUBLISHED}
                          />
                        </TableCell>
                        <TableCell className="py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/survey/${survey.customLink}`}>
                                  <Eye className="h-3 w-3 mr-2" />
                                  Ver Encuesta
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/surveys/${survey.id}/edit`}>
                                  <Edit className="h-3 w-3 mr-2" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(survey.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </Card>
      </div>
    </AdminLayout>
  )
}
