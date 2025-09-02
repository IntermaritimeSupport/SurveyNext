// src/components/DashboardStats.tsx
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MessageSquare, TrendingUp, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Interfaz para las estadísticas que la API devolverá (coincide con el backend)
interface DashboardStats {
  totalSurveys: number
  publishedSurveys: number
  totalResponses: number
  avgResponseRate: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    publishedSurveys: 0,
    totalResponses: 0,
    avgResponseRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard-stats`);
        if (!response.ok) {
          throw new Error(`Error al cargar las estadísticas: ${response.status}`);
        }
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching dashboard stats:", err);
        setError("Error al cargar las estadísticas del dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // ✅ CORRECCIÓN: Define statCards AQUÍ, después de que 'stats' esté disponible
  // y lo puedes usar para construir las tarjetas.
  const statCards = [
    {
      title: "Total de Encuestas",
      value: stats.totalSurveys,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Encuestas Publicadas",
      value: stats.publishedSurveys,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Respuestas",
      value: stats.totalResponses,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Tasa de Respuesta",
      value: `${stats.avgResponseRate.toFixed(1)}%`, // Formatear a 1 decimal
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  if (loading) {
    return (
      <Card className="survey-card col-span-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="ml-2 text-slate-500">Cargando estadísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="col-span-full">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => { // ✅ Ahora sí mapeamos sobre statCards
        const Icon = stat.icon;
        return (
          <Card key={index} className="survey-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}