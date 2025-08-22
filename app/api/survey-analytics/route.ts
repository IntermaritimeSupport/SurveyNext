// app/api/survey-analytics/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient()

// GET /api/survey-analytics - Obtener análisis agregados por encuesta
export async function GET(request: Request) {
  try {
    // Agrupar por surveyId y sumar views, starts, completions
    const aggregatedAnalytics = await prisma.surveyAnalytics.groupBy({
      by: ['surveyId'],
      _sum: {
        views: true,
        starts: true,
        completions: true,
      },
      // Puedes incluir el promedio de tiempo si lo gestionas adecuadamente
    });

    // Obtener información de las encuestas para adjuntar los títulos y customLinks
    const surveyIds = aggregatedAnalytics.map(a => a.surveyId);
    const surveys = await prisma.survey.findMany({
      where: {
        id: { in: surveyIds },
      },
      select: {
        id: true,
        title: true,
        customLink: true,
        status: true, // Para saber si está activa
        questions: { // Para el conteo de preguntas
          select: { id: true }
        },
      },
    });

    // Mapear y combinar los datos
    const result = aggregatedAnalytics.map(item => {
      const surveyInfo = surveys.find(s => s.id === item.surveyId);
      return {
        surveyId: item.surveyId,
        surveyTitle: surveyInfo?.title || 'Encuesta desconocida',
        customLink: surveyInfo?.customLink || '',
        status: surveyInfo?.status,
        totalViews: item._sum.views || 0,
        totalStarts: item._sum.starts || 0,
        totalCompletions: item._sum.completions || 0,
        totalQuestions: surveyInfo?.questions.length || 0, // Conteo de preguntas
        // Puedes calcular el porcentaje de completitud aquí si lo necesitas
        completionRate: (item._sum.starts && item._sum.completions) ?
                        ( (item._sum.completions / item._sum.starts) * 100).toFixed(2) : 0,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching aggregated analytics:', error);
    return NextResponse.json({ message: 'Error al obtener los análisis agregados' }, { status: 500 });
  }
}