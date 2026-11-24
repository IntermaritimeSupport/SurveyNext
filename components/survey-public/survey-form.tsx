"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuestionRenderer } from "./question-renderer"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProgressBar } from "./progress-bar"

import { QuestionType as PrismaQuestionType, type SurveyStatus } from "@prisma/client"
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react"
import type { FormTheme } from "@/lib/forms/theme"
import { validateAnswer as validateSharedAnswer } from "@/lib/forms/validate"
import { isAnswerable } from "@/lib/forms/question-types"
import { paginate, visibleQuestionIds } from "@/lib/forms/logic"

interface PublicSurvey {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  showProgress: boolean
  allowMultipleResponses: boolean
  collectEmail?: boolean
  theme?: FormTheme
  status?: SurveyStatus
  startDate?: string
  endDate?: string
}

interface PublicQuestion {
  id: string
  title: string
  description: string | null
  type: PrismaQuestionType
  required: boolean
  order: number
  options: any
  validation: Record<string, any> | null
  logic?: unknown
}

interface Answer {
  questionId: string
  value: any
}

interface SurveyFormProps {
  survey: PublicSurvey
  questions: PublicQuestion[]
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""
const DEFAULT_QUESTIONS_PER_PAGE = 10 // ✅ Nuevo valor: paginación por defecto si hay muchas preguntas
const PAGINATION_THRESHOLD = 5 // ✅ Si hay más de X preguntas, activamos la paginación

export function SurveyForm({ survey, questions: initialQuestions }: SurveyFormProps) {
  const router = useRouter()
  const [currentAnswers, setCurrentAnswers] = useState<Map<string, any>>(() => new Map())
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(() => new Map())
  const [respondentEmail, setRespondentEmail] = useState("")

  const [isCompleted, setIsCompleted] = useState(false)
  // Marca del formulario (logo, color, mensaje final) ya combinada con los valores por defecto
  const theme: FormTheme = survey.theme ?? {}

  // Solo se pide el email si el formulario lo recoge (por defecto, los no anónimos)
  const isEmailRequired = survey.collectEmail ?? !survey.isAnonymous
  const [isShowingEmailStep, setIsShowingEmailStep] = useState(isEmailRequired)

  const sortedQuestions = useMemo(() => initialQuestions.sort((a, b) => a.order - b.order), [initialQuestions])

  // Páginas: cada SECTION empieza una página (sin secciones: hasta 5 en una, si no de 10 en 10).
  // La lógica condicional decide qué preguntas se ven; las páginas sin preguntas visibles se saltan.
  const pages = useMemo(() => paginate(sortedQuestions, DEFAULT_QUESTIONS_PER_PAGE, PAGINATION_THRESHOLD), [sortedQuestions])
  const visibleIds = useMemo(() => visibleQuestionIds(sortedQuestions, currentAnswers), [sortedQuestions, currentAnswers])
  const activePages = useMemo(
    () => pages.map((p) => p.filter((q) => visibleIds.has(q.id))).filter((p) => p.some((q) => isAnswerable(q.type))),
    [pages, visibleIds],
  )

  const totalQuestionPages = Math.max(activePages.length, 1)
  const enablePagination = totalQuestionPages > 1
  const totalSteps = totalQuestionPages + (isEmailRequired ? 1 : 0)
  const safePageIndex = Math.min(currentPageIndex, totalQuestionPages - 1)

  let currentStep = 0
  if (isShowingEmailStep) {
    currentStep = 1
  } else {
    currentStep = safePageIndex + 1 + (isEmailRequired ? 1 : 0)
  }

  const currentQuestionsBlock = activePages[safePageIndex] ?? []
  const isLastQuestionPage = safePageIndex >= totalQuestionPages - 1

  // Same rules the server applies (lib/forms/validate.ts)
  const validateAnswer = (question: PublicQuestion, answerValue: any): string | null => {
    const result = validateSharedAnswer(question, answerValue)
    return result.ok ? null : result.error
  }

  const answersForCount = sortedQuestions.filter(
    (q) => isAnswerable(q.type) && visibleIds.has(q.id) && currentAnswers.has(q.id),
  ).length

  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    setCurrentAnswers((prev) => {
      const newMap = new Map(prev)
      newMap.set(questionId, value)
      return newMap
    })
    setValidationErrors((prev) => {
      const newMap = new Map(prev)
      newMap.delete(questionId)
      return newMap
    })
  }, [])

  const validateContactInfo = (): boolean => {
    let hasErrors = false
    const newErrors = new Map<string, string>()

    // Email validation
    if (isEmailRequired && !respondentEmail.trim()) {
      newErrors.set("email", "Email is required.")
      hasErrors = true
    } else if (respondentEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(respondentEmail)) {
        newErrors.set("email", "Please enter a valid email.")
        hasErrors = true
      }
    }

    setValidationErrors(newErrors)
    return !hasErrors
  }


  const handleNext = () => {
    setValidationErrors(new Map())
    setSubmissionError(null)

    if (isShowingEmailStep) {
      if (!validateContactInfo()) {
        setSubmissionError("Please correct the errors in the contact information.")
        return
      }
      setIsShowingEmailStep(false)
      setCurrentPageIndex(0) // Reset to first question page after email
      return
    }

    let hasPageErrors = false
    const newPageErrors = new Map<string, string>()
    currentQuestionsBlock.filter((q) => isAnswerable(q.type)).forEach((q) => {
      const answerValue = currentAnswers.get(q.id)
      const error = validateAnswer(q, answerValue)
      if (error) {
        newPageErrors.set(q.id, error)
        hasPageErrors = true
      }
    })

    if (hasPageErrors) {
      setValidationErrors(newPageErrors)
      setSubmissionError("Please correct the errors in the questions.")
      return
    }

    // ✅ Lógica de paginación condicional
    if (!isLastQuestionPage) {
      setCurrentPageIndex(safePageIndex + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    setValidationErrors(new Map())
    setSubmissionError(null)

    if (isShowingEmailStep) {
      return // No hay paso anterior al email si es el primer paso
    }

    // Si estamos en la primera página de preguntas y el email es requerido, volvemos al paso del email
    if (safePageIndex === 0 && isEmailRequired) {
      setIsShowingEmailStep(true)
      return
    }

    // Solo retrocede si hay páginas anteriores
    if (safePageIndex > 0) {
      setCurrentPageIndex(safePageIndex - 1)
    }
  }

  const handleSubmit = async () => {
    // Revalidar información de contacto antes del envío final, por si el usuario editó y volvió
    if (!validateContactInfo()) {
      setSubmissionError("Please correct the errors in the contact information before submitting.")
      return
    }

    let hasFinalErrors = false
    const finalErrors = new Map<string, string>()
    sortedQuestions.filter((q) => visibleIds.has(q.id) && isAnswerable(q.type)).forEach((q) => {
      const answerValue = currentAnswers.get(q.id)
      const error = validateAnswer(q, answerValue)
      if (error) {
        finalErrors.set(q.id, error)
        hasFinalErrors = true
      }
    })

    if (hasFinalErrors) {
      setValidationErrors(finalErrors)
      setSubmissionError("Please correct the errors in the questions before submitting.")
      return
    }

    setIsLoading(true)
    setSubmissionError(null)

    // Solo se envían las preguntas visibles (las ocultas por lógica no se guardan)
    const answersForApi: Answer[] = sortedQuestions.filter((q) => isAnswerable(q.type) && visibleIds.has(q.id)).map((q) => ({
      questionId: q.id,
      value: currentAnswers.has(q.id) ? (currentAnswers.get(q.id) ?? null) : null,
    }))

    try {
      const responseData = {
        surveyId: survey.id,
        email: isEmailRequired ? respondentEmail : null,
        answers: answersForApi,
        isComplete: true,
      }

      const apiResponse = await fetch(`${API_BASE_URL}/api/surveys/${survey.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseData),
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.message || "Unknown error while submitting the form.")
      }

      setIsCompleted(true)
    } catch (error: any) {
      console.error("SurveyForm: Error submitting survey:", error)
      setSubmissionError(error.message || "Error submitting the form. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-3 sm:p-4">
        <Card className="w-full max-w-sm sm:max-w-md">
          <CardContent className="text-center py-8 sm:py-12 px-4 sm:px-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">
              Thank you for your participation!
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 whitespace-pre-line">
              {theme.thankYouMessage || "Your response has been submitted successfully."}
            </p>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-slate-600">
                <strong>Form:</strong> {survey.title}
                <br />
                <strong>Completed:</strong> {new Date().toLocaleString()}
                <br />
                <strong>Questions answered:</strong> {answersForCount}
              </p>
            </div>
            <Button onClick={() => (window.location.href = "/")} variant="outline" className="w-full bg-transparent">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-full sm:max-w-2xl lg:max-w-3xl mx-auto">
        <div
          className={`rounded-t-xl shadow-lg flex items-center justify-start border-slate-200 px-4 ${theme.primaryColor ? "" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
          style={theme.primaryColor ? { backgroundColor: theme.primaryColor } : undefined}
        >
          {theme.logoUrl && (
            <img src={theme.logoUrl} height={75} width={75} alt="" className="rounded-md object-contain bg-white/90 max-h-[75px]" />
          )}
          <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 text-start">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2">{survey.title}</h1>
            {survey.description && (
              <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-full sm:max-w-xl lg:max-w-2xl mx-auto">
                {survey.description}
              </p>
            )}
          </div>
        </div>
        {survey.showProgress && (
          <ProgressBar current={currentStep} total={totalSteps} />
        )}

        <div className="bg-white rounded-b-xl shadow-lg  border-slate-200">
          <div className="p-4 sm:p-6 lg:p-8">
            {isShowingEmailStep ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center pb-4 sm:pb-6 border-b border-slate-100">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
                    Contact Information
                    {isEmailRequired && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600">
                    Please provide your email to complete the survey.
                  </p>
                </div>

                <div className="max-w-full sm:max-w-md mx-auto space-y-4">
                  {/* Email Input */}
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                      Email
                      {isEmailRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={respondentEmail}
                      onChange={(e) => {
                        setRespondentEmail(e.target.value)
                        setValidationErrors((prev) => {
                          const newErrors = new Map(prev)
                          newErrors.delete("email")
                          return newErrors
                        })
                      }}
                      placeholder="your@email.com"
                      className={`mt-1 ${validationErrors.has("email") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                    />
                    {validationErrors.get("email") && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validationErrors.get("email")}
                      </p>
                    )}
                  </div>

                </div>
              </div>
            ) : currentQuestionsBlock.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                {currentQuestionsBlock.map((question, index) => (
                  <div key={question.id} className={`${index > 0 ? "pt-6 sm:pt-8 border-t border-slate-100" : ""}`}>
                    <QuestionRenderer
                      question={question}
                      answer={{ questionId: question.id, value: currentAnswers.get(question.id) }}
                      onAnswerChange={(value) => handleAnswerChange(question.id, value)}
                      error={validationErrors.get(question.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>Could not load the form questions.</AlertDescription>
              </Alert>
            )}

            {submissionError && (
              <Alert variant="destructive" className="mt-4 sm:mt-6">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <AlertDescription className="ml-2">{submissionError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 bg-slate-50 rounded-b-xl border-t border-slate-100">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isShowingEmailStep || (safePageIndex === 0 && !isEmailRequired)}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border-slate-300 order-2 sm:order-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-xs sm:text-sm text-slate-500 bg-white px-2 sm:px-3 py-1 rounded-full border border-slate-200 order-1 sm:order-2 text-center">
              {isShowingEmailStep
                ? `Step ${currentStep} of ${totalSteps}: Contact Information`
                : `Step ${currentStep} of ${totalSteps}`}
            </div>

            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm order-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : isLastQuestionPage && !isShowingEmailStep ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}