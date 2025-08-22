// --- START OF FILE SurveyBuilder.tsx ---
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Question, QuestionOption, QuestionValidation } from "@/types/survey"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuestionTypeSelector } from "./question-type-selector"
import { QuestionEditor } from "./question-editor"
import { QuestionPreview } from "./question-preview"
import { Plus, Save, Eye, ArrowLeft } from "lucide-react"
import { LinkManager } from "./link-manager"
import { useAuth } from "@/contexts/auth-context"

import { SurveyStatus, QuestionType as PrismaQuestionType } from '@prisma/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Survey {
  id: string;
  title: string;
  description: string | null;
  customLink: string;
  status: SurveyStatus;
  isAnonymous: boolean;
  showProgress: boolean;
  allowMultipleResponses: boolean;
  startDate: Date | null;
  endDate: Date | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  questions: Question[];
}

interface SurveyBuilderProps {
  surveyId?: string
}

export function SurveyBuilder({ surveyId }: SurveyBuilderProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [survey, setSurvey] = useState<Survey>({
    id: surveyId || `temp-survey-${Date.now()}`,
    title: "",
    description: null,
    customLink: "",
    status: SurveyStatus.DRAFT,
    isAnonymous: false,
    showProgress: true,
    allowMultipleResponses: false,
    startDate: null,
    endDate: null,
    userId: user?.id || "",
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: [],
  })

  const [showQuestionTypeSelector, setShowQuestionTypeSelector] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const [loadingSurvey, setLoadingSurvey] = useState(true);
  const [savingSurvey, setSavingSurvey] = useState(false);

  useEffect(() => {
    const fetchSurvey = async () => {
      if (surveyId) {
        setLoadingSurvey(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`);
          if (response.ok) {
            const data: Survey = await response.json();
            setSurvey({
              ...data,
              startDate: data.startDate ? new Date(data.startDate) : null,
              endDate: data.endDate ? new Date(data.endDate) : null,
              questions: data.questions.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
                validation: typeof q.validation === 'string' ? JSON.parse(q.validation) : q.validation,
              }))
            });
          } else if (response.status === 404) {
            alert("Encuesta no encontrada.");
            router.push("/admin/surveys");
          } else {
            throw new Error(`Error al cargar la encuesta: ${response.statusText}`);
          }
        } catch (error) {
          console.error("Error fetching survey:", error);
          alert("Error al cargar la encuesta. Por favor, inténtalo de nuevo.");
          router.push("/admin/surveys");
        } finally {
          setLoadingSurvey(false);
        }
      } else {
        setSurvey(prev => ({ ...prev, userId: user?.id || "" }));
        setLoadingSurvey(false);
      }
    };

    if (!authLoading) {
      fetchSurvey();
    }
  }, [surveyId, authLoading, user?.id, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router, user?.role]);


  const generateCustomLink = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50)
  }

  const handleTitleChange = (title: string) => {
    setSurvey((prev) => ({
      ...prev,
      title,
      customLink: prev.customLink === "" || prev.id.startsWith("temp-survey-") ? generateCustomLink(title) : prev.customLink,
    }))
  }

  const addQuestion = (type: PrismaQuestionType) => {
    const needsOptionsTypes = [
      PrismaQuestionType.DROPDOWN,
      PrismaQuestionType.CHECKBOXES,
      PrismaQuestionType.MULTIPLE_CHOICE,
    ] as const;

    const needsValidationTypes = [
      PrismaQuestionType.TEXT,
      PrismaQuestionType.TEXTAREA,
      PrismaQuestionType.NUMBER,
      PrismaQuestionType.EMAIL,
      PrismaQuestionType.PHONE,
      PrismaQuestionType.URL,
      PrismaQuestionType.DATE,
      PrismaQuestionType.TIME,
    ] as const;

    const newQuestion: Question = {
      id: `question-${Date.now()}`,
      surveyId: survey.id,
      type,
      title: "",
      description: null,
      required: false,
      order: survey.questions.length + 1,
      options: (needsOptionsTypes as readonly PrismaQuestionType[]).includes(type)
        ? [
            {
              id: `option-${Date.now()}`,
              label: "Opción 1",
              value: "option-1",
              order: 1,
            },
          ]
        : null,

      validation:
        type === PrismaQuestionType.SCALE
          ? { min: 1, max: 10 }
          : (needsValidationTypes as readonly PrismaQuestionType[]).includes(type)
            ? {}
            : null,
    }

    setEditingQuestion(newQuestion)
    setShowQuestionTypeSelector(false)
  }

  const updateQuestion = (updatedQuestion: Question) => {
    setSurvey((prev) => {
      const existingIndex = prev.questions.findIndex((q) => q.id === updatedQuestion.id)
      if (existingIndex >= 0) {
        const newQuestions = [...prev.questions]
        newQuestions[existingIndex] = updatedQuestion
        return { ...prev, questions: newQuestions }
      } else {
        return { ...prev, questions: [...prev.questions, updatedQuestion].sort((a,b) => a.order - b.order) }
      }
    })
    setEditingQuestion(null)
    saveSurvey(); // Llama a saveSurvey después de actualizar una pregunta
  }

  const deleteQuestion = (questionId: string) => {
    const confirmDelete = window.confirm("¿Estás seguro de que quieres eliminar esta pregunta? Esta acción no se puede deshacer.");
    if (!confirmDelete) {
        return;
    }

    setSurvey((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }))
    setEditingQuestion(null) 
    saveSurvey(); // Llama a saveSurvey después de eliminar una pregunta
  }

  const saveSurvey = async () => {
    if (!user?.id) {
      alert("No se pudo obtener el ID del usuario. Por favor, inicia sesión de nuevo.");
      router.push('/auth/login');
      return;
    }

    if (!survey.title.trim()) {
      alert("El título de la encuesta es obligatorio");
      return;
    }

    if (!survey.customLink.trim()) {
      alert("El enlace personalizado es obligatorio");
      return;
    }

    setSavingSurvey(true);

    const dataToSend = {
      ...survey,
      startDate: survey.startDate ? survey.startDate.toISOString() : null,
      endDate: survey.endDate ? survey.endDate.toISOString() : null,
      userId: user.id,
      questions: survey.questions.map(q => ({
        ...q,
        // Convertir options y validation a string JSON para el backend
        options: q.options ? JSON.stringify(q.options) : null,
        validation: q.validation ? JSON.stringify(q.validation) : null,
        createdAt: undefined, 
        updatedAt: undefined,
      })),
      createdAt: undefined,
      updatedAt: undefined,
    };

console.log('DEBUG (Frontend saveSurvey): Data being sent to API:', JSON.stringify(dataToSend, null, 2)); // Descomenta solo para depuración pesada

    try {
      let response;
      if (surveyId) {
        response = await fetch(`${API_BASE_URL}/api/surveys/${surveyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/surveys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('ERROR (Frontend saveSurvey): API returned error:', errorData); // Loguea el error completo
        throw new Error(errorData.message || `Error al ${surveyId ? 'actualizar' : 'crear'} la encuesta`);
      }

      const savedSurveyResult = await response.json();
      console.log('DEBUG (Frontend saveSurvey): API response after PUT/POST:', JSON.stringify(savedSurveyResult, null, 2)); // Loguea la respuesta completa

      alert(`Encuesta ${surveyId ? 'actualizada' : 'creada'} con éxito!`);
      
      // ... (resto de la lógica de actualización de estado y redirección)
      setSurvey(prev => {
          const updatedQuestions = prev.questions.map(q => {
              const serverQ = savedSurveyResult.questions.find((sq: any) => 
                  (q.id && !q.id.startsWith('question-') && sq.id === q.id) || 
                  (q.id.startsWith('question-') && sq.title === q.title && sq.order === q.order)
              );

              if (serverQ) {
                  return { 
                      ...serverQ, 
                      options: typeof serverQ.options === 'string' ? JSON.parse(serverQ.options) : serverQ.options,
                      validation: typeof serverQ.validation === 'string' ? JSON.parse(serverQ.validation) : serverQ.validation,
                  };
              }
              return q;
          }).filter((q: any) => { 
              return savedSurveyResult.questions.some((sq: any) => sq.id === q.id);
          });

          return {
              ...prev,
              ...savedSurveyResult,
              startDate: savedSurveyResult.startDate ? new Date(savedSurveyResult.startDate) : null,
              endDate: savedSurveyResult.endDate ? new Date(savedSurveyResult.endDate) : null,
              questions: updatedQuestions.sort((a,b) => a.order - b.order)
          };
      });

      if (!surveyId && savedSurveyResult && savedSurveyResult.id) {
        router.push(`/admin/surveys/${savedSurveyResult.id}`);
      } else if (!surveyId) { 
        router.push("/admin/surveys");
      }

    } catch (error: any) {
      console.error("Error saving survey:", error);
      alert(`Error al guardar la encuesta: ${error.message}`);
    } finally {
      setSavingSurvey(false);
    }
  } // <-- Add this closing brace for saveSurvey

  const previewSurvey = () => {
    if (survey.customLink && survey.status === SurveyStatus.PUBLISHED) {
      window.open(`/survey/${survey.customLink}`, "_blank")
    } else {
      alert("La encuesta debe estar publicada para ver la vista previa en vivo.");
    }
  }

  if (authLoading || loadingSurvey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{surveyId ? "Editar Encuesta" : "Crear Encuesta"}</h1>
            <p className="text-slate-600">Diseña tu encuesta personalizada</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={previewSurvey} disabled={!survey.customLink || survey.status !== SurveyStatus.PUBLISHED}>
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </Button>
          <Button onClick={saveSurvey} disabled={savingSurvey || !user?.id}>
            {savingSurvey ? "Guardando..." : "Guardar Encuesta"}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Información Básica</TabsTrigger>
          <TabsTrigger value="questions">Preguntas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card className="survey-card">
            <CardHeader>
              <CardTitle>Información de la Encuesta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título de la Encuesta *</Label>
                <Input
                  id="title"
                  value={survey.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ej: Encuesta de Satisfacción del Cliente"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={survey.description || ""}
                  onChange={(e) => setSurvey((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el propósito de tu encuesta..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={survey.status === SurveyStatus.PUBLISHED}
                  onCheckedChange={(checked) => setSurvey((prev) => ({ ...prev, status: checked ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT }))}
                />
                <Label htmlFor="status">Estado: {survey.status === SurveyStatus.PUBLISHED ? "Publicada" : "Borrador"}</Label>
              </div>
            </CardContent>
          </Card>

          <LinkManager
            currentLink={survey.customLink}
            surveyId={survey.id}
            onLinkChange={(link) => setSurvey((prev) => ({ ...prev, customLink: link }))}
          />
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          {/* Question Editor */}
          {editingQuestion && (
            <QuestionEditor
              question={editingQuestion}
              onUpdate={updateQuestion}
              onDelete={() => deleteQuestion(editingQuestion.id)}
              onCancel={() => setEditingQuestion(null)}
            />
          )}

          {/* Question Type Selector */}
          {showQuestionTypeSelector && (
            <Card className="survey-card">
              <CardContent className="pt-6">
                <QuestionTypeSelector onSelect={addQuestion} onCancel={() => setShowQuestionTypeSelector(false)} />
              </CardContent>
            </Card>
          )}

          {/* Questions List */}
          <Card className="survey-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Preguntas ({survey.questions.length})</CardTitle>
              <Button
                onClick={() => setShowQuestionTypeSelector(true)}
                disabled={showQuestionTypeSelector || !!editingQuestion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Pregunta
              </Button>
            </CardHeader>
            <CardContent>
              {survey.questions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">No hay preguntas en esta encuesta</p>
                  <Button
                    onClick={() => setShowQuestionTypeSelector(true)}
                    disabled={showQuestionTypeSelector || !!editingQuestion}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primera Pregunta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {survey.questions
                    .sort((a, b) => a.order - b.order)
                    .map((question) => (
                      <QuestionPreview
                        key={question.id}
                        question={question}
                        onEdit={() => setEditingQuestion(question)}
                        onDelete={() => deleteQuestion(question.id)} // Pasa el ID de la pregunta a deleteQuestion
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="survey-card">
            <CardHeader>
              <CardTitle>Configuración de la Encuesta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isAnonymous"
                  checked={survey.isAnonymous}
                  onCheckedChange={(checked) =>
                    setSurvey((prev) => ({
                      ...prev,
                      isAnonymous: checked,
                    }))
                  }
                />
                <Label htmlFor="isAnonymous">Permitir respuestas anónimas</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showProgress"
                  checked={survey.showProgress}
                  onCheckedChange={(checked) =>
                    setSurvey((prev) => ({
                      ...prev,
                      showProgress: checked,
                    }))
                  }
                />
                <Label htmlFor="showProgress">Mostrar barra de progreso</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allowMultipleResponses"
                  checked={survey.allowMultipleResponses}
                  onCheckedChange={(checked) =>
                    setSurvey((prev) => ({
                      ...prev,
                      allowMultipleResponses: checked,
                    }))
                  }
                />
                <Label htmlFor="allowMultipleResponses">Permitir múltiples respuestas por usuario</Label>
              </div>

              {/* Campos de fecha de inicio/fin */}
              <div>
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={survey.startDate ? survey.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setSurvey(prev => ({ ...prev, startDate: e.target.value ? new Date(e.target.value) : null }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={survey.endDate ? survey.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setSurvey(prev => ({ ...prev, endDate: e.target.value ? new Date(e.target.value) : null }))}
                />
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}