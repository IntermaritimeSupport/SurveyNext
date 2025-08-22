// --- START OF FILE app/admin/surveys/page.tsx ---

"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
// import { surveyStore } from "@/lib/survey-store" // <-- ELIMINAR ESTO
// import type { Survey } from "@/types/survey" // <-- Ajustar esta importación de tipo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { PlusCircle, Search, Eye, Edit, Trash2, MoreHorizontal, Loader2 } from "lucide-react" // Añadir Loader2
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { LinkSharing } from "@/components/admin/link-sharing"
import { Alert, AlertDescription } from "@/components/ui/alert" // Añadir Alert para errores

// Importar los tipos de Prisma
import { Survey as PrismaSurvey, SurveyStatus } from '@prisma/client';

// Extender el tipo de Survey de Prisma para incluir el conteo de preguntas (si la API lo devuelve)
interface APISurvey extends PrismaSurvey {
  questions?: { id: string }[]; // Para saber el número de preguntas, o _count.questions si la API lo incluye
  _count?: {
    questions?: number;
    responses?: number;
  };
}

// Define la URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';


export default function SurveysPage() {
  const [surveys, setSurveys] = useState<APISurvey[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSurveys, setFilteredSurveys] = useState<APISurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar las encuestas desde la API
  const fetchSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/surveys`); // Llama a tu API de encuestas
      if (!response.ok) {
        throw new Error(`Error al cargar encuestas: ${response.statusText}`);
      }
      const data: APISurvey[] = await response.json();
      setSurveys(data);
      setFilteredSurveys(data); // Inicialmente, las encuestas filtradas son todas
    } catch (err: any) {
      console.error("Error fetching surveys:", err);
      setError("Error al cargar las encuestas. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys(); // Cargar encuestas al montar el componente
  }, []);

  // Lógica de filtrado
  useEffect(() => {
    const filtered = surveys.filter(
      (survey) =>
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (survey.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()), // Manejar descripción nula
    )
    setFilteredSurveys(filtered)
  }, [searchTerm, surveys])

  // Función para eliminar encuestas (ahora interactúa con la API)
  const handleDelete = async (surveyId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta encuesta? Esta acción es irreversible.")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Error al eliminar la encuesta: ${response.statusText}`);
        }

        // Si la eliminación fue exitosa, actualiza el estado local
        const updatedSurveys = surveys.filter((s) => s.id !== surveyId);
        setSurveys(updatedSurveys);
        setFilteredSurveys(updatedSurveys); // También actualiza las filtradas
        alert("Encuesta eliminada correctamente.");
      } catch (err: any) {
        console.error("Error deleting survey:", err);
        setError(`Error al eliminar la encuesta: ${err.message}`);
        // Considera re-fetch de datos si la eliminación no fue atómica
        // fetchSurveys();
      }
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestión de Encuestas</h1>
            <p className="text-slate-600 mt-1">Administra todas tus encuestas desde aquí</p>
          </div>
          <Link href="/admin/surveys/create">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-5 w-5 mr-2" />
              Nueva Encuesta
            </Button>
          </Link>
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
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading ? (
          <Card className="survey-card">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              <p className="ml-2 text-slate-500">Cargando encuestas...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Surveys List */}
            {filteredSurveys.length === 0 ? (
              <Card className="survey-card">
                <CardContent className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <PlusCircle className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {searchTerm ? "No se encontraron encuestas" : "No hay encuestas creadas"}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Comienza creando tu primera encuesta para recopilar datos"}
                  </p>
                  {!searchTerm && (
                    <Link href="/admin/surveys/create">
                      <Button>Crear Primera Encuesta</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSurveys.map((survey) => (
                  <Card key={survey.id} className="survey-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">{survey.title}</CardTitle>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{survey.description}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              {/* Asegúrate de que solo se pueda previsualizar si está publicada */}
                              <Link href={`/survey/${survey.customLink}`} target="_blank">
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Encuesta
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/surveys/${survey.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(survey.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={survey.status === SurveyStatus.PUBLISHED ? "default" : "secondary"}>
                            {survey.status === SurveyStatus.PUBLISHED ? "Activa" : "Borrador"}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {survey._count?.questions || 0} pregunta{ (survey._count?.questions || 0) !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500">
                          <p>Enlace: /{survey.customLink}</p>
                          <p>Creada: {new Date(survey.createdAt).toLocaleDateString()}</p>
                        </div>

                        <LinkSharing surveyTitle={survey.title} customLink={survey.customLink} isActive={survey.status === SurveyStatus.PUBLISHED} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
// --- END OF FILE SurveysPage.tsx ---