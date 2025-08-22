// --- START OF FILE QuestionEditor.tsx ---
"use client"

import { useState } from "react"
import type { Question, QuestionOption } from "@/types/survey"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { QuestionType as PrismaQuestionType } from '@prisma/client'; 

interface QuestionEditorProps {
  question: Question
  onUpdate: (question: Question) => void
  onDelete: () => void // Ahora onDelete no recibe ID, ya está en question
  onCancel: () => void
}

export function QuestionEditor({ question, onUpdate, onDelete, onCancel }: QuestionEditorProps) {
  const [localQuestion, setLocalQuestion] = useState<Question>(question)

  const OPTION_TYPES = [
    PrismaQuestionType.DROPDOWN,
    PrismaQuestionType.CHECKBOXES,
    PrismaQuestionType.MULTIPLE_CHOICE,
  ] as const;

  const VALIDATION_TYPES = [
    PrismaQuestionType.TEXT,
    PrismaQuestionType.TEXTAREA,
    PrismaQuestionType.NUMBER,
    PrismaQuestionType.EMAIL,
    PrismaQuestionType.PHONE,
    PrismaQuestionType.URL,
    PrismaQuestionType.SCALE,
    PrismaQuestionType.DATE,
    PrismaQuestionType.TIME,
  ] as const;

  const needsOptions = OPTION_TYPES.includes(localQuestion.type as (typeof OPTION_TYPES[number]));
  const needsValidation = VALIDATION_TYPES.includes(localQuestion.type as (typeof VALIDATION_TYPES[number]));

  const handleSave = () => {
    onUpdate(localQuestion) 
  }

  const addOption = () => {
    const newOption: QuestionOption = {
      id: `option-${Date.now()}`,
      label: "",
      value: "",
      order: (localQuestion.options?.length || 0) + 1,
    }

    setLocalQuestion((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption],
    }))
  }

  const updateOption = (optionId: string, field: keyof QuestionOption, value: string | number) => {
    setLocalQuestion((prev) => ({
      ...prev,
      options: prev.options ? prev.options.map((opt) => (opt.id === optionId ? { ...opt, [field]: value } : opt)) : prev.options,
    }))
  }

  const removeOption = (optionId: string) => {
    setLocalQuestion((prev) => ({
      ...prev,
      options: prev.options ? prev.options.filter((opt) => opt.id !== optionId) : prev.options,
    }))
  }

  return (
    <Card className="survey-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Editar Pregunta</span>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
            <Button variant="destructive" onClick={onDelete}> {/* Este botón llama a onDelete */}
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Título de la Pregunta *</Label>
            <Input
              id="title"
              value={localQuestion.title}
              onChange={(e) => setLocalQuestion((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Escribe tu pregunta aquí..."
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={localQuestion.description || ""}
              onChange={(e) => setLocalQuestion((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Información adicional sobre la pregunta..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={localQuestion.required}
              onCheckedChange={(checked) => setLocalQuestion((prev) => ({ ...prev, required: checked }))}
            />
            <Label htmlFor="required">Pregunta obligatoria</Label>
          </div>
        </div>

        {/* Options for select/radio/checkbox questions */}
        {needsOptions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Opciones</Label>
              <Button onClick={addOption} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Opción
              </Button>
            </div>

            <div className="space-y-2">
              {localQuestion.options?.map((option, index) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={`Opción ${index + 1}`}
                    value={option.label}
                    onChange={(e) => {
                      updateOption(option.id, "label", e.target.value)
                      updateOption(option.id, "value", e.target.value)
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(option.id)}
                    disabled={(localQuestion.options?.length || 0) <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {(!localQuestion.options || localQuestion.options.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">Agrega al menos una opción para esta pregunta</p>
            )}
          </div>
        )}

        {/* Validation for text/number/date/time questions */}
        {needsValidation && (
          <div className="space-y-4">
            <Label>Validación</Label>
            <div className="grid grid-cols-2 gap-4">
              {(localQuestion.type === PrismaQuestionType.TEXT || localQuestion.type === PrismaQuestionType.TEXTAREA) && (
                <>
                  <div>
                    <Label htmlFor="minLength">Longitud mínima</Label>
                    <Input
                      id="minLength"
                      type="number"
                      value={localQuestion.validation?.minLength ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            minLength: e.target.value ? Number.parseInt(e.target.value) : undefined,
                          },
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxLength">Longitud máxima</Label>
                    <Input
                      id="maxLength"
                      type="number"
                      value={localQuestion.validation?.maxLength ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            maxLength: e.target.value ? Number.parseInt(e.target.value) : undefined,
                          },
                        }))
                      }
                      placeholder="1000"
                    />
                  </div>
                </>
              )}

              {localQuestion.type === PrismaQuestionType.NUMBER && (
                <>
                  <div>
                    <Label htmlFor="min">Valor mínimo</Label>
                    <Input
                      id="min"
                      type="number"
                      value={localQuestion.validation?.min ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            min: e.target.value ? Number.parseInt(e.target.value) : undefined,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max">Valor máximo</Label>
                    <Input
                      id="max"
                      type="number"
                      value={localQuestion.validation?.max ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            max: e.target.value ? Number.parseInt(e.target.value) : undefined,
                          },
                        }))
                      }
                    />
                  </div>
                </>
              )}
              {(localQuestion.type === PrismaQuestionType.DATE || localQuestion.type === PrismaQuestionType.TIME) && (
                <>
                  <div>
                    <Label htmlFor="minDate">Fecha/Hora mínima</Label>
                    <Input
                      id="minDate"
                      type={localQuestion.type === PrismaQuestionType.DATE ? "date" : "time"}
                      value={localQuestion.validation?.minDate ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            minDate: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDate">Fecha/Hora máxima</Label>
                    <Input
                      id="maxDate"
                      type={localQuestion.type === PrismaQuestionType.DATE ? "date" : "time"}
                      value={localQuestion.validation?.maxDate ?? ""}
                      onChange={(e) =>
                        setLocalQuestion((prev) => ({
                          ...prev,
                          validation: {
                            ...(prev.validation || {}),
                            maxDate: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Special settings for scale */}
        {localQuestion.type === PrismaQuestionType.SCALE && (
          <div className="space-y-4">
            <Label>Configuración de Escala</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scaleMin">Valor mínimo</Label>
                <Input
                  id="scaleMin"
                  type="number"
                  value={localQuestion.validation?.min ?? 1}
                  onChange={(e) =>
                    setLocalQuestion((prev) => ({
                      ...prev,
                      validation: {
                        ...(prev.validation || {}),
                        min: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="scaleMax">Valor máximo</Label>
                <Input
                  id="scaleMax"
                  type="number"
                  value={localQuestion.validation?.max ?? 10}
                  onChange={(e) =>
                    setLocalQuestion((prev) => ({
                      ...prev,
                      validation: {
                        ...(prev.validation || {}),
                        max: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}