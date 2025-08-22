"use client"

import type { QuestionAnalytics } from "@/lib/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface QuestionAnalyticsProps {
  analytics: QuestionAnalytics
}

export function QuestionAnalyticsComponent({ analytics }: QuestionAnalyticsProps) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: "bg-blue-100 text-blue-800",
      textarea: "bg-blue-100 text-blue-800",
      select: "bg-green-100 text-green-800",
      multiselect: "bg-green-100 text-green-800",
      radio: "bg-purple-100 text-purple-800",
      checkbox: "bg-purple-100 text-purple-800",
      rating: "bg-yellow-100 text-yellow-800",
      scale: "bg-yellow-100 text-yellow-800",
      date: "bg-gray-100 text-gray-800",
      email: "bg-red-100 text-red-800",
      number: "bg-orange-100 text-orange-800",
    }
    return colors[type] || "bg-slate-100 text-slate-800"
  }

  return (
    <Card className="survey-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{analytics.questionTitle}</CardTitle>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getTypeColor(analytics.questionType)}>{analytics.questionType}</Badge>
              <span className="text-sm text-slate-500">
                {analytics.totalResponses} respuesta{analytics.totalResponses !== 1 ? "s" : ""} (
                {Math.round(analytics.responseRate)}%)
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics for numeric questions */}
          {analytics.statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
              {analytics.statistics.average !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{analytics.statistics.average.toFixed(1)}</div>
                  <div className="text-xs text-slate-500">Promedio</div>
                </div>
              )}
              {analytics.statistics.median !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{analytics.statistics.median}</div>
                  <div className="text-xs text-slate-500">Mediana</div>
                </div>
              )}
              {analytics.statistics.min !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{analytics.statistics.min}</div>
                  <div className="text-xs text-slate-500">Mínimo</div>
                </div>
              )}
              {analytics.statistics.max !== undefined && (
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-900">{analytics.statistics.max}</div>
                  <div className="text-xs text-slate-500">Máximo</div>
                </div>
              )}
            </div>
          )}

          {/* Answer distribution */}
          {analytics.answers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">Distribución de Respuestas</h4>
              <div className="space-y-2">
                {analytics.answers.slice(0, 10).map((answer, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 truncate max-w-xs" title={answer.value}>
                        {answer.value || "(Vacío)"}
                      </span>
                      <span className="text-slate-500 ml-2">
                        {answer.count} ({Math.round(answer.percentage)}%)
                      </span>
                    </div>
                    <Progress value={answer.percentage} className="h-2" />
                  </div>
                ))}
                {analytics.answers.length > 10 && (
                  <p className="text-xs text-slate-500 text-center">
                    ... y {analytics.answers.length - 10} respuestas más
                  </p>
                )}
              </div>
            </div>
          )}

          {analytics.totalResponses === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No hay respuestas para esta pregunta</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
