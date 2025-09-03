"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// Importar los componentes de tabla de shadcn/ui
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Importar los tipos de Prisma directamente
import type { Survey as PrismaSurvey, SurveyStatus } from "@prisma/client" // ✅ Asegúrate de importar SurveyStatus
import { Alert, AlertDescription } from "@/components/ui/alert"

import { Search, FileText, ExternalLink, Eye, PlusCircle } from "lucide-react"

// ✅ Importar el nuevo componente del gráfico
import { Loader2 } from "lucide-react" // Necesario para el spinner de carga
import { SurveyResponsesBarChart } from "@/components/charts/chart-bar-interactive"

// =========================================================================
// INTERFACES - ¡AHORA ÚNICA Y EXTENDIDA!
// =========================================================================

// ✅ Extiende directamente de PrismaSurvey para incluir todas sus propiedades
// y luego añade las propiedades adicionales como '_count'.
export interface APISurvey extends PrismaSurvey { // Exporta para que pueda ser importada
  _count?: {
    responses: number;
    // Si _count también trae questions, puedes añadirlo aquí
    questions?: number;
  };
}

// =========================================================================
// SURVEYS LIST PAGE COMPONENT
// =========================================================================
export default function SurveysListPage() {
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
        const response = await fetch("/api/surveys?include=_count")
        if (!response.ok) {
          throw new Error(`Error al cargar encuestas: ${response.status}`)
        }
        const data: APISurvey[] = await response.json()
        setAllSurveys(data)
        setFilteredSurveys(data)
      } catch (err: any) {
        console.error("Error fetching surveys:", err)
        setErrorSurveys("Error al cargar las encuestas. Verifica que la API esté funcionando correctamente.")
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

    setFilteredSurveys(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [allSurveys, searchTerm])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Respuestas de Encuestas</h1>
            <p className="text-base text-gray-600">Gestiona tus encuestas y revisa sus respuestas</p>
          </div>
          <Link href="/admin/surveys/create" passHref>
            <Button size="default" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
              <PlusCircle className="w-5 h-5" />
              <span className="ml-2">Nueva Encuesta</span>
            </Button>
          </Link>
        </div>

        {loadingSurveys ? (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Cargando datos del gráfico...</CardTitle>
              <CardDescription>Obteniendo encuestas y sus respuestas.</CardDescription>
            </CardHeader>
            <CardContent className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Cargando...</span>
            </CardContent>
          </Card>
        ) : errorSurveys ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{errorSurveys}</AlertDescription>
          </Alert>
        ) : (
          <SurveyResponsesBarChart surveys={allSurveys} />
        )}

        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="w-5 h-5" />
                </div>
                <Input
                  placeholder="Buscar encuestas por título o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 text-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white"
                />
              </div>
              {errorSurveys && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorSurveys}</AlertDescription>
                </Alert>
              )}
            </div>

            {filteredSurveys.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="text-gray-300 mb-4 mx-auto">
                  <FileText className="w-20 h-20 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm ? "No se encontraron encuestas" : "No hay encuestas creadas"}
                </h3>
                <p className="text-gray-500 text-base max-w-md mx-auto">
                  {searchTerm
                    ? "Intenta ajustar el término de búsqueda para encontrar lo que buscas"
                    : "Comienza creando tu primera encuesta para verla aquí y empezar a recopilar respuestas."}
                </p>
                {!searchTerm && (
                  <Link href="/admin/surveys/new" className="mt-4 inline-block">
                    <Button size="default" className="bg-blue-600 hover:bg-blue-700">
                      <PlusCircle className="w-5 h-5" />
                      <span className="ml-2">Crear Primera Encuesta</span>
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-sm">Encuesta</TableHead>
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-center text-sm">
                        Respuestas
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-center text-sm">
                        Estado
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-center text-sm">
                        Anónima
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-center text-sm">
                        Creación
                      </TableHead>
                      <TableHead className="font-semibold text-gray-900 py-2 px-4 text-right text-sm">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSurveys.map((survey, index) => (
                      <TableRow
                        key={survey.id}
                        className={`hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        <TableCell className="py-3 px-4">
                          <div className="space-y-0.5">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">{survey.title}</h4>
                            {survey.description && (
                              <p className="text-xs text-gray-600 line-clamp-1 max-w-xs">{survey.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {survey._count?.responses || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              survey.status === "PUBLISHED"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : survey.status === "DRAFT"
                                  ? "bg-gray-100 text-gray-800 border-gray-200"
                                  : survey.status === "PAUSED" // ✅ Añadir el estado PAUSED
                                    ? "bg-orange-100 text-orange-800 border-orange-200"
                                    : "bg-yellow-100 text-yellow-800 border-yellow-200" // Fallback para otros estados
                            }`}
                          >
                            {survey.status === "PUBLISHED"
                              ? "Publicada"
                              : survey.status === "DRAFT"
                                ? "Borrador"
                                : survey.status === "PAUSED"
                                  ? "Pausada" // ✅ Texto para PAUSED
                                  : survey.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant={survey.isAnonymous ? "secondary" : "outline"}
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              survey.isAnonymous
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : "bg-gray-100 text-gray-600 border-gray-300"
                            }`}
                          >
                            {survey.isAnonymous ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <span className="text-xs text-gray-600 font-medium">
                            {new Date(survey.createdAt).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/surveys/${survey.id}/edit`} passHref>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span className="sr-only">Editar encuesta</span>
                              </Button>
                            </Link>
                            <Link href={`/admin/responses/${survey.id}`} passHref>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-green-100 hover:text-green-700"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="sr-only">Ver respuestas</span>
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}