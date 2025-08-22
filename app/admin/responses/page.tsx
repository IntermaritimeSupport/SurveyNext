// --- START OF FILE ResponsesPage.tsx ---

"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Eye, Calendar, User, Loader2 } from "lucide-react"
import Link from "next/link"

// Importar los tipos de Prisma
import {
  Survey as PrismaSurvey,
  SurveyResponse as PrismaSurveyResponse,
  Answer as PrismaAnswer,
  User as PrismaUser,
  Question as PrismaQuestion,
  QuestionType as PrismaQuestionType,
} from '@prisma/client';
import { Alert, AlertDescription } from "@/components/ui/alert"

// =========================================================================
// INTERFACES (Asegúrate de que estas sean consistentes con lo que tu API devuelve)
// =========================================================================

interface APIQuestion extends Pick<PrismaQuestion, 'id' | 'title' | 'type' | 'options'> {}

interface APIAnswer extends Pick<PrismaAnswer, 'id' | 'value'> {
  question: APIQuestion | null;
}

interface APISurveyResponse extends Omit<PrismaSurveyResponse, 'email' | 'userId' | 'surveyId'> {
  email: string | null;
  user: Pick<PrismaUser, 'id' | 'name' | 'email'> | null;
  survey: Pick<PrismaSurvey, 'id' | 'title' | 'description' | 'isAnonymous'>;
  answers: APIAnswer[];
}

interface APISurvey extends Pick<PrismaSurvey, 'id' | 'title'> {}

// =========================================================================
// UTILITIES
// =========================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Función auxiliar para renderizar el valor de la respuesta en la vista previa
const renderAnswerValue = (answer: APIAnswer): string => {
  if (!answer.question) return "Pregunta no disponible";

  const questionType = answer.question.type;
  const value = answer.value;

  if (value === null || value === undefined) {
    return "N/A";
  }

  // Asegurarse de que las opciones estén parseadas si son strings
  const options = typeof answer.question.options === 'string'
    ? JSON.parse(answer.question.options)
    : answer.question.options;

  switch (questionType) {
    case PrismaQuestionType.CHECKBOXES:
      if (Array.isArray(value)) {
        const optionsMap = new Map((options as { value: string, label: string }[] || []).map(opt => [opt.value, opt.label]));
        // Asegurarse de que `v` es manejado como string para el map
        return value.map(v => optionsMap.get(String(v)) || String(v)).join(", ");
      }
      return String(value);
    case PrismaQuestionType.MULTIPLE_CHOICE:
    case PrismaQuestionType.DROPDOWN:
      const singleOptionMap = new Map((options as { value: string, label: string }[] || []).map(opt => [opt.value, opt.label]));
      return singleOptionMap.get(String(value)) || String(value); // Convertir value a string para la búsqueda en el mapa

    case PrismaQuestionType.FILE_UPLOAD:
      if (typeof value === 'object' && value !== null && 'fileName' in value && typeof value.fileName === 'string') {
        return `Archivo: ${value.fileName}`;
      }
      return "Archivo subido";

    case PrismaQuestionType.SIGNATURE:
      return "Firma (imagen)";

    case PrismaQuestionType.DATE:
    case PrismaQuestionType.TIME:
      if (typeof value === 'string' || typeof value === 'number') {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString();
          }
        } catch (e) {
          console.warn("Error parsing date/time value:", value, e);
        }
      }
      return String(value);

    case PrismaQuestionType.NUMBER:
    case PrismaQuestionType.SCALE:
      return String(value);

    case PrismaQuestionType.MATRIX:
        if (typeof value === 'object' && value !== null) {
            return `Matriz: ${JSON.stringify(value)}`;
        }
        return String(value);

    default: // TEXT, TEXTAREA, EMAIL, PHONE, URL, BOOLEAN
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      const textValue = String(value);
      return textValue.length > 50 ? textValue.substring(0, 50) + "..." : textValue;
  }
};


