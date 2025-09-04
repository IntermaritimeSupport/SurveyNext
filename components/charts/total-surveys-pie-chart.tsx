// components/charts/total-surveys-pie-chart.tsx
"use client"

import * as React from "react"
import { Label, Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import { useMemo, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartStyle, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SurveyStatus } from "@prisma/client" // Asumiendo que SurveyStatus viene de Prisma

// ✅ Asegúrate de importar APISurveyWithQuestions desde la fuente única (page.tsx de reportes)
import type { APISurveyWithQuestions } from "@/app/admin/reports/page"

interface SurveyStatusPieChartProps {
  surveys: APISurveyWithQuestions[]
}

const statusColors: Record<SurveyStatus, string> = {
  PUBLISHED: "hsl(142.1 76.2% 36.3%)", // Verde
  DRAFT: "hsl(210 40% 85%)",       // Gris claro
  PAUSED: "hsl(30 98% 46%)",         // Naranja
  ARCHIVED: "hsl(222.2 47.4% 25%)",   // Azul oscuro
  CLOSED: "hsl(0 0% 25%)",  
};


export function SurveyStatusPieChart({ surveys }: SurveyStatusPieChartProps) {
  const chartId = "survey-status-pie-chart";
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined); // Para interactividad

  const statusData = useMemo(() => {
    const counts = surveys.reduce((acc, survey) => {
      acc[survey.status] = (acc[survey.status] || 0) + 1;
      return acc;
    }, {} as Record<SurveyStatus, number>);

    return Object.entries(counts).map(([status, count], index) => ({
      status: status as SurveyStatus,
      count,
      key: `status-${status}`,
      fill: statusColors[status as SurveyStatus] || "hsl(0 0% 50%)", // Fallback color
    })).sort((a,b) => b.count - a.count); // Ordenar para mejor visualización
  }, [surveys]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: { label: "Número de Encuestas" },
    };
    statusData.forEach(item => {
      config[item.key as keyof typeof config] = {
        label: item.status,
        color: item.fill,
      };
    });
    return config;
  }, [statusData]);

  // Sincronizar el estado activo
  React.useEffect(() => {
    if (statusData.length > 0 && activeStatus === undefined) {
      setActiveStatus(statusData[0].status);
    } else if (statusData.length === 0 && activeStatus !== undefined) {
      setActiveStatus(undefined);
    }
  }, [statusData, activeStatus]);


  const activeIndex = React.useMemo(
    () => statusData.findIndex((item) => item.status === activeStatus),
    [activeStatus, statusData]
  );

  const totalSurveys = useMemo(() => statusData.reduce((acc, item) => acc + item.count, 0), [statusData]);

  if (statusData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Encuestas</CardTitle>
          <CardDescription>Distribución de encuestas por estado (Borrador, Publicada, etc.).</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center text-muted-foreground">
          No hay datos de encuestas para mostrar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-chart={chartId}>
      <ChartStyle id={chartId} config={chartConfig} />
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>Estado de Encuestas</CardTitle>
          <CardDescription>Distribución de encuestas por estado (Borrador, Publicada, etc.).</CardDescription>
        </div>
        <Select value={activeStatus} onValueChange={setActiveStatus} disabled={statusData.length <= 1}>
          <SelectTrigger className="ml-auto h-7 w-[150px] rounded-lg pl-2.5" aria-label="Seleccionar estado">
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            {statusData.map((item) => {
              const configItem = chartConfig[item.key as keyof typeof chartConfig];
              return (
                <SelectItem key={item.key} value={item.status} className="rounded-lg [&_span]:flex">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex h-3 w-3 shrink-0 rounded-xs" style={{ backgroundColor: configItem?.color }} />
                    {item.status === "PUBLISHED" ? "Publicada" : item.status === "DRAFT" ? "Borrador" : item.status === "PAUSED" ? "Pausada" : item.status}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          id={chartId}
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={statusData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector {...props} outerRadius={outerRadius + 25} innerRadius={outerRadius + 12} />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                    return null;
                  }
                  const cx = viewBox.cx;
                  const cy = viewBox.cy;

                  let displayValue: number;
                  let displayText: string;

                  if (activeIndex !== -1) {
                    const activeItem = statusData[activeIndex];
                    displayValue = activeItem.count;
                    displayText = activeItem.status === "PUBLISHED" ? "Publicadas" : activeItem.status === "DRAFT" ? "Borrador" : activeItem.status === "PAUSED" ? "Pausadas" : activeItem.status;
                  } else {
                    displayValue = totalSurveys;
                    displayText = "Total Encuestas";
                  }

                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} y={cy} className="fill-foreground text-3xl font-bold">
                        {displayValue.toLocaleString()}
                      </tspan>
                      <tspan x={cx} y={(cy || 0) + 24} className="fill-muted-foreground">
                        {displayText}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}