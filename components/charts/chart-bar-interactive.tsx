"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { APISurveyWithQuestions } from "@/app/admin/reports/page"

interface SurveyResponsesBarChartProps {
  surveys: APISurveyWithQuestions[]
}

export function SurveyResponsesBarChart({ surveys }: SurveyResponsesBarChartProps) {
  // Obtener la fecha actual para filtrar por mes
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();

  const chartData = React.useMemo(() => {
    return surveys
      .filter(survey => {
        // Asegurarse de que el título y las respuestas existan
        if (!survey.title || survey._count?.responses === undefined) {
          return false;
        }
        // Convertir createdAt a Date object para comparar
        const createdAtDate = new Date(survey.createdAt);
        // Filtrar solo las encuestas del mes y año actual
        return (
          createdAtDate.getMonth() === currentMonth &&
          createdAtDate.getFullYear() === currentYear
        );
      })
      .map((survey, index) => ({
        key: `survey-${index}`,
        title: survey.title,
        responses: survey._count?.responses || 0,
      }));
  }, [surveys, currentMonth, currentYear]); // ✅ Añadir dependencias al useMemo

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      responses: {
        label: "Número de Respuestas",
        color: "hsl(217.2 91.2% 59.8%)",
      },
    };
    chartData.forEach((item) => {
      config[item.key as keyof typeof config] = {
        label: item.title,
        color: "hsl(217.2 91.2% 59.8%)",
      };
    });
    return config;
  }, [chartData]);

  const totalResponses = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.responses, 0);
  }, [chartData]);

  // Formatear el nombre del mes para la descripción
  const monthName = now.toLocaleDateString('es-ES', { month: 'long' });

  if (chartData.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Respuestas por Encuesta</CardTitle>
          <CardDescription>Visualización del número de respuestas recibidas por cada encuesta.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
          No hay encuestas con respuestas creadas en {monthName} de {currentYear} para mostrar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>Respuestas por Encuesta</CardTitle>
          <CardDescription>
            Mostrando el total de respuestas para {chartData.length} encuestas creadas en **{monthName} de {currentYear}**. Total: {totalResponses.toLocaleString()}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 5,
              bottom: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="title"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              dataKey="responses"
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  labelFormatter={(value) => `Encuesta: ${value}`}
                  formatter={(value) => [`${(value as number).toLocaleString()} respuestas`, chartConfig.responses.label]}
                />
              }
            />
            <Bar
              dataKey="responses"
              fill="var(--color-responses)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}