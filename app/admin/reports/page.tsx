// --- START OF FILE ReportsPage.tsx ---

"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { useEffect, useState } from "react"
// import { AnalyticsService } from "@/lib/analytics" // <-- ELIMINAR ESTO
// import type { SurveyAnalytics } from "@/lib/analytics" // <-- Ajustar esta importación de tipo
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SurveyAnalyticsCard } from "@/components/reports/survey-analytics-card"
import { BarChart3, Download, Search, TrendingUp, Users, FileText, Loader2 } from "lucide-react" // Añadir Loader2
import { Alert, AlertDescription } from "@/components/ui/alert" // Añadir Alert para errores

// Definir interfaz para los datos de análisis agregados que devuelve tu API
interface AggregatedSurveyAnalytics {
  surveyId: string;
  surveyTitle: string;
  customLink: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED'; // Tipo del enum de Prisma
  totalViews: number;
  totalStarts: number;
  totalCompletions: number;
  totalQuestions: number;
  completionRate: number; // Tasa de completitud
}

// Define la URL base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';


export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<AggregatedSurveyAnalytics[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredAnalytics, setFilteredAnalytics] = useState<AggregatedSurveyAnalytics[]>([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);


  // Función para cargar los análisis desde la API
  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/survey-analytics`); // <-- Llama a tu nuevo API endpoint
      if (!response.ok) {
        throw new Error(`Error al cargar análisis: ${response.statusText}`);
      }
      const data: AggregatedSurveyAnalytics[] = await response.json();
      setAnalytics(data);
      setFilteredAnalytics(data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError("Error al cargar los datos de análisis. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(); // Cargar análisis al montar el componente
  }, []);

  // Lógica de filtrado
  useEffect(() => {
    const filtered = analytics.filter((item) =>
      item.surveyTitle.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredAnalytics(filtered)
  }, [searchTerm, analytics])

  // Función para exportar los datos de UNA encuesta (ahora con la API)
  const handleExport = async (surveyId: string, surveyTitle: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/survey-responses/${surveyId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error al exportar datos para ${surveyTitle}`);
      }

      const csvData = await response.text(); // Obtener el texto CSV
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${surveyTitle.replace(/[^a-zA-Z0-9]/g, '_')}_respuestas.csv`; // Nombre de archivo limpio
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      alert(`Datos de "${surveyTitle}" exportados correctamente.`);
    } catch (err: any) {
      console.error(`Error exporting data for survey ${surveyId}:`, err);
      alert(err.message || `Hubo un error al exportar los datos de "${surveyTitle}".`);
    }
  }

  // Exportar todas las encuestas
  const handleExportAll = async () => {
    setExportingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of analytics) {
      // Solo exportar si hay respuestas
      if (item.totalCompletions > 0) {
        try {
          await handleExport(item.surveyId, item.surveyTitle);
          successCount++;
          // Pequeño retraso para evitar sobrecargar el navegador o el servidor
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (exportErr) {
          console.error(`Error al exportar ${item.surveyTitle}:`, exportErr);
          errorCount++;
        }
      }
    }
    setExportingAll(false);
    alert(`Exportación masiva completada: ${successCount} encuestas exportadas, ${errorCount} errores.`);
  };

  // Calculate overall statistics
  const totalSurveys = analytics.length
  const totalResponses = analytics.reduce((sum, item) => sum + item.totalCompletions, 0) // Usar totalCompletions
  const activeSurveys = analytics.filter((item) => item.totalCompletions > 0).length // Basado en respuestas completas

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reportes y Análisis</h1>
            <p className="text-slate-600 mt-1">Analiza el rendimiento de tus encuestas</p>
          </div>
          <Button onClick={handleExportAll} disabled={totalResponses === 0 || exportingAll}>
            {exportingAll ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Exportar Todo
              </>
            )}
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Encuestas</p>
                  <p className="text-2xl font-bold text-slate-900">{totalSurveys}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Encuestas con Respuestas</p> {/* Renombrado */}
                  <p className="text-2xl font-bold text-slate-900">{activeSurveys}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Respuestas Completas</p> {/* Renombrado */}
                  <p className="text-2xl font-bold text-slate-900">{totalResponses}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="survey-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Promedio Respuestas/Encuesta</p> {/* Renombrado */}
                  <p className="text-2xl font-bold text-slate-900">
                    {totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Analytics Grid */}
        {loading ? (
          <Card className="survey-card">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              <p className="ml-2 text-slate-500">Cargando análisis...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredAnalytics.length === 0 ? (
              <Card className="survey-card">
                <CardContent className="text-center py-12">
                  <div className="text-slate-400 mb-4">
                    <BarChart3 className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {searchTerm ? "No se encontraron encuestas" : "No hay datos de análisis para mostrar"}
                  </h3>
                  <p className="text-slate-500">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Crea encuestas y recopila respuestas para ver análisis aquí"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnalytics.map((item) => (
                  <SurveyAnalyticsCard key={item.surveyId} analytics={item} onExport={() => handleExport(item.surveyId, item.surveyTitle)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}