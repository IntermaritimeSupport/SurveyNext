// src/app/api/admin/dashboard-stats/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, SurveyStatus } from '@prisma/client'
const prisma = new PrismaClient()

// Interfaz para las estadísticas que la API devolverá
interface DashboardStats {
  totalSurveys: number;
  publishedSurveys: number;
  totalResponses: number;
  avgResponseRate: number; // En porcentaje (0-100)
}

export async function GET(request: Request) {
  try {
    // --- 1. Obtener el total de encuestas ---
    const totalSurveys = await prisma.survey.count();

    // --- 2. Obtener el total de encuestas publicadas ---
    const publishedSurveys = await prisma.survey.count({
      where: {
        status: SurveyStatus.PUBLISHED,
      },
    });

    // --- 3. Obtener el total de respuestas ---
    const totalResponses = await prisma.surveyResponse.count();

    // --- 4. Calcular la tasa de respuesta promedio ---
    let avgResponseRate = 0;
    if (publishedSurveys > 0) {
      const surveysWithResponses = await prisma.survey.count({
        where: {
          status: SurveyStatus.PUBLISHED,
          responses: {
            some: {}, // Busca si tiene al menos una respuesta
          },
        },
      });
      avgResponseRate = (surveysWithResponses / publishedSurveys) * 100;
    }

    const stats: DashboardStats = {
      totalSurveys,
      publishedSurveys,
      totalResponses,
      avgResponseRate: parseFloat(avgResponseRate.toFixed(1)), // Redondear a un decimal
    };

    return NextResponse.json(stats, { status: 200 });
  } catch (error: any) {
    console.error('API /admin/dashboard-stats GET: Error fetching dashboard stats:', error);
    return NextResponse.json({ message: 'Error al obtener las estadísticas del dashboard' }, { status: 500 });
  }
}