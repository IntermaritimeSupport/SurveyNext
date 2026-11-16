"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlusCircle, Search, Eye, Edit, Trash2, MoreHorizontal, Loader2, PencilIcon, EyeIcon, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
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

  // Función para cargar los formularios desde la API
  const fetchSurveys = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys`)
      if (!response.ok) {
        throw new Error(`Error al cargar formularios: ${response.statusText}`)
      }
      const data: APISurvey[] = await response.json()
      setSurveys(data)
      setFilteredSurveys(data)
    } catch (err: any) {
      console.error("Error fetching surveys:", err)
      setError("Error al cargar los formularios. Por favor, inténtalo de nuevo.")
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

  const router = useRouter()
  const handleDuplicate = async (surveyId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/duplicate`, { method: "POST" })
      if (!response.ok) throw new Error((await response.json()).message || response.statusText)
      const copy = await response.json()
      router.push(`/admin/surveys/${copy.id}/edit`)
    } catch (err: any) {
      setError(`Error al duplicar el formulario: ${err.message}`)
    }
  }

  // Función para eliminar formularios (ahora interactúa con la API)
  const handleDelete = async (surveyId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este formulario? Esta acción es irreversible.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          throw new Error(`Error al eliminar el formulario: ${response.statusText}`)
        }

        const updatedSurveys = surveys.filter((s) => s.id !== surveyId)
        setSurveys(updatedSurveys)
        setFilteredSurveys(updatedSurveys)
        alert("Formulario eliminado correctamente.")
      } catch (err: any) {
        console.error("Error deleting survey:", err)
        setError(`Error al eliminar el formulario: ${err.message}`)
      }
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Formularios</h1>
            <p className="text-slate-600 text-sm">Administra todas tus formularios desde aquí</p>
          </div>
          <Link href="/admin/surveys/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuevo Formulario
            </Button>
          </Link>
        </div>

        <Card>
          {/* Search integrated into table header */}
          <div className="p-4 bg-slate-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Buscar formularios..."
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
                    {searchTerm ? "No se encontraron formularios" : "No hay formularios creados"}
                  </h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Comienza creando tu primer formulario para recopilar datos"}
                  </p>
                  {!searchTerm && (
                    <Link href="/admin/surveys/create">
                      <Button size="sm">Crear Primer Formulario</Button>
                    </Link>
                  )}
                </CardContent>
              ) : (
                /* Surveys Table */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Formulario</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="w-[80px]">Preguntas</TableHead>
                      <TableHead className="w-[80px]">Respuestas</TableHead>
                      <TableHead className="w-[120px]">Enlace</TableHead>
                      <TableHead className="w-[120px]">Anonimo</TableHead>
                      <TableHead className="w-[100px]">Creado</TableHead>
                      <TableHead className="w-[80px]">Compartir</TableHead>
                      <TableHead className="w-[80px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSurveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="py-3">
                          <div>
                            <div className="font-medium text-sm line-clamp-1">
                              {survey.title}
                              {survey.isTemplate && <Badge variant="outline" className="ml-2 text-[10px] align-middle">Plantilla</Badge>}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-1 mt-1">{survey.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={survey.status === SurveyStatus.PUBLISHED ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {survey.status === SurveyStatus.PUBLISHED ? "Activo" : "Borrador"}
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
                          <Badge variant={survey.isAnonymous ? "default" : "outline"} className="text-xs">
                            {survey.isAnonymous ? "Sí" : "No"}
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
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-x-4">
                            <Link href={`/admin/surveys/${survey.id}/edit`} passHref className="text-gray-500 hover:text-gray-700">
                              <PencilIcon className="w-5 h-5"></PencilIcon>
                            </Link>
                            <Link href={`/admin/responses/${survey.id}`} passHref>
                              <EyeIcon className="w-5 h-5"/>  
                            </Link>
                            <button type="button" title="Duplicar" onClick={() => handleDuplicate(survey.id)} className="text-gray-500 hover:text-gray-700">
                              <Copy className="w-5 h-5" />
                            </button>
                            <span onClick={() => handleDelete(survey.id)}>
                              <Trash2 className="w-5 h-5 text-red-500"/>  
                            </span>
                          </div>
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
