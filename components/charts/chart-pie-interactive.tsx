"use client"

import {
  Label,
  Pie,
  PieChart,
  Sector,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts"
import type { PieSectorDataItem } from "recharts/types/polar/Pie"
import { useMemo } from "react"
// import { Download } from "lucide-react" // No se usaba
// import { Button } from "@/components/ui/button" // No se usaba

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { APISurveyWithQuestions } from "@/app/admin/reports/page"

// =========================================================================
// INTERFACES
// =========================================================================

interface ChartQuestionData {
  id: string
  title: string
  type:
    | "URL"
    | "DROPDOWN"
    | "RATING"
    | "NUMBER"
    | "TIME"
    | "EMAIL"
    | "PHONE"
    | "MULTIPLE_CHOICE"
    | "CHECKBOXES"
    | "SCALE"
  order: number
  options?: { value: string; label: string }[]
  responsesSummary?: { option: string; count: number }[]
}

interface SurveyQuestionResponsesChartProps {
  surveyTitle?: string
  questions?: ChartQuestionData[]
  surveys?: APISurveyWithQuestions[]
  loading?: boolean
  error?: string | null
}

// =========================================================================
// PALETA DE COLORES VIBRANTES
// =========================================================================
const vibrantPalette = [
  "hsl(217.2 91.2% 59.8%)", // Blue
  "hsl(142.1 76.2% 36.3%)", // Green
  "hsl(346.8 77.2% 49.8%)", // Red/Pink
  "hsl(47.9 95.8% 53.1%)", // Yellow
  "hsl(262.1 83.3% 57.8%)", // Purple
  "hsl(24.6 95% 53.1%)", // Orange
  "hsl(173.4 58.9% 39.1%)", // Teal
  "hsl(339.6 82.2% 51.6%)", // Magenta
  "hsl(197.4 71.4% 52.5%)", // Sky Blue
  "hsl(119.4 50.4% 44.9%)", // Forest Green
  "hsl(20.5 90.2% 48.2%)", // Red Orange
  "hsl(280.4 89.1% 61.2%)", // Violet
]

// =========================================================================
// SUBCOMPONENTE: QuestionChart (Gráfica individual para una pregunta)
// =========================================================================
interface QuestionChartProps {
  question: ChartQuestionData
}

function QuestionChart({ question }: QuestionChartProps) {
  const chartId = `chart-${question.id}`

  const chartData = useMemo(() => {
    if (!question.responsesSummary) return []
    return question.responsesSummary
      // CORRECCIÓN: Asegurar que count sea un número para evitar errores de ordenamiento
      .filter((item) => Number(item.count) > 0)
      .map((item, index) => ({
        option: item.option,
        count: Number(item.count), // CORRECCIÓN: Forzar conversión a número
        key: `option${index}`,
        fill: vibrantPalette[index % vibrantPalette.length],
      }))
  }, [question])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: "Respuestas",
      },
    }
    chartData.forEach((item, index) => {
      config[item.key as keyof typeof config] = {
        label: item.option,
        color: vibrantPalette[index % vibrantPalette.length],
      }
    })
    return config
  }, [chartData])

  const totalSelections = useMemo(
    // CORRECCIÓN: Cálculo seguro sumando números
    () => chartData.reduce((acc, item) => acc + item.count, 0),
    [chartData],
  )

  if (chartData.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg leading-tight">{question.title}</CardTitle>
          <CardDescription className="flex items-center gap-1 text-sm">
            Tipo:{" "}
            <Badge variant="secondary" className="px-1 py-0 text-[0.6rem]">
              {question.type.replace("_", " ")}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center p-4 text-muted-foreground text-sm">
          No hay respuestas para esta pregunta.
        </CardContent>
      </Card>
    )
  }

  const renderChart = () => {
    // CORRECCIÓN: Detectar etiquetas largas mejor
    const hasLongLabels = chartData.some((d) => d.option.length > 15)

    if (hasLongLabels || chartData.length > 5) {
      return (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          {/* CORRECCIÓN: layout="vertical" es obligatorio si X es número e Y es categoría */}
          <BarChart
            data={chartData}
            layout="vertical" 
            margin={{ left: 0, right: 20, top: 10, bottom: 10 }} // Ajusté el margen izquierdo, lo maneja el YAxis width
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" className="text-xs" hide />
            <YAxis
              type="category"
              dataKey="option"
              className="text-xs"
              width={120} // CORRECCIÓN: 50 era muy poco para "Long Labels", aumentado a 120
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {/* Radius ajustado para barras horizontales (derecha redondeada) */}
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} /> 
          </BarChart>
        </ChartContainer>
      )
    }

    if (question.type === "RATING" || question.type === "SCALE") {
      return (
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            data={chartData}
            margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="option" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(217.2 91.2% 59.8%)"
              fill="hsl(217.2 91.2% 59.8%)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )
    }

    return (
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-[200px] w-[200px]"
      >
        <PieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="option"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={2}
            stroke="hsl(var(--background))"
            activeIndex={-1}
            activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
              <g>
                <Sector
                  {...props}
                  outerRadius={outerRadius + 8}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                />
              </g>
            )}
          >
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-2xl font-bold"
                      >
                        {totalSelections.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground text-sm"
                      >
                        Total
                      </tspan>
                    </text>
                  )
                }
                return null
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    )
  }

  return (
    <Card data-chart={chartId} className="flex flex-col h-full">
      <ChartStyle id={chartId} config={chartConfig} />
      <CardHeader className="pb-2">
        <CardTitle className="text-lg leading-tight">{question.title}</CardTitle>
        <CardDescription className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="px-2 py-1 text-xs font-medium">
            {question.type.replace("_", " ")}
          </Badge>
          <span className="text-muted-foreground">
            {totalSelections} respuesta{totalSelections !== 1 ? "s" : ""}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center items-center p-4 pt-0">
        {renderChart()}
      </CardContent>
    </Card>
  )
}

