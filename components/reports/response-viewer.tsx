"use client"

import type { SurveyResponse, Survey } from "@/types/survey"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, User, Calendar, Globe } from "lucide-react"
import { useState } from "react"

interface ResponseViewerProps {
  survey: Survey
  responses: SurveyResponse[]
}

export function ResponseViewer({ survey, responses }: ResponseViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (responses.length === 0) {
    return (
      <Card className="survey-card">
        <CardContent className="text-center py-12">
          <p className="text-slate-500">No hay respuestas para mostrar</p>
        </CardContent>
      </Card>
    )
  }

  const currentResponse = responses[currentIndex]
  const sortedQuestions = survey.questions.sort((a, b) => a.order - b.order)

  return (
    <Card className="survey-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Respuestas Individuales</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-600">
              {currentIndex + 1} de {responses.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.min(responses.length - 1, currentIndex + 1))}
              disabled={currentIndex === responses.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Response Metadata */}
          <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">{currentResponse.respondentId || "Anónimo"}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">{new Date(currentResponse.submittedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">{currentResponse.ipAddress || "IP no disponible"}</span>
            </div>
          </div>

          {/* Questions and Answers */}
          <div className="space-y-4">
            {sortedQuestions.map((question) => {
              const answer = currentResponse.answers.find((a) => a.questionId === question.id)
              return (
                <div key={question.id} className="border-l-4 border-blue-200 pl-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-900">{question.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {question.type}
                    </Badge>
                  </div>
                  {question.description && <p className="text-sm text-slate-500 mb-2">{question.description}</p>}
                  <div className="bg-white border border-slate-200 rounded-lg p-3">
                    {answer ? (
                      <div>
                        {Array.isArray(answer.value) ? (
                          <ul className="list-disc list-inside space-y-1">
                            {answer.value.map((val, idx) => (
                              <li key={idx} className="text-slate-700">
                                {val}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-700">{answer.value.toString()}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">Sin respuesta</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
