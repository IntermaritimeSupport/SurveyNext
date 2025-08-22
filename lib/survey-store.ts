import type { Survey, SurveyResponse, SurveyStats } from "@/types/survey"

class SurveyStore {
  private surveys: Survey[] = []
  private responses: SurveyResponse[] = []

  // Surveys
  getSurveys(): Survey[] {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("surveys")
      if (stored) {
        this.surveys = JSON.parse(stored)
      }
    }
    return this.surveys
  }

  getSurvey(id: string): Survey | undefined {
    return this.getSurveys().find((s) => s.id === id)
  }

  getSurveyByLink(customLink: string): Survey | undefined {
    return this.getSurveys().find((s) => s.customLink === customLink)
  }

  saveSurvey(survey: Survey): void {
    const surveys = this.getSurveys()
    const index = surveys.findIndex((s) => s.id === survey.id)

    if (index >= 0) {
      surveys[index] = survey
    } else {
      surveys.push(survey)
    }

    this.surveys = surveys
    if (typeof window !== "undefined") {
      localStorage.setItem("surveys", JSON.stringify(surveys))
    }
  }

  deleteSurvey(id: string): void {
    this.surveys = this.getSurveys().filter((s) => s.id !== id)
    if (typeof window !== "undefined") {
      localStorage.setItem("surveys", JSON.stringify(this.surveys))
    }
  }

  // Responses
  getResponses(surveyId?: string): SurveyResponse[] {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("responses")
      if (stored) {
        this.responses = JSON.parse(stored)
      }
    }

    if (surveyId) {
      return this.responses.filter((r) => r.surveyId === surveyId)
    }

    return this.responses
  }

  saveResponse(response: SurveyResponse): void {
    const responses = this.getResponses()
    responses.push(response)

    this.responses = responses
    if (typeof window !== "undefined") {
      localStorage.setItem("responses", JSON.stringify(responses))
    }
  }

  // Stats
  getSurveyStats(surveyId: string): SurveyStats {
    const responses = this.getResponses(surveyId)
    const survey = this.getSurvey(surveyId)

    if (!survey) {
      return {
        totalResponses: 0,
        completionRate: 0,
        averageTime: 0,
      }
    }

    const totalResponses = responses.length
    const completionRate = totalResponses > 0 ? 100 : 0
    const lastResponse =
      responses.length > 0 ? new Date(Math.max(...responses.map((r) => new Date(r.submittedAt).getTime()))) : undefined

    return {
      totalResponses,
      completionRate,
      averageTime: 0, // TODO: Calculate based on actual time tracking
      lastResponse,
    }
  }
}

export const surveyStore = new SurveyStore()
