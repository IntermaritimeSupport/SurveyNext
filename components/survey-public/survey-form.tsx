"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QuestionRenderer } from "./question-renderer"
import { useParams, useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProgressBar } from "./progress-bar"
import { QuestionType as PrismaQuestionType, type SurveyStatus } from "@prisma/client"
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react"
import type { QuestionOption } from "../survey-builder/survey-manager"

interface PublicSurvey {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  showProgress: boolean
  allowMultipleResponses: boolean
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
  options: QuestionOption[] | null
  validation: Record<string, any> | null
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
const DEFAULT_QUESTIONS_PER_PAGE = 10
const PAGINATION_THRESHOLD = 5

export function SurveyForm({ survey, questions: initialQuestions }: SurveyFormProps) {
  const router = useRouter()
  const paramsId = location.pathname.split("/").pop()
  console.log(paramsId)
  const [currentAnswers, setCurrentAnswers] = useState<Map<string, any>>(() => new Map())
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(() => new Map())
  const [respondentEmail, setRespondentEmail] = useState("")
  const [isCompleted, setIsCompleted] = useState(false)

  const isEmailRequired = !survey.isAnonymous
  const [isShowingEmailStep, setIsShowingEmailStep] = useState(isEmailRequired)

  // ✅ Ref al botón
  const nextButtonRef = useRef<HTMLButtonElement>(null)

  const sortedQuestions = useMemo(() => initialQuestions.sort((a, b) => a.order - b.order), [initialQuestions])

  const enablePagination = sortedQuestions.length > PAGINATION_THRESHOLD
  const questionsPerPage = enablePagination ? DEFAULT_QUESTIONS_PER_PAGE : sortedQuestions.length

  const totalQuestionPages = Math.ceil(sortedQuestions.length / questionsPerPage)
  const totalSteps = totalQuestionPages + (isEmailRequired ? 1 : 0)

  let currentStep = 0
  if (isShowingEmailStep) {
    currentStep = 1
  } else {
    currentStep = currentPageIndex + 1 + (isEmailRequired ? 1 : 0)
  }

  const startIndex = currentPageIndex * questionsPerPage
  const endIndex = Math.min(startIndex + questionsPerPage, sortedQuestions.length)
  const currentQuestionsBlock = sortedQuestions.slice(startIndex, endIndex)

  const isLastQuestionPage = currentPageIndex === totalQuestionPages - 1

  // ✅ Validaciones (idéntico a tu código original)
  const validateAnswer = (question: PublicQuestion, answerValue: any): string | null => {
    const isAnswerEmpty =
      answerValue === undefined ||
      answerValue === null ||
      (typeof answerValue === "string" && answerValue.trim() === "") ||
      (Array.isArray(answerValue) && answerValue.length === 0) ||
      (typeof answerValue === "object" &&
        answerValue !== null &&
        Object.keys(answerValue).length === 0 &&
        question.type !== PrismaQuestionType.FILE_UPLOAD)

    if (question.required && isAnswerEmpty) {
      return "Esta pregunta es obligatoria."
    }

    if (!question.required && isAnswerEmpty) {
      return null
    }

    switch (question.type) {
      case PrismaQuestionType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof answerValue === "string" && !emailRegex.test(answerValue)) {
          return "Ingresa un email válido."
        }
        break
      case PrismaQuestionType.TEXT:
      case PrismaQuestionType.TEXTAREA:
        if (typeof answerValue === "string") {
          if (question.validation?.minLength && answerValue.length < question.validation.minLength) {
            return `Mínimo ${question.validation.minLength} caracteres.`
          }
          if (question.validation?.maxLength && answerValue.length > question.validation.maxLength) {
            return `Máximo ${question.validation.maxLength} caracteres.`
          }
        }
        break
      case PrismaQuestionType.NUMBER:
        const numValue = Number(answerValue)
        if (isNaN(numValue)) {
          return "Debe ser un número válido."
        }
        if (question.validation?.min && numValue < question.validation.min) {
          return `El valor mínimo es ${question.validation.min}.`
        }
        if (question.validation?.max && numValue > question.validation.max) {
          return `El valor máximo es ${question.validation.max}.`
        }
        break
      case PrismaQuestionType.URL:
        const urlRegex =
          /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i
        if (typeof answerValue === "string" && !urlRegex.test(answerValue)) {
          return "Ingresa una URL válida."
        }
        break
      case PrismaQuestionType.PHONE:
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im
        if (typeof answerValue === "string" && !phoneRegex.test(answerValue)) {
          return "Ingresa un número de teléfono válido."
        }
        break
      case PrismaQuestionType.DATE:
        if (typeof answerValue === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(answerValue)) {
          return `Formato de fecha inválido (YYYY-MM-DD).`
        }
        if (typeof answerValue === "string" && isNaN(new Date(answerValue).getTime())) {
          return `Formato de fecha inválido.`
        }
        break
      case PrismaQuestionType.TIME:
        if (typeof answerValue === "string" && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(answerValue)) {
          return `Formato de hora inválido (HH:mm).`
        }
        break
      case PrismaQuestionType.MULTIPLE_CHOICE:
      case PrismaQuestionType.DROPDOWN:
        const dropdownOptions = (question.options as QuestionOption[] | null) || []
        if (!dropdownOptions.some((opt) => opt.value === answerValue)) {
          return "La opción seleccionada es inválida."
        }
        break
      case PrismaQuestionType.CHECKBOXES:
        const checkboxOptions = (question.options as QuestionOption[] | null) || []
        if (!Array.isArray(answerValue)) {
          return "Debe seleccionar una o más opciones."
        }
        const validCheckboxValues = checkboxOptions.map((opt) => opt.value)
        if (!answerValue.every((val: any) => validCheckboxValues.includes(val))) {
          return "Una o más opciones seleccionadas son inválidas."
        }
        break
      case PrismaQuestionType.RATING:
      case PrismaQuestionType.SCALE:
        const ratingScaleValue = Number(answerValue)
        if (isNaN(ratingScaleValue)) {
          return "Debe ser un número válido."
        }
        const minVal = question.validation?.min || 1
        const maxVal = question.validation?.max || (question.type === PrismaQuestionType.RATING ? 5 : 10)
        if (ratingScaleValue < minVal || ratingScaleValue > maxVal) {
          return `Debe estar entre ${minVal} y ${maxVal}.`
        }
        break
      case PrismaQuestionType.FILE_UPLOAD:
        if (typeof answerValue !== "object" || answerValue === null || !answerValue.fileName || !answerValue.fileUrl) {
          return "Debe adjuntar un archivo válido."
        }
        break
      case PrismaQuestionType.SIGNATURE:
        if (typeof answerValue !== "string" || answerValue.length < 10) {
          return "La firma es inválida."
        }
        break
      case PrismaQuestionType.MATRIX:
        if (
          typeof answerValue !== "object" ||
          answerValue === null ||
          Array.isArray(answerValue) ||
          Object.keys(answerValue).length === 0
        ) {
          return "Formato de respuesta de matriz inválido."
        }
        break
    }

    return null
  }

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

