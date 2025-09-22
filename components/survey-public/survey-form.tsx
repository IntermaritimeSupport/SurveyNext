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
import type { QuestionOption } from "../survey-builder/survey-manager"
import Imagenes from "@/lib/images"

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
  // ✅ Nuevos estados para los campos adicionales
  const [respondentCompany, setRespondentCompany] = useState("")
  const [respondentFullName, setRespondentFullName] = useState("")
  const [respondentPosition, setRespondentPosition] = useState("")
  const [respondentShips, setRespondentShips] = useState<string>("") // Lo manejamos como string para el input

  const [isCompleted, setIsCompleted] = useState(false)

  const isEmailRequired = !survey.isAnonymous
  const [isShowingEmailStep, setIsShowingEmailStep] = useState(isEmailRequired)

  const sortedQuestions = useMemo(() => initialQuestions.sort((a, b) => a.order - b.order), [initialQuestions])

  // ✅ Lógica de paginación condicional
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

  const validateAnswer = (question: PublicQuestion, answerValue: any): string | null => {
    // Determine if the answer is effectively empty for validation purposes
    const isAnswerEmpty =
      answerValue === undefined ||
      answerValue === null ||
      (typeof answerValue === "string" && answerValue.trim() === "") ||
      (Array.isArray(answerValue) && answerValue.length === 0) ||
      (typeof answerValue === "object" && answerValue !== null && Object.keys(answerValue).length === 0 && question.type !== PrismaQuestionType.FILE_UPLOAD);
      // For FILE_UPLOAD, an empty object could still be valid if it means "no file uploaded yet"
      // but if the question is required, the `fileInfo` object must exist and contain at least fileName/fileUrl

    if (question.required && isAnswerEmpty) {
      return "This question is required."
    }

    // If not required and empty, it's valid.
    if (!question.required && isAnswerEmpty) {
      return null
    }

    // Now, apply specific validations only if an answer is provided (or if required and not empty)
    switch (question.type) {
      case PrismaQuestionType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof answerValue === "string" && !emailRegex.test(answerValue)) {
          return "Please enter a valid email."
        }
        break

      case PrismaQuestionType.TEXT:
      case PrismaQuestionType.TEXTAREA:
        if (typeof answerValue === "string") {
          if (question.validation?.minLength && answerValue.length < question.validation.minLength) {
            return `Minimum ${question.validation.minLength} characters.`
          }
          if (question.validation?.maxLength && answerValue.length > question.validation.maxLength) {
            return `Maximum ${question.validation.maxLength} characters.`
          }
        }
        break

      case PrismaQuestionType.NUMBER:
        const numValue = Number(answerValue)
        if (isNaN(numValue)) { // Handles null, undefined, non-numeric strings
          return "Must be a valid number."
        }
        const minNum = question.validation?.min ?? -Infinity;
        const maxNum = question.validation?.max ?? Infinity;
        if (numValue < minNum) {
          return `Minimum value is ${minNum}.`
        }
        if (numValue > maxNum) {
          return `Maximum value is ${maxNum}.`
        }
        break

      case PrismaQuestionType.URL:
        // A more robust URL regex or URL constructor check
        try {
          if (typeof answerValue === "string" && answerValue.trim() !== "") {
            new URL(answerValue)
          }
        } catch (e) {
          return "Please enter a valid URL."
        }
        break

      case PrismaQuestionType.PHONE:
        // Simple phone regex, consider using a library for international numbers if needed
        const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im
        if (typeof answerValue === "string" && !phoneRegex.test(answerValue)) {
          return "Please enter a valid phone number."
        }
        break

      case PrismaQuestionType.DATE:
        if (typeof answerValue === "string") {
          // Basic YYYY-MM-DD format check
          if (!/^\d{4}-\d{2}-\d{2}$/.test(answerValue)) {
            return `Invalid date format (YYYY-MM-DD).`
          }
          const dateValue = new Date(answerValue)
          if (isNaN(dateValue.getTime())) { // Check for valid date parse
            return `Invalid date.`
          }
          const minDate = question.validation?.minDate ? new Date(question.validation.minDate) : null;
          const maxDate = question.validation?.maxDate ? new Date(question.validation.maxDate) : null;

          if (minDate && dateValue < minDate) {
              return `Date cannot be before ${question?.validation?.minDate}.`;
          }
          if (maxDate && dateValue > maxDate) {
              return `Date cannot be after ${question?.validation?.maxDate}.`;
          }
        }
        break

      case PrismaQuestionType.TIME:
        if (typeof answerValue === "string") {
          // Basic HH:mm format check
          if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(answerValue)) {
            return `Invalid time format (HH:mm).`
          }
          // Additional minTime/maxTime validation could be added if needed
          const minTime = question.validation?.minTime; // e.g., "08:00"
          const maxTime = question.validation?.maxTime; // e.g., "17:00"

          if (minTime && answerValue < minTime) {
            return `Time cannot be before ${minTime}.`;
          }
          if (maxTime && answerValue > maxTime) {
            return `Time cannot be after ${maxTime}.`;
          }
        }
        break

      case PrismaQuestionType.MULTIPLE_CHOICE:
      case PrismaQuestionType.DROPDOWN:
        const dropdownOptions = (question.options as QuestionOption[] | null) || []
        // Ensure the selected value is one of the valid options
        if (!dropdownOptions.some((opt) => opt.value === answerValue)) {
          return "The selected option is invalid."
        }
        break

      case PrismaQuestionType.CHECKBOXES:
        const checkboxOptions = (question.options as QuestionOption[] | null) || []
        if (!Array.isArray(answerValue)) {
          return "Must select one or more options."
        }
        const validCheckboxValues = checkboxOptions.map((opt) => opt.value)
        if (!answerValue.every((val: any) => validCheckboxValues.includes(val))) {
          return "One or more selected options are invalid."
        }
        // You could also add a minSelections / maxSelections validation here
        if (question.validation?.minSelections && answerValue.length < question.validation.minSelections) {
          return `Please select at least ${question.validation.minSelections} options.`;
        }
        if (question.validation?.maxSelections && answerValue.length > question.validation.maxSelections) {
          return `Please select at most ${question.validation.maxSelections} options.`;
        }
        break

      case PrismaQuestionType.RATING:
        const ratingValue = Number(answerValue)
        if (isNaN(ratingValue)) { // Handles null, undefined, non-numeric strings
          return "Must be a valid number."
        }
        const minRatingVal = question.validation?.min ?? 1
        const maxRatingVal = question.validation?.max ?? 5
        if (ratingValue < minRatingVal || ratingValue > maxRatingVal) {
          return `Must be between ${minRatingVal} and ${maxRatingVal}.`
        }
        break

      case PrismaQuestionType.SCALE: // ✅ CORREGIDO: Usando variables locales correctas (minScaleVal, maxScaleVal)
        const scaleValue = Number(answerValue)
        if (isNaN(scaleValue)) { // Handles null, undefined, non-numeric strings
          return "Must be a valid number."
        }
        const minScaleVal = question.validation?.min ?? 1
        const maxScaleVal = question.validation?.max ?? 10
        if (scaleValue < minScaleVal || scaleValue > maxScaleVal) {
          return `Must be between ${minScaleVal} and ${maxScaleVal}.`
        }
        break

      case PrismaQuestionType.FILE_UPLOAD:
        if (typeof answerValue !== "object" || answerValue === null || !answerValue.fileName || !answerValue.fileUrl) {
          return "Must attach a valid file."
        }
        // Additional file validations (size, type)
        const maxFileSize = question.validation?.maxSize; // in bytes
        const allowedTypes = question.validation?.allowedTypes as string[]; // array of mime types
        if (maxFileSize && answerValue.fileSize && answerValue.fileSize > maxFileSize) {
          return `File size exceeds the maximum of ${maxFileSize / (1024 * 1024)}MB.`;
        }
        if (allowedTypes && answerValue.fileType && !allowedTypes.includes(answerValue.fileType)) {
          return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}.`;
        }
        break

      case PrismaQuestionType.SIGNATURE:
        if (typeof answerValue !== "string" || answerValue.length < 10) { // Assuming a base64 string or similar
          return "The signature is invalid or too short."
        }
        break

      case PrismaQuestionType.MATRIX:
        // Matrix validation can be complex and depends on its structure
        if (
          typeof answerValue !== "object" ||
          answerValue === null ||
          Array.isArray(answerValue) || // Assuming it's an object mapping row to column values
          Object.keys(answerValue).length === 0
        ) {
          return "Invalid matrix response format."
        }
        // Further validation would depend on specific matrix design (e.g., all rows answered)
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

    // Ships validation (if provided, must be a number)
    if (respondentShips.trim() && isNaN(Number(respondentShips))) {
      newErrors.set("ships", "Ships must be a valid number.")
      hasErrors = true
    }

    // Other fields (`company`, `fullName`, `position`) are optional strings for now,
    // so no specific validation beyond trimming is needed unless you add custom validation rules.
    // E.g., if `company` was required:
    // if (isCompanyRequired && !respondentCompany.trim()) {
    //   newErrors.set("company", "Company name is required.");
    //   hasErrors = true;
    // }

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
      setSubmissionError("Please correct the errors in the questions.")
      return
    }

    // ✅ Lógica de paginación condicional
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
      return // No hay paso anterior al email si es el primer paso
    }

    // Si estamos en la primera página de preguntas y el email es requerido, volvemos al paso del email
    if (currentPageIndex === 0 && isEmailRequired) {
      setIsShowingEmailStep(true)
      return
    }

    // Solo retrocede si hay páginas anteriores
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1)
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
      setSubmissionError("Please correct the errors in the questions before submitting.")
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
        company: respondentCompany || null, // ✅ Añadido
        fullName: respondentFullName || null, // ✅ Añadido
        position: respondentPosition || null, // ✅ Añadido
        ships: respondentShips ? Number(respondentShips) : null, // ✅ Añadido (convertir a número)
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
        throw new Error(errorData.message || "Unknown error while submitting the survey.")
      }

      setIsCompleted(true)
    } catch (error: any) {
      console.error("SurveyForm: Error submitting survey:", error)
      setSubmissionError(error.message || "Error submitting the survey. Please try again.")
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
            <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
              Your response has been submitted successfully.
            </p>
            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
              <p className="text-xs sm:text-sm text-slate-600">
                <strong>Survey:</strong> {survey.title}
                <br />
                <strong>Completed:</strong> {new Date().toLocaleString()}
                <br />
                <strong>Questions answered:</strong> {currentAnswers.size}
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl shadow-lg mb-1 flex items-center justify-start border border-slate-200 px-4">
          <img src={Imagenes?.icsLogo || ""} height={75} width={75} alt="ics.logo" className="rounded-md object-center"/>
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
          <div className="bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8 border-x border-slate-200">
            <ProgressBar current={currentStep} total={totalSteps} />
          </div>
        )}

        <div className="bg-white rounded-b-xl shadow-lg border border-slate-200">
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
                    Please provide your contact details to complete the survey.
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
                      disabled={survey.isAnonymous} // Disable if survey is anonymous
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

                  {/* Full Name Input */}
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={respondentFullName}
                      onChange={(e) => {
                        setRespondentFullName(e.target.value)
                        setValidationErrors((prev) => {
                          const newErrors = new Map(prev)
                          newErrors.delete("fullName")
                          return newErrors
                        })
                      }}
                      placeholder="John Doe"
                      className={`mt-1 ${validationErrors.has("fullName") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                      disabled={survey.isAnonymous} // Disable if survey is anonymous
                    />
                    {validationErrors.get("fullName") && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validationErrors.get("fullName")}
                      </p>
                    )}
                  </div>

                  {/* Company Input */}
                  <div>
                    <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                      Company
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      value={respondentCompany}
                      onChange={(e) => {
                        setRespondentCompany(e.target.value)
                        setValidationErrors((prev) => {
                          const newErrors = new Map(prev)
                          newErrors.delete("company")
                          return newErrors
                        })
                      }}
                      placeholder="Acme Corp"
                      className={`mt-1 ${validationErrors.has("company") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                      disabled={survey.isAnonymous}
                    />
                    {validationErrors.get("company") && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validationErrors.get("company")}
                      </p>
                    )}
                  </div>

                  {/* Position Input */}
                  <div>
                    <Label htmlFor="position" className="text-sm font-medium text-slate-700">
                      Position
                    </Label>
                    <Input
                      id="position"
                      type="text"
                      value={respondentPosition}
                      onChange={(e) => {
                        setRespondentPosition(e.target.value)
                        setValidationErrors((prev) => {
                          const newErrors = new Map(prev)
                          newErrors.delete("position")
                          return newErrors
                        })
                      }}
                      placeholder="Software Engineer"
                      className={`mt-1 ${validationErrors.has("position") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                      disabled={survey.isAnonymous}
                    />
                    {validationErrors.get("position") && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validationErrors.get("position")}
                      </p>
                    )}
                  </div>

                  {/* Ships Input */}
                  <div>
                    <Label htmlFor="ships" className="text-sm font-medium text-slate-700">
                      Number of Ships
                    </Label>
                    <Input
                      id="ships"
                      type="number" // Use type="number" for better mobile input and validation
                      value={respondentShips}
                      onChange={(e) => {
                        setRespondentShips(e.target.value)
                        setValidationErrors((prev) => {
                          const newErrors = new Map(prev)
                          newErrors.delete("ships")
                          return newErrors
                        })
                      }}
                      placeholder="e.g., 5"
                      className={`mt-1 ${validationErrors.has("ships") ? "border-red-300 focus:border-red-300 focus:ring-red-200" : "focus:border-blue-500 focus:ring-blue-200"}`}
                      disabled={survey.isAnonymous}
                    />
                    {validationErrors.get("ships") && (
                      <p className="text-sm text-red-600 mt-2 flex items-center">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validationErrors.get("ships")}
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
                <AlertDescription>Could not load the survey questions.</AlertDescription>
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
              disabled={isShowingEmailStep && (!enablePagination || currentPageIndex === 0)}
              className="w-full sm:w-auto bg-white hover:bg-slate-50 border-slate-300 order-2 sm:order-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-xs sm:text-sm text-slate-500 bg-white px-2 sm:px-3 py-1 rounded-full border border-slate-200 order-1 sm:order-2 text-center">
              {isShowingEmailStep
                ? `Step ${currentStep} of ${totalSteps}: Contact Information`
                : `Step ${currentStep} of ${totalSteps}: Questions ${startIndex + 1}-${endIndex}`}
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
              ) : !enablePagination || (isLastQuestionPage && !isShowingEmailStep) ? (
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