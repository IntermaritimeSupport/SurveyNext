// src/app/dashboard/responses/[surveyId]/page.tsx
"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation" // Importar useParams, useRouter
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, User, Calendar, Loader2, ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"

// Importar los tipos de Prisma
import { type SurveyResponse as PrismaSurveyResponse, type User as PrismaUser, type Survey as PrismaSurvey } from "@prisma/client"
import { Alert, AlertDescription } from "@/components/ui/alert"

// =========================================================================
// INTERFACES
// =========================================================================

// Interfaz para la respuesta de la API de GET /api/surveys/[surveyId]/responses
interface APISurveyResponseListItem extends Omit<PrismaSurveyResponse, "email" | "userId" | "surveyId"> {
  id: string; // Asegurar que el ID está presente
  email: string | null;
  user: Pick<PrismaUser, "id" | "name" | "email"> | null;
  survey: Pick<PrismaSurvey, "id" | "title" | "description" | "isAnonymous">;
  // No necesitamos 'answers' aquí para la lista, se obtendrá en el detalle
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// =========================================================================
// SURVEY RESPONSES LIST PAGE COMPONENT
// =========================================================================
export default function SurveyResponsesListPage() {
  const params = useParams();
  const router = useRouter();

  const surveyId = typeof params.surveyId === 'string' ? params.surveyId : undefined;
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState("Cargando..."); // Para mostrar el título de la encuesta
  const [surveyResponses, setSurveyResponses] = useState<APISurveyResponseListItem[]>([])
  const [filteredResponses, setFilteredResponses] = useState<APISurveyResponseListItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingResponses, setLoadingResponses] = useState(true)
  const [errorResponses, setErrorResponses] = useState<string | null>(null)

  useEffect(() => {
    if (!surveyId) {
      setErrorResponses("ID de encuesta no proporcionado.");
      setLoadingResponses(false);
      return;
    }

    const fetchResponses = async () => {
      setLoadingResponses(true);
      setErrorResponses(null);
      try {
        // ✅ CORRECCIÓN: Llamada a la API correcta para las respuestas de una encuesta
        const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}/responses`);
        if (!response.ok) {
          throw new Error(`Error al cargar respuestas: ${response.status}`);
        }
        const data: APISurveyResponseListItem[] = await response.json();
        setSurveyResponses(data);
        setFilteredResponses(data);
        // Intentar obtener el título de la encuesta desde la primera respuesta o una llamada separada
        if (data.length > 0) {
            setSelectedSurveyTitle(data[0].survey.title);
        } else {
            // Si no hay respuestas, hacer una llamada para obtener solo el título de la encuesta
            const surveyResponse = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`);
            if (surveyResponse.ok) {
                const surveyData = await surveyResponse.json();
                setSelectedSurveyTitle(surveyData.title);
            } else {
                 setSelectedSurveyTitle("Encuesta Desconocida");
            }
        }

      } catch (err: any) {
        console.error("Error fetching responses:", err);
        setErrorResponses("Error al cargar las respuestas de la encuesta.");
      } finally {
        setLoadingResponses(false);
      }
    };
    fetchResponses();
  }, [surveyId]);

  useEffect(() => {
    let filtered = surveyResponses;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((response) => {
        const respondentIdentifier = response.user?.email?.toLowerCase() || response.email?.toLowerCase() || "anónimo";
        return respondentIdentifier.includes(searchLower);
      });
    }

    setFilteredResponses(filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
  }, [surveyResponses, searchTerm]);

  const handleBackToSurveys = () => {
    router.push('/dashboard/responses'); // Volver a la lista principal de encuestas
  };

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
              className="flex items-center space-x-2 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Respuestas - {selectedSurveyTitle}
              </h1>
              <p className="text-slate-600 mt-1">
                Visualiza las respuestas de "{selectedSurveyTitle}"
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
                placeholder="Buscar por participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {errorResponses && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorResponses}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Responses List */}
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
                  // ✅ CORRECCIÓN: Link para ir al detalle de la respuesta
                  <Link 
                    href={`/admin/responses/${surveyId}/${response.id}`} 
                    key={response.id} 
                    passHref
                  >
                    <Card className="survey-card cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Badge variant="outline">ID: {response.id.slice(-8)}</Badge>
                              {response.survey.isAnonymous && <Badge variant="secondary">Anónima</Badge>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>{response.user?.name || response.user?.email || response.email || "Anónimo"}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(response.startedAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <Eye className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-500">Ver detalle</span>
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