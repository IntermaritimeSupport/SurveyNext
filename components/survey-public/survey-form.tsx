// --- START OF FILE survey-form.tsx ---

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QuestionRenderer } from "./question-renderer"
import { ProgressBar } from "./progress-bar"
import { ChevronLeft, ChevronRight, Send, CheckCircle, Loader2 } from "lucide-react"

// Importar los tipos de Prisma directamente y las interfaces públicas que definiste
import { QuestionType as PrismaQuestionType } from '@prisma/client';

// Re-usar las interfaces que definiste en SurveyPublicPage
interface PublicSurvey {
  id: string;
  title: string;
  description: string | null;
  isAnonymous: boolean;
  showProgress: boolean;
  allowMultipleResponses: boolean;
}

interface PublicQuestion {
  id: string;
  title: string;
  description: string | null;
  type: PrismaQuestionType;
  required: boolean;
  order: number;
  options: any | null;
  validation: any | null;
}

interface AnswerForApi {
  questionId: string;
  value: any;
}

interface SurveyFormProps {
  survey: PublicSurvey;
  questions: PublicQuestion[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const QUESTIONS_PER_PAGE = 10; // Define cuántas preguntas por "paso"


export function SurveyForm({ survey, questions: initialQuestions }: SurveyFormProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerForApi>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [respondentEmail, setRespondentEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  
  const isEmailRequired = !survey.isAnonymous;

  const [isShowingEmailStep, setIsShowingEmailStep] = useState(isEmailRequired);

  const sortedQuestions = initialQuestions.sort((a, b) => a.order - b.order)

  const totalQuestionPages = Math.ceil(sortedQuestions.length / QUESTIONS_PER_PAGE);
  const totalSteps = totalQuestionPages + (isEmailRequired ? 1 : 0);
  
  let currentStep = 0;
  if (isShowingEmailStep) {
    currentStep = 1;
  } else {
    currentStep = currentPageIndex + 1 + (isEmailRequired ? 1 : 0);
  }

  const startIndex = currentPageIndex * QUESTIONS_PER_PAGE;
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, sortedQuestions.length);
  const currentQuestionsBlock = sortedQuestions.slice(startIndex, endIndex);

  const isLastQuestionPage = currentPageIndex === totalQuestionPages - 1;


  const validateAnswer = (question: PublicQuestion, answer?: AnswerForApi): string | null => {
    if (question.type === PrismaQuestionType.FILE_UPLOAD && question.required) {
      if (!answer || answer.value === null || typeof answer.value !== 'object' || !answer.value.fileName) {
        return "Debe adjuntar un archivo";
      }
    } else if (question.required && (!answer || answer.value === null || answer.value === undefined || (typeof answer.value === 'string' && answer.value.trim() === '') || (Array.isArray(answer.value) && answer.value.length === 0))) {
      return "Esta pregunta es obligatoria"
    }

    if (!answer || answer.value === null || answer.value === undefined || (typeof answer.value === 'string' && answer.value.trim() === '')) return null

    const value = answer.value

    switch (question.type) {
      case PrismaQuestionType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof value === "string" && !emailRegex.test(value)) {
          return "Ingresa un email válido"
        }
        break

      case PrismaQuestionType.TEXT:
      case PrismaQuestionType.TEXTAREA:
        if (typeof value === "string") {
          if (question.validation?.minLength && value.length < question.validation.minLength) {
            return `Mínimo ${question.validation.minLength} caracteres`
          }
          if (question.validation?.maxLength && value.length > question.validation.maxLength) {
            return `Máximo ${question.validation.maxLength} caracteres`
          }
        }
        break

      case PrismaQuestionType.NUMBER:
        if (typeof value === "number") {
          if (question.validation?.min && value < question.validation.min) {
            return `El valor mínimo es ${question.validation.min}`
          }
          if (question.validation?.max && value > question.validation.max) {
            return `El valor máximo es ${question.validation.max}`
          }
        }
        break

      case PrismaQuestionType.CHECKBOXES:
        if (Array.isArray(value) && value.length === 0 && question.required) {
          return "Selecciona al menos una opción"
        }
        break

        
    }

    return null
  }

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { questionId, value },
    }))

    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }

  const validateEmailInput = (email: string): string | null => {
    if (isEmailRequired && !email.trim()) {
      return "El email es obligatorio";
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return "Ingresa un email válido";
      }
    }
    return null;
  };

  const handleNext = () => {
    setErrors({});

    if (isShowingEmailStep) {
      const emailError = validateEmailInput(respondentEmail);
      if (emailError) {
        setErrors({ email: emailError });
        return;
      }
      setIsShowingEmailStep(false);
      setCurrentPageIndex(0);
      return;
    }

    let hasBlockErrors = false;
    const newErrors: Record<string, string> = {};
    currentQuestionsBlock.forEach(q => {
        const error = validateAnswer(q, answers[q.id]);
        if (error) {
            newErrors[q.id] = error;
            hasBlockErrors = true;
        }
    });

    if (hasBlockErrors) {
        setErrors(newErrors);
        return;
    }

    if (isLastQuestionPage) {
       handleSubmit();
    } else {
      setCurrentPageIndex((prev) => prev + 1);
    }
  }

  const handlePrevious = () => {
    if (isShowingEmailStep) {
        return; // No hay "Anterior" si estamos en el primer paso (email)
    }

    if (currentPageIndex === 0 && isEmailRequired) {
        setIsShowingEmailStep(true);
        setErrors({});
        return;
    }
    
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    const emailError = validateEmailInput(respondentEmail);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    try {
      const answersForApi: AnswerForApi[] = Object.values(answers).map(answer => ({
        questionId: answer.questionId,
        value: answer.value
      }));

      const responseData = {
        surveyId: survey.id,
        email: isEmailRequired ? respondentEmail : null,
        answers: answersForApi,
        isComplete: true,
      };

      const apiResponse = await fetch(`${API_BASE_URL}/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responseData),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || 'Error desconocido al enviar la encuesta');
      }

      setIsCompleted(true);

    } catch (error: any) {
      console.error("Error submitting survey:", error);
      setErrors({ submit: error.message || "Error al enviar la encuesta. Inténtalo de nuevo." });
    } finally {
      setIsSubmitting(false);
    }
  };


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
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600">
                <strong>Encuesta:</strong> {survey.title}
                <br />
                <strong>Completada:</strong> {new Date().toLocaleString()}
                <br />
                <strong>Preguntas respondidas:</strong> {Object.keys(answers).length}
              </p>
            </div>
            <Button onClick={() => window.location.href = '/'} variant="outline" className="w-full bg-transparent">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="survey-card mb-6">
          <CardHeader className="survey-header text-center">
            <CardTitle className="text-2xl text-white">{survey.title}</CardTitle>
            {survey.description && <p className="text-blue-100 mt-2">{survey.description}</p>}
          </CardHeader>
        </Card>

        {survey.showProgress && (
          <div className="mb-6">
            <ProgressBar
              current={currentStep}
              total={totalSteps}
            />
          </div>
        )}

        <Card className="survey-card">
          <CardContent className="p-8">
            {/* --- RENDERIZADO CONDICIONAL: Email o Preguntas del Bloque --- */}
            {isShowingEmailStep ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Información de Contacto
                    {isEmailRequired && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Por favor, proporciona tu email para completar la encuesta.
                  </p>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => {
                      setRespondentEmail(e.target.value)
                      if (errors.email) {
                        setErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.email
                          return newErrors
                        })
                      }
                    }}
                    placeholder="tu@email.com"
                    className={errors.email ? "border-red-300" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>
            ) : (
              currentQuestionsBlock.length > 0 ? (
                // Iterar sobre las preguntas del bloque actual
                <div className="space-y-8">
                  {currentQuestionsBlock.map((question) => (
                    <QuestionRenderer
                      key={question.id}
                      question={question}
                      answer={answers[question.id]}
                      onAnswerChange={(value) => handleAnswerChange(question.id, value)}
                      error={errors[question.id]}
                    />
                  ))}
                </div>
              ) : (
                  <Alert variant="destructive">
                      <AlertDescription>No se pudieron cargar las preguntas de la encuesta.</AlertDescription>
                  </Alert>
              )
            )}
            {/* --- FIN RENDERIZADO CONDICIONAL --- */}

            {errors.submit && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isShowingEmailStep || (!isEmailRequired && currentPageIndex === 0)}
            className="bg-transparent"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="text-sm text-slate-500">
            {isShowingEmailStep ? (
              `Paso ${currentStep} de ${totalSteps}: Información de Contacto`
            ) : (
              `Paso ${currentStep} de ${totalSteps}: Preguntas ${startIndex + 1}-${endIndex}`
            )}
          </div>

          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (isLastQuestionPage && !isShowingEmailStep) ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}