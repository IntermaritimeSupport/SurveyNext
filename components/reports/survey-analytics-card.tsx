// components/reports/survey-analytics-card.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, CheckCircle, Eye } from "lucide-react";
import Link from "next/link";
import { SurveyStatus } from '@prisma/client'; // Importar SurveyStatus

// Interfaz para el prop analytics que coincida con AggregatedSurveyAnalytics
interface SurveyAnalyticsCardProps {
  analytics: {
    surveyId: string;
    surveyTitle: string;
    customLink: string;
    status: SurveyStatus; // Usar el enum de Prisma
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    totalQuestions: number;
    completionRate: number;
  };
  onExport: (surveyId: string, surveyTitle: string) => void; // Recibe surveyId y surveyTitle
}

export function SurveyAnalyticsCard({ analytics, onExport }: SurveyAnalyticsCardProps) {
  const isPublished = analytics.status === SurveyStatus.PUBLISHED; // Verificar si está publicada

  return (
    <Card className="survey-card">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-2">{analytics.surveyTitle}</CardTitle>
        <p className="text-sm text-slate-500 mt-1">Enlace: /{analytics.customLink}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Vistas</p>
            <p className="text-xl font-bold text-slate-900">{analytics.totalViews}</p>
          </div>
          <div>
            <p className="text-slate-600">Inicios</p>
            <p className="text-xl font-bold text-slate-900">{analytics.totalStarts}</p>
          </div>
          <div>
            <p className="text-slate-600">Completadas</p>
            <p className="text-xl font-bold text-slate-900">{analytics.totalCompletions}</p>
          </div>
          <div>
            <p className="text-slate-600">Tasa de Completitud</p>
            <p className="text-xl font-bold text-slate-900">{analytics.completionRate}%</p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
          <Link href={`/admin/reports/${analytics.surveyId}`} passHref> {/* Asumiendo una página de reporte detallado */}
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Reporte
            </Button>
          </Link>
          <Button onClick={() => onExport(analytics.surveyId, analytics.surveyTitle)} size="sm" disabled={analytics.totalCompletions === 0}>
            Exportar CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}