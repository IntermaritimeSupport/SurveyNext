// --- START OF FILE app/survey/[customLink]/page.tsx ---

"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
// import { surveyStore } from "@/lib/survey-store" // <-- ELIMINAR ESTO
// import type { Survey } from "@/types/survey" // <-- Ajustar esta importación de tipo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SurveyForm } from "@/components/survey-public/survey-form"
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react" // Añadir Loader2
import Link from "next/link"

// Importar los tipos de Prisma
import { QuestionType as PrismaQuestionType } from '@prisma/client';
import Loader from "@/components/loaders/loader"

// Re-definir las interfaces para que coincidan con la respuesta del endpoint /api/public/survey-questions/[customLink]
interface PublicSurvey {
  id: string;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  showProgress: boolean;
  allowMultipleResponses: boolean;
  // Otros campos necesarios que tu API pública devuelva
}

interface PublicQuestion {
  id: string;
  title: string;
  description: string | null;
  type: PrismaQuestionType;
  required: boolean;
  order: number;
  options: any | null; // El tipo Json en Prisma se mapea a 'any' o 'Record<string, any>[]'
  validation: any | null; // El tipo Json en Prisma
}

// Interfaz para la respuesta completa de la API
interface SurveyData {
  survey: PublicSurvey;
  questions: PublicQuestion[];
}

// Define la URL base de la API (misma lógica que en auth-context)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';


export default function SurveyPublicPage() {
  const params = useParams()
  const customLink = params.customLink as string
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null) // Almacenar el objeto completo de la API
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customLink) {
      setError("Enlace de encuesta no válido.");
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/survey-questions/${customLink}`);

        if (!response.ok) {
          const errorData = await response.json();
          // Los mensajes de error personalizados de la API serán útiles aquí
          throw new Error(errorData.message || 'Error al cargar la encuesta. Inténtalo de nuevo.');
        }

        const data: SurveyData = await response.json();
        setSurveyData(data); // Almacena tanto la encuesta como las preguntas
      } catch (err: any) {
        console.error("Error fetching public survey:", err);
        setError(err.message || "Error al cargar la encuesta.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [customLink]); // Depende de customLink para volver a cargar si cambia

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100vh]">
        <Loader/>
      </div>
    )
  }

  // Si hay error o no se pudo cargar la data de la encuesta
  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-slate-900">Encuesta No Disponible</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-slate-600">Posibles razones:</p>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• El enlace es incorrecto o ha expirado</li>
                <li>• La encuesta ha sido desactivada</li>
                <li>• La encuesta ha sido eliminada</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir al Inicio
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si la encuesta y las preguntas se cargaron correctamente, pásalas a SurveyForm
  return <SurveyForm survey={surveyData?.survey} questions={surveyData.questions} />
}