  const validateEmailInput = (email: string): string | null => {
    if (isEmailRequired && !email.trim()) {
      return "El email es obligatorio."
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return "Ingresa un email válido."
      }
    }
    return null
  }

  const handleNext = () => {
    setValidationErrors(new Map())
    setSubmissionError(null)

    if (isShowingEmailStep) {
      const emailError = validateEmailInput(respondentEmail)
      if (emailError) {
        setValidationErrors((prev) => new Map(prev).set("email", emailError))
        return
      }
      setIsShowingEmailStep(false)
      setCurrentPageIndex(0)
      return
    }

    let hasPageErrors = false
    const newPageErrors = new Map<string, string>()
    currentQuestionsBlock.forEach((q) => {
      const answerValue = currentAnswers.get(q.id)
      const error = validateAnswer(q, answerValue)
      if (error) {
        newPageErrors.set(q.id, error)
        hasPageErrors = true
      }
    })

    if (hasPageErrors) {
      setValidationErrors(newPageErrors)
      setSubmissionError("Por favor, corrige los errores en las preguntas obligatorias.")
      return
    }

    if (enablePagination && !isLastQuestionPage) {
      setCurrentPageIndex((prev) => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handlePrevious = () => {
    setValidationErrors(new Map())
    setSubmissionError(null)

    if (isShowingEmailStep) {
      return
    }

    if (enablePagination && currentPageIndex === 0 && isEmailRequired) {
      setIsShowingEmailStep(true)
      return
    }

    if (enablePagination && currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    const emailError = validateEmailInput(respondentEmail)
    if (emailError) {
      setValidationErrors((prev) => new Map(prev).set("email", emailError))
      setSubmissionError("Por favor, corrige los errores en la información de contacto.")
      return
    }

    let hasFinalErrors = false
    const finalErrors = new Map<string, string>()
    sortedQuestions.forEach((q) => {
      const answerValue = currentAnswers.get(q.id)
      const error = validateAnswer(q, answerValue)
      if (error) {
        finalErrors.set(q.id, error)
        hasFinalErrors = true
      }
    })

    if (hasFinalErrors) {
      setValidationErrors(finalErrors)
      setSubmissionError("Por favor, corrige los errores en las preguntas antes de enviar.")
      return
    }

    setIsLoading(true)
    setSubmissionError(null)

    const answersForApi: Answer[] = sortedQuestions.map((q) => ({
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
        throw new Error(errorData.message || "Error desconocido al enviar la encuesta.")
      }

      setIsCompleted(true)
    } catch (error: any) {
      setSubmissionError(error.message || "Error al enviar la encuesta. Inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Capturar Enter
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && event.target instanceof HTMLTextAreaElement) return
    if (event.key === "Enter" && nextButtonRef.current && !nextButtonRef.current.disabled) {
      event.preventDefault()
      nextButtonRef.current.click()
    }
  }, [])

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">¡Gracias por tu participación!</h2>
            <p className="text-slate-600 mb-6">Tu respuesta ha sido enviada exitosamente.</p>
            <Button onClick={() => (window.location.href = `/survey/${paramsId}`)} variant="outline" className="w-full bg-transparent">
              Volver al formulario
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0} // ✅ Necesario para capturar Enter
    >
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl shadow-lg mb-1">
          <div className="px-8 py-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{survey.title}</h1>
            {survey.description && (
              <p className="text-blue-100 text-sm leading-relaxed max-w-2xl mx-auto">{survey.description}</p>
            )}
          </div>
        </div>

        {survey.showProgress && (
          <div className="bg-white px-8 py-4 border-x border-slate-200">
            <ProgressBar current={currentStep} total={totalSteps} />
          </div>
        )}

        <div className="bg-white rounded-b-xl shadow-lg border border-slate-200">
          <div className="p-8">
            {/* Email step */}
            {isShowingEmailStep ? (
              <div className="space-y-6">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
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
                  placeholder="tu@email.com"
                  className={`mt-1 ${validationErrors.has("email") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                />
                {validationErrors.get("email") && (
                  <p className="text-sm text-red-600 mt-2">{validationErrors.get("email")}</p>
                )}
              </div>
            ) : currentQuestionsBlock.length > 0 ? (
              <div className="space-y-8">
                {currentQuestionsBlock.map((question, index) => (
                  <div key={question.id} className={`${index > 0 ? "pt-8 border-t border-slate-100" : ""}`}>
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
                <AlertDescription>No se pudieron cargar las preguntas de la encuesta.</AlertDescription>
              </Alert>
            )}

            {submissionError && (
              <Alert variant="destructive" className="mt-6">
                <AlertDescription>{submissionError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center mt-10">
              <Button onClick={handlePrevious} variant="outline" className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                ref={nextButtonRef}
                onClick={handleNext}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : enablePagination && !isLastQuestionPage ? (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Enviar
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