// =========================================================================
// RESPONSES PAGE COMPONENT
// =========================================================================
export default function ResponsesPage() {
  const [allResponses, setAllResponses] = useState<APISurveyResponse[]>([]);
  const [allSurveys, setAllSurveys] = useState<APISurvey[]>([]);
  const [filteredResponses, setFilteredResponses] = useState<APISurveyResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState<string>("all");
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [errorResponses, setErrorResponses] = useState<string | null>(null);
  const [errorSurveys, setErrorSurveys] = useState<string | null>(null);

  // Cargar todas las encuestas para el filtro
  useEffect(() => {
    const fetchSurveys = async () => {
      setLoadingSurveys(true);
      setErrorSurveys(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys`);
        if (!response.ok) {
          throw new Error(`Error al cargar encuestas: ${response.status}`);
        }
        const data: APISurvey[] = await response.json();
        setAllSurveys(data);
      } catch (err: any) {
        console.error("Error fetching surveys:", err);
        setErrorSurveys("Error al cargar las encuestas para el filtro.");
      } finally {
        setLoadingSurveys(false);
      }
    };
    fetchSurveys();
  }, []);

  // Cargar todas las respuestas
  useEffect(() => {
    const fetchResponses = async () => {
      setLoadingResponses(true);
      setErrorResponses(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/survey-responses`);
        if (!response.ok) {
          throw new Error(`Error al cargar respuestas: ${response.status}`);
        }
        const data: APISurveyResponse[] = await response.json();
        setAllResponses(data);
        setFilteredResponses(data);
      } catch (err: any) {
        console.error("Error fetching responses:", err);
        setErrorResponses("Error al cargar las respuestas.");
      } finally {
        setLoadingResponses(false);
      }
    };
    fetchResponses();
  }, []);

  // Lógica de filtrado
  useEffect(() => {
    let currentFiltered = allResponses;

    if (selectedSurvey !== "all") {
      currentFiltered = currentFiltered.filter((response) => response.survey.id === selectedSurvey);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      currentFiltered = currentFiltered.filter((response) => {
        const surveyTitle = response.survey?.title.toLowerCase() || "";
        const respondentIdentifier = response.user?.email?.toLowerCase() || response.email?.toLowerCase() || "anónimo";

        const answerTexts = response.answers.map(ans => {
            const questionTitle = ans.question?.title.toLowerCase() || "";
            let answerValue = "";
            if (ans.value !== null && ans.value !== undefined) {
              if (Array.isArray(ans.value)) {
                // CORRECCIÓN AQUÍ: Asegurarse de que cada `v` se convierte a string de forma segura
                answerValue = ans.value.map((v: unknown) => (v !== null && v !== undefined) ? String(v) : '').join(" ").toLowerCase();
              } else if (typeof ans.value === 'object') {
                answerValue = JSON.stringify(ans.value).toLowerCase();
              } else {
                answerValue = String(ans.value).toLowerCase();
              }
            }
            return `${questionTitle} ${answerValue}`;
        }).join(" ");

        return surveyTitle.includes(searchLower) || respondentIdentifier.includes(searchLower) || answerTexts.includes(searchLower);
      });
    }

    setFilteredResponses(currentFiltered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
  }, [allResponses, allSurveys, searchTerm, selectedSurvey]);

  const isLoading = loadingResponses || loadingSurveys;
  const hasErrors = errorResponses || errorSurveys;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Respuestas</h1>
            <p className="text-slate-600 mt-1">Visualiza todas las respuestas recibidas</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="survey-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por encuesta, participante o contenido de respuesta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSurvey} onValueChange={setSelectedSurvey} disabled={isLoading}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Filtrar por encuesta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las encuestas</SelectItem>
                  {allSurveys.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasErrors && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errorResponses || errorSurveys}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <Card className="survey-card">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              <p className="ml-2 text-slate-500">Cargando respuestas...</p>
          </CardContent>
          </Card>
        ) : (
          <>
            {/* Responses List */}
            {filteredResponses.length === 0 ? (
              <Card className="survey-card">
                <CardContent className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <User className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {searchTerm || selectedSurvey !== "all" ? "No se encontraron respuestas" : "No hay respuestas"}
                  </h3>
                  <p className="text-slate-500">
                    {searchTerm || selectedSurvey !== "all"
                      ? "Intenta ajustar los filtros de búsqueda"
                      : "Las respuestas aparecerán aquí cuando los usuarios completen las encuestas"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredResponses
                  .map((response) => (
                    <Card key={response.id} className="survey-card">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-slate-900">{response.survey.title}</h3>
                              <Badge variant="outline">ID: {response.id.slice(-8)}</Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>
                                  {response.user?.email || response.email || "Anónimo"}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(response.startedAt).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4" />
                                <span>{response.answers.length} respuestas</span>
                              </div>
                            </div>

                            {/* Preview of answers */}
                            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-2">Vista previa de respuestas:</p>
                              <div className="space-y-1">
                                {response.answers.slice(0, 2).map((answer) => (
                                  <div key={answer.id} className="text-sm">
                                    <span className="font-medium text-slate-700">{answer.question?.title || "Pregunta desconocida"}: </span>
                                    <span className="text-slate-600">
                                      {renderAnswerValue(answer)}
                                    </span>
                                  </div>
                                ))}
                                {response.answers.length > 2 && (
                                  <p className="text-xs text-slate-400">... y {response.answers.length - 2} más</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <Link href={`/admin/responses/${response.id}`}>
                              <Button variant="outline" size="sm" className="bg-transparent">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
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
// --- END OF FILE ResponsesPage.tsx ---