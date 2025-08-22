// --- START OF FILE RecentSurveys.tsx ---

"use client"

import { useEffect, useState } from "react"
// import { surveyStore } from "@/lib/survey-store" // <-- ELIMINAR ESTO
// import type { Survey } from "@/types/survey" // <-- Ajustar esta importación de tipo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Edit, MoreHorizontal, Loader2 } from "lucide-react" // Añadir Loader2 para spinners
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

// Importar los tipos de Prisma
import { Survey as PrismaSurvey, SurveyStatus } from '@prisma/client';

// Define la URL base de la API (misma lógica que en auth-context)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Definir una interfaz para la encuesta que incluya el conteo de respuestas
// dado que tu API devuelve _count.responses
interface SurveyWithCount extends PrismaSurvey {
  _count?: {
    responses: number;
  };
}

export function RecentSurveys() {
  const [surveys, setSurveys] = useState<SurveyWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentSurveys = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/surveys`); // Llama a tu API de encuestas
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: SurveyWithCount[] = await response.json();

        // Filtra y ordena las 5 más recientes como lo hacías antes
        const recent = data
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        setSurveys(recent);
      } catch (err: any) {
        console.error("Error fetching recent surveys:", err);
        setError("Error al cargar las encuestas recientes.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSurveys();
  }, []); // El array de dependencias vacío asegura que se ejecute solo una vez al montar

  if (loading) {
    return (
      <Card className="survey-card">
        <CardHeader>
          <CardTitle>Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Cargando encuestas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="survey-card">
        <CardHeader>
          <CardTitle>Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (surveys.length === 0) {
    return (
      <Card className="survey-card">
        <CardHeader>
          <CardTitle>Encuestas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">No hay encuestas creadas aún</p>
            <Link href="/admin/surveys/create">
              <Button>Crear Primera Encuesta</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="survey-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Encuestas Recientes</CardTitle>
        <Link href="/admin/surveys">
          <Button variant="outline" size="sm">
            Ver Todas
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {surveys.map((survey) => (
            <div key={survey.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-slate-900">{survey.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{survey.description}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant={survey.status === SurveyStatus.PUBLISHED ? "default" : "secondary"}>
                    {survey.status === SurveyStatus.PUBLISHED ? "Activa" : "Borrador"}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    {survey._count?.responses || 0} respuesta{survey._count?.responses !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Asegúrate de que solo se pueda previsualizar si está publicada */}
                <Link href={`/survey/${survey.customLink}`} target="_blank">
                  <Button variant="outline" size="sm" disabled={survey.status !== SurveyStatus.PUBLISHED}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/surveys/${survey.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/responses?survey=${survey.id}`}>Ver Respuestas</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
// --- END OF FILE RecentSurveys.tsx ---