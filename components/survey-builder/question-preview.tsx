// --- Suponiendo que `question-preview.tsx` contiene esto ---
"use client"

import React, { JSX } from "react"; // `React` y `JSX` están importados pero `React` no se usa explícitamente. `JSX` es un tipo.
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Importar los iconos Edit y Trash2
import { Edit, Trash, Trash2 } from "lucide-react";

// Importar los tipos desde tu archivo centralizado
import type { Question, QuestionOption } from "@/types/survey"
import { QuestionType as PrismaQuestionType } from '@prisma/client';

interface QuestionPreviewProps {
  question: Question;
  onEdit: () => void;
  onDelete: () => void; // Asegurarse de que onDelete se pasa
}

// Función auxiliar para renderizar el input de la pregunta en la vista previa
const renderQuestionInput = (question: Question): JSX.Element => {
  const value = "Valor de ejemplo"; // Para la vista previa estática

  // Asegurarse de que `question.options` se parsea si es un string
  let parsedOptions: QuestionOption[] | null = null;
  if (typeof question.options === 'string') {
    try {
      parsedOptions = JSON.parse(question.options) as QuestionOption[];
    } catch (e) {
      console.error("Error parsing question.options in QuestionPreview:", e, question.options);
      parsedOptions = null; // En caso de error de parseo, asumimos que no hay opciones válidas
    }
  } else {
    parsedOptions = question.options;
  }

  switch (question.type) {
    case PrismaQuestionType.TEXT:
      return <Input value={value} disabled />;
    case PrismaQuestionType.TEXTAREA:
      return <Textarea value={value} disabled />;
    case PrismaQuestionType.EMAIL:
      return <Input type="email" value="ejemplo@email.com" disabled />;
    case PrismaQuestionType.NUMBER:
      return <Input type="number" value={123} disabled />;
    case PrismaQuestionType.DATE:
      return <Input type="date" value="2023-01-01" disabled />;
    case PrismaQuestionType.TIME:
      return <Input type="time" value="12:00" disabled />;
    case PrismaQuestionType.PHONE:
      return <Input type="tel" value="+1234567890" disabled />;
    case PrismaQuestionType.URL:
      return <Input type="url" value="https://example.com" disabled />;

    case PrismaQuestionType.DROPDOWN:
      return (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una opción..." />
          </SelectTrigger>
          <SelectContent>
            {/* Usa `parsedOptions` y verifica si es un array */}
            {Array.isArray(parsedOptions) && parsedOptions.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case PrismaQuestionType.CHECKBOXES:
      return (
        <div className="space-y-2">
          {/* Usa `parsedOptions` y verifica si es un array */}
          {Array.isArray(parsedOptions) && parsedOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox checked={false} disabled />
              <Label>{option.label}</Label>
            </div>
          ))}
        </div>
      );

    case PrismaQuestionType.MULTIPLE_CHOICE:
      return (
        <RadioGroup disabled>
          {/* Usa `parsedOptions` y verifica si es un array */}
          {Array.isArray(parsedOptions) && parsedOptions.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} disabled />
              <Label>{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case PrismaQuestionType.SCALE:
      const min = question.validation?.min || 0;
      const max = question.validation?.max || 10;
      return (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: max - min + 1 }, (_, i) => (
            <Button key={i} variant="outline" size="sm" disabled>{min + i}</Button>
          ))}
        </div>
      );

    case PrismaQuestionType.FILE_UPLOAD:
      return <Input type="file" disabled />;
    case PrismaQuestionType.SIGNATURE:
      return <div className="p-4 border rounded text-slate-500">Área de firma (vista previa)</div>;
    case PrismaQuestionType.MATRIX:
      return <div className="p-4 border rounded text-slate-500">Pregunta de matriz (vista previa)</div>;

    default:
      return <div className="text-slate-500">Tipo de pregunta no soportado: {question.type}</div>;
  }
};

export function QuestionPreview({ question, onEdit, onDelete }: QuestionPreviewProps) {
  return (
    <Card className="question-preview-card">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-slate-800">
            {question.title} {question.required && <span className="text-red-500">*</span>}
          </h4>
          <p className="text-sm text-slate-600 mb-2">{question.description}</p>
          <div className="mt-2">
            {renderQuestionInput(question)}
          </div>
        </div>
        <div className="flex space-x-2 ml-4">
          <Button variant="outline" size="sm" onClick={onEdit} title="Editar Pregunta">
            <Edit className="h-4 w-4" />
          </Button>
          {/* --- AÑADIDO: BOTÓN DE ELIMINAR --- */}
          <Button variant="destructive" size="sm" onClick={onDelete} title="Eliminar Pregunta">
            <Trash className="h-4 w-4 text-black" />
          </Button>
          {/* --- FIN: BOTÓN DE ELIMINAR --- */}
        </div>
      </CardContent>
    </Card>
  );
}