// =========================================================================
// COMPONENTE PRINCIPAL: SurveyQuestionResponsesChart
// =========================================================================
export function SurveyQuestionResponsesChart({
  surveyTitle,
  questions,
  surveys,
  loading = false,
  error = null,
}: SurveyQuestionResponsesChartProps) {
  
  const mappedQuestions: ChartQuestionData[] = useMemo(
    () =>
      (surveys ?? [])
        .flatMap((survey) =>
          survey?.questions?.map((q) => {
            if (!q.type) return undefined

            return {
              id: q.id,
              title: q.title,
              type: q.type as ChartQuestionData["type"],
              order: q.order,
              ...(q.responsesSummary ? { responsesSummary: q.responsesSummary } : {}),
            }
          }) ?? []
        )
        .filter((q): q is ChartQuestionData => q !== undefined),
    [surveys],
  )

  const relevantQuestions: ChartQuestionData[] = useMemo(
    () =>
      (questions && questions.length > 0 ? questions : mappedQuestions).filter(
        (q) =>
          q.type === "MULTIPLE_CHOICE" ||
          q.type === "CHECKBOXES" ||
          q.type === "DROPDOWN" ||
          q.type === "RATING" ||
          q.type === "SCALE",
      ),
    [questions, mappedQuestions],
  )

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Cargando datos del gráfico...</CardTitle>
          <CardDescription>Procesando respuestas de la encuesta.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[300px] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <span className="text-gray-600">Cargando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Error al cargar el gráfico</CardTitle>
          <CardDescription>No se pudieron procesar los datos de las respuestas.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (relevantQuestions.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Análisis de Respuestas</CardTitle>
          <CardDescription>
            Visualización de datos de respuestas con gráficos adaptativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center p-6 text-muted-foreground">
          No hay preguntas compatibles para análisis gráfico o no hay respuestas
          disponibles.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Análisis de Respuestas {surveyTitle ? `- ${surveyTitle}` : ""}</CardTitle>
              <CardDescription>
                Visualización interactiva de datos de respuestas con gráficos
                adaptativos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {relevantQuestions.map((question, index) => (
          // CORRECCIÓN: Añadido index a la key para evitar colisiones si se cargan múltiples encuestas
          <QuestionChart key={`${question.id}-${index}`} question={question} />
        ))}
      </div>
    </div>
  )
}