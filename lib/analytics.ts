import type { SurveyResponse, Question, Answer } from "@/types/survey"
import { surveyStore } from "./survey-store"

export interface QuestionAnalytics {
  questionId: string
  questionTitle: string
  questionType: string
  totalResponses: number
  responseRate: number
  answers: AnswerAnalytics[]
  statistics?: {
    average?: number
    median?: number
    mode?: string
    min?: number
    max?: number
  }
}

export interface AnswerAnalytics {
  value: string
  count: number
  percentage: number
}

export interface SurveyAnalytics {
  surveyId: string
  surveyTitle: string
  totalResponses: number
  completionRate: number
  averageCompletionTime: number
  responsesByDate: { date: string; count: number }[]
  questionAnalytics: QuestionAnalytics[]
  topAnswers: { question: string; answer: string; count: number }[]
}

export class AnalyticsService {
  static getSurveyAnalytics(surveyId: string): SurveyAnalytics | null {
    const survey = surveyStore.getSurvey(surveyId)
    if (!survey) return null

    const responses = surveyStore.getResponses(surveyId)
    const totalResponses = responses.length

    return {
      surveyId,
      surveyTitle: survey.title,
      totalResponses,
      completionRate: totalResponses > 0 ? 100 : 0, // Simplificado para demo
      averageCompletionTime: 0, // TODO: Implementar tracking de tiempo
      responsesByDate: this.getResponsesByDate(responses),
      questionAnalytics: this.getQuestionAnalytics(survey.questions, responses),
      topAnswers: this.getTopAnswers(survey.questions, responses),
    }
  }

  static getAllSurveysAnalytics(): SurveyAnalytics[] {
    const surveys = surveyStore.getSurveys()
    return surveys.map((survey) => this.getSurveyAnalytics(survey.id)).filter(Boolean) as SurveyAnalytics[]
  }

  private static getResponsesByDate(responses: SurveyResponse[]): { date: string; count: number }[] {
    const dateMap = new Map<string, number>()

    responses.forEach((response) => {
      const date = new Date(response.submittedAt).toISOString().split("T")[0]
      dateMap.set(date, (dateMap.get(date) || 0) + 1)
    })

    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private static getQuestionAnalytics(questions: Question[], responses: SurveyResponse[]): QuestionAnalytics[] {
    return questions.map((question) => {
      const questionResponses = responses
        .map((r) => r.answers.find((a) => a.questionId === question.id))
        .filter(Boolean) as Answer[]

      const totalResponses = questionResponses.length
      const responseRate = responses.length > 0 ? (totalResponses / responses.length) * 100 : 0

      const answerAnalytics = this.getAnswerAnalytics(question, questionResponses)
      const statistics = this.getQuestionStatistics(question, questionResponses)

      return {
        questionId: question.id,
        questionTitle: question.title,
        questionType: question.type,
        totalResponses,
        responseRate,
        answers: answerAnalytics,
        statistics,
      }
    })
  }

  private static getAnswerAnalytics(question: Question, answers: Answer[]): AnswerAnalytics[] {
    const answerMap = new Map<string, number>()

    answers.forEach((answer) => {
      if (Array.isArray(answer.value)) {
        // Para preguntas de selección múltiple
        answer.value.forEach((val) => {
          answerMap.set(val, (answerMap.get(val) || 0) + 1)
        })
      } else {
        const value = answer.value.toString()
        answerMap.set(value, (answerMap.get(value) || 0) + 1)
      }
    })

    const totalAnswers = answers.length
    return Array.from(answerMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }

  private static getQuestionStatistics(
    question: Question,
    answers: Answer[],
  ): { average?: number; median?: number; mode?: string; min?: number; max?: number } | undefined {
    if (question.type === "number" || question.type === "rating" || question.type === "scale") {
      const numericValues = answers
        .map((a) => Number(a.value))
        .filter((val) => !Number.isNaN(val))
        .sort((a, b) => a - b)

      if (numericValues.length === 0) return undefined

      const average = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
      const median = numericValues[Math.floor(numericValues.length / 2)]
      const min = numericValues[0]
      const max = numericValues[numericValues.length - 1]

      // Calcular moda
      const valueCount = new Map<number, number>()
      numericValues.forEach((val) => {
        valueCount.set(val, (valueCount.get(val) || 0) + 1)
      })
      const mode = Array.from(valueCount.entries())
        .reduce((a, b) => (a[1] > b[1] ? a : b))[0]
        .toString()

      return { average, median, mode, min, max }
    }

    return undefined
  }

  private static getTopAnswers(
    questions: Question[],
    responses: SurveyResponse[],
  ): { question: string; answer: string; count: number }[] {
    const topAnswers: { question: string; answer: string; count: number }[] = []

    questions.forEach((question) => {
      const questionResponses = responses
        .map((r) => r.answers.find((a) => a.questionId === question.id))
        .filter(Boolean) as Answer[]

      const answerAnalytics = this.getAnswerAnalytics(question, questionResponses)
      if (answerAnalytics.length > 0) {
        topAnswers.push({
          question: question.title,
          answer: answerAnalytics[0].value,
          count: answerAnalytics[0].count,
        })
      }
    })

    return topAnswers.sort((a, b) => b.count - a.count).slice(0, 10)
  }

  static exportSurveyData(surveyId: string, format: "csv" | "json" = "csv"): string {
    const survey = surveyStore.getSurvey(surveyId)
    const responses = surveyStore.getResponses(surveyId)

    if (!survey) return ""

    if (format === "json") {
      return JSON.stringify(
        {
          survey: {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            questions: survey.questions,
          },
          responses,
          analytics: this.getSurveyAnalytics(surveyId),
        },
        null,
        2,
      )
    }

    // CSV format
    const headers = ["Fecha de Respuesta", "Email del Participante"]
    survey.questions.forEach((q) => {
      headers.push(q.title)
    })

    const rows = [headers.join(",")]

    responses.forEach((response) => {
      const row = [new Date(response.submittedAt).toLocaleString(), response.respondentId || "Anónimo"]

      survey.questions.forEach((question) => {
        const answer = response.answers.find((a) => a.questionId === question.id)
        const value = answer ? (Array.isArray(answer.value) ? answer.value.join("; ") : answer.value) : ""
        row.push(`"${value}"`)
      })

      rows.push(row.join(","))
    })

    return rows.join("\n")
  }
